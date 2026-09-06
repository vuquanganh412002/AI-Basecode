import { Injectable } from '@nestjs/common';

import { ValidationException } from '@/common/exceptions/common.exceptions';
import {
  DOKUSYA_BUSU_MIN_MESSAGE,
  DOKUSYA_KAISHI_DATE_FUTURE_MESSAGE,
  DOKUSYA_CHUSHI_DATE_CURRENT_MONTH_MESSAGE,
} from '@/common/constants/dokusya-validation-message.constant';
import {
  assertBranchScopeViolation,
  assertShitenScopeViolation,
} from '@/common/utils/data-scope';
import { normalizeForCache } from '@/common/utils/m-code-validation';
import type { SessionPayload } from '@/modules/auth/session.service';

import { DokusyaShubetsu } from '@/common/enums';
import { HANBAITEN_DUMMY_CODE, HANBAITEN_DUMMY_NOT_ALLOWED_FOR_PAPER_MESSAGE } from '@/common/constants/hanbaiten-dummy.constant';
import { ErrorMessage } from '@/common/constants/error-codes.constant';
import {
  DOKUSYASO_BUNRUI_INVALID_MSG,
  NOGYOSYA_BUNRUI_INVALID_MSG,
  isValidDokusyaSoBunruiCsv,
  isValidNogyosyaBunruiCsv,
} from '@/common/constants/dokusya-bunrui.constant';
import {
  normalizeDbDate,
  dbDateOrNull,
  todayIsoJst,
  nextMonthFirstIsoJst,
} from '@/common/utils/datetime';
import { ImportDokusyaDto, ImportDokusyaRowDto } from './dto/import-dokusya.dto';
import {
  collectTekiyoDateViolations,
  collectChushiViolations,
  tekiyoViolationField,
} from './dokusya-tekiyo-date.rules';
import {
  isDigitalOrBoth,
  isBoth,
  isDigitalCreditCard,
  collectDigitalBusuViolation,
  collectDigitalTodayModeViolation,
  collectDigitalNewKaishiDateViolation,
  collectTodayModeReportViolations,
  collectReservedSameDateViolation,
  computeChangedReportFields,
  resolveEffectiveHaitatsuSameFlg,
  SHUBETSU_MSG,
} from './dokusya-shubetsu.rules';

/**
 * 行バリデーション共用の事前ロード lookup。importExcel の行ループ前に一度だけ
 * 構築し、各行チェックを per-row クエリでなく O(1) のメモリ参照にする。
 */
interface ImportRowLookups {
  existingById: Map<number, Record<string, unknown>>;
  existingByKumiaiin: Map<string, Record<string, unknown>>;
  /** kumiaiin_code → 既存件数（2 以上なら kumiaiin キーでの更新/解約は曖昧）。 */
  kumiaiinCounts: Map<string, number>;
  tankaCodeSet: Set<string>;
  /**
   * 失効(active_flg=false)単価コードの集合（`tankaCodeSet`の部分集合。バグ報告
   * 2026-08）。単価は失効後も参照整合性のため存在し続ける（過去購読者の履歴・
   * 帳票が単価名を引ける必要がある）ので `tankaCodeSet`（存在チェック）からは
   * 除外しない。新規取込・取込UPDATEでの選択（新規登録・単価変更）だけを
   * `IMPORT_VALIDATION_ERROR` で弾くための専用集合。
   */
  tankaExpiredCodeSet: Set<string>;
  hanbaitenCodeSet: Set<string>;
  /** 販売店コード → hanbaiten_id（取込時の販売店変更検知に使う）。 */
  hanbaitenIdByCode: Map<string, number>;
  /**
   * 廃店(haiten_flg=true)販売店コードの集合（`hanbaitenCodeSet`の部分集合。
   * バグ報告2026-08）。廃店後も過去購読者の履歴参照のため存在し続けるので
   * `hanbaitenCodeSet`からは除外しない。取込での新規選択だけを弾く専用集合
   * （tankaExpiredCodeSetと同じ設計）。
   */
  hanbaitenClosedCodeSet: Set<string>;
  kanriShitenCodeSet: Set<string>;
  shitenCodeSet: Set<string>;
  /**
   * 管理支店コード → その管理支店自体の取扱いフラグ（m_kanri_shiten.paper_flg /
   * denshi_flg）。行の 購読種別 をその管理支店が実際に取り扱っているかの
   * ゲート用（不具合修正2026-08）。アカウントの取扱いフラグ(m_account)とは別物。
   */
  kanriShitenFlagsByCode: Map<string, { paperFlg: boolean; denshiFlg: boolean }>;
  /** 支店コード → 所属する管理支店コード（m_shiten.kanri_shiten_id を経由。未設定は null）。 */
  shitenKanriShitenCodeByCode: Map<string, string | null>;
  /**
   * ログイン中アカウントが管理支店に固定されている場合の自管理支店コード
   * （session.kanri_shiten_id を m_kanri_shiten から解決）。未固定（CHUOKAI/
   * JA_HONTEN/NICHINO_*）は null。
   */
  ownKanriShitenCode: string | null;
  /** 同様に session.shiten_id を解決した自支店コード。未固定は null。 */
  ownShitenCode: string | null;
  /**
   * 既存の電子版(2)・併読(3) レコードの email → dokusya_id 群（JA 全件）。
   * 取込時のメール重複チェック用。紙版(1) は含めない（重複可）。
   */
  existingDigitalEmailToIds: Map<string, Set<number>>;
  /**
   * 予約変更（未来日）の同一適用日1回まで制限（顧客要件2026-08）の判定用。
   * UPDATE モードかつ紙版かつ joho が未来日のときだけ埋まる — その joho に
   * 既にアクティブ（非取消・非新規）な履歴行を持つ dokusya_id の集合。
   */
  sameDateActiveDokusyaIds: Set<number>;
  /**
   * m_code 参照列の許容値判定（バックエンドレビュー finding #9）。本サービスは
   * 依存ゼロの leaf サービスのため CodeService を直接 inject せず、呼び出し側
   * （DokusyaImportService）が `codeService.has(category, value)` をそのまま
   * 束縛した関数を渡す — 他 *CodeSet と違い都度クエリなしの純粋関数呼び出し。
   */
  hasCode: (category: string, value: number | string) => boolean;
}

/** unknown → string。DB 生値は常にスカラだが、Object の既定文字列化を型で防ぐ。 */
function str(v: unknown): string {
  return v == null ? '' : String(v as string | number);
}

/** 行エラー蓄積用エントリ。 */
type ImportRowError = { row: number; field: string; message: string };

/** 電子版・併読で email 未入力時のメッセージ（共通ルール由来）。 */
const EMAIL_REQUIRED_DIGITAL_MSG = SHUBETSU_MSG.EMAIL_REQUIRED_DIGITAL;

/** 電子版・併読で 読者属性 未選択時のメッセージ（共通ルール由来）。 */
const DOKUSYASO_BUNRUI_REQUIRED_DIGITAL_MSG =
  SHUBETSU_MSG.DOKUSYASO_BUNRUI_REQUIRED_DIGITAL;

/** 電子版で請求開始月が未設定＝停止不可（ACSMS-SCR-014 の購読中止と同一文言）。 */
const SEIKYU_NOT_STARTED_MSG = SHUBETSU_MSG.SEIKYU_NOT_STARTED;

/**
 * 1フィールドの errors[] を持つ VALIDATION_ERROR を投げる。ValidationPipe の例外と
 * 同形なので FE useApiForm が DTO 失敗と同様に <a-form-item :help> へマップする。
 * DokusyaService と同一実装（取込と UI で文言・形を揃えるため複製）。
 */
function fieldValidationError(
  field: string,
  message: string,
): ValidationException {
  return new ValidationException([{ field, message }]);
}

/**
 * ACSMS-SCR-016 — NEW モードが selected_columns に必須とする物理列（api.md §4.1）。
 * 購読種別は画面ラジオ（紙版/電子版）の取込モードへ移動したため Excel 必須列から
 * 除外（顧客要件 2026-07）。
 *
 * `shiten_code`（支店）は **必須ではない** — api.md §4.1 で「NEW モードは必須」と
 * 明記されているのは kanri_shiten_code 側だけで、`t_dokusya.shiten_id` も NULL 許容。
 * ACSMS-SCR-011 の画面登録でも任意項目なので、取込だけ必須にすると同じ購読者を画面から
 * 登録できて Excel からは登録できない不整合になる。
 *
 * 逆に `dokusya_busu` / `shiharai_hoho` は api.md に必須の記載が無いが NOT NULL
 * 列（DEFAULT 無し）なので、空欄のまま INSERT に到達すると制約違反→500 になる。
 * IMPORT_VALIDATION_ERROR として穏当に返すためここに残す。
 */
const IMPORT_NEW_REQUIRED_COLUMNS: readonly string[] = [
  'kanri_shiten_code',
  // 購読者氏名・氏名かな4項目 — UI(SCR-011 DokusyaFormView)と同じく常時必須
  // （不具合修正2026-08）。FE 側 REQUIRED_COLUMNS_NEW（dokusya-import.ts）は
  // 既にこの4項目を含み「BE の IMPORT_NEW_REQUIRED_COLUMNS と対で保つこと」と
  // 明記していたが、BE 側だけこの4項目が抜けていた（列選択は強制チェック済み
  // でも空欄セルでの取込は素通りしていた）。
  'shimei_sei',
  'shimei_mei',
  'shimei_kana_sei',
  'shimei_kana_mei',
  'dokusya_busu',
  'tanka_code',
  'yubin_no',
  'todofuken_code',
  'shikuchoson',
  'chome_banchi',
  'renrakusaki_1',
  'hanbaiten_code',
  'shiharai_hoho',
  'dokusya_kaishi_date',
] as const;

/**
 * ACSMS-SCR-016 — NEW 必須列の日本語ラベル。選択済み必須列が空欄のとき per-row
 * 「{label}は必須です。」メッセージを組み立てる。上の列選択チェックは列が対象かを
 * 見るだけで、空欄の必須 FK/項目が INSERT まで漏れて NOT NULL/FK 制約→500 になるのを
 * 防ぎ IMPORT_VALIDATION_ERROR として穏当に返す。
 */
const NEW_REQUIRED_LABELS: Readonly<Record<string, string>> = {
  kanri_shiten_code: '管理支店',
  shimei_sei: '購読者氏名_氏',
  shimei_mei: '購読者氏名_名',
  shimei_kana_sei: '購読者かな_氏',
  shimei_kana_mei: '購読者かな_名',
  dokusya_busu: '購読部数',
  tanka_code: '新聞単価',
  yubin_no: '郵便番号',
  todofuken_code: '都道府県',
  shikuchoson: '市町村郡',
  chome_banchi: '丁目番地',
  renrakusaki_1: 'TEL1',
  hanbaiten_code: '販売店コード',
  shiharai_hoho: '支払方法',
  dokusya_kaishi_date: '購読開始日',
};

/**
 * 配達先氏名4項目 — 常時必須ではなく、UI(DokusyaFormView.vue の
 * `haitatsuRequired = !haitatsu_same_flg && !isDigitalOnly`)と同じ条件
 * （紙版/併読 かつ 配達先≠購読者情報）のときだけ必須にする（不具合修正
 * 2026-08）。判定は {@link resolveEffectiveHaitatsuSameFlg} で書込み層と揃える。
 */
const HAITATSU_NAME_REQUIRED_COLUMNS: readonly string[] = [
  'haitatsu_shimei_sei',
  'haitatsu_shimei_mei',
  'haitatsu_shimei_kana_sei',
  'haitatsu_shimei_kana_mei',
] as const;

const HAITATSU_NAME_LABELS: Readonly<Record<string, string>> = {
  haitatsu_shimei_sei: '配達先苗字（漢字）',
  haitatsu_shimei_mei: '配達先名前（漢字）',
  haitatsu_shimei_kana_sei: '配達先苗字（かな）',
  haitatsu_shimei_kana_mei: '配達先名前（かな）',
};

/** ACSMS-SCR-016 — クライアントへ返す行エラー上限（api.md §4.1）。 */
const IMPORT_ERROR_CAP = 10;

/**
 * 電子版の一括中止の行数上限（暫定・顧客合意 2026-08）。将来ジョブ化したら撤廃する。
 * FE 側にも同じ値がある（`utils/dokusya-import` 経由の画面チェック）が、UI の抑止は
 * 境界ではないのでここが実際のガード。
 */
const MAX_DIGITAL_BULK_STOP_ROWS = 500;

/** 'YYYY-MM-DD' → その月の月末日 'YYYY-MM-DD'（翌月0日で月跨ぎを自前計算しない）。 */
function lastDayOfMonthIso(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const end = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${iso.slice(0, 7)}-${String(end).padStart(2, '0')}`;
}

/**
 * 帳票影響項目（`REPORT_FIELD_PAIRS`）のキーのうち、単票 dto と取込の列名が
 * 食い違うもの: 単票は販売店を id で受けるが、Excel は **コード** で受ける。
 *
 * `computeChangedReportFields` は単票 dto のキーで結果を返すので、取込側では
 * この表で列名へ戻してから `selected_columns` と突き合わせ、エラーの field にも使う
 * （利用者に見せるのは Excel の列名でなければ意味が通らない）。
 */
const REPORT_FIELD_IMPORT_ALIAS: Readonly<Record<string, string>> = {
  hanbaiten_id: 'hanbaiten_code',
};

/**
 * SCR-016 — 購読者Excelデータ取込の純粋バリデーションを担うサービス。
 *
 * DokusyaImportService から「行バリデーション + 分類」concern を切り出したもの。
 * 注入依存を持たない leaf サービス（全メソッドが引数 rows / dto / 事前解決済み
 * lookups のみで完結）。importExcel は assertNewModeRequiredColumns /
 * validateImportRows の2メソッドを呼び、残り9メソッドはクラスタ内で相互呼び出し。
 */
@Injectable()
export class DokusyaImportValidator {
  /**
   * §4.1 — NEW モードは必須13列を selected_columns に含むこと。欠けていれば
   * VALIDATION_ERROR（`.code` を own property で公開しサービス単体テストが
   * `err.code` を直接参照できるようにする）。
   *
   * 電子版（顧客要件 2026-08）: `dokusya_busu`/`hanbaiten_code` は取込側で
   * 1 / ダミー販売店へ強制固定するため（importExcel の前処理ループ参照）、
   * Excel 側にマッピングされていなくても必須列から外す。
   */
  public assertNewModeRequiredColumns(dto: ImportDokusyaDto): void {
    if (dto.import_mode !== 'NEW') return;
    const requiredColumns =
      dto.dokusya_shubetsu === DokusyaShubetsu.DIGITAL
        ? IMPORT_NEW_REQUIRED_COLUMNS.filter(
            (c) => c !== 'dokusya_busu' && c !== 'hanbaiten_code',
          )
        : IMPORT_NEW_REQUIRED_COLUMNS;
    const missing = requiredColumns.filter(
      (c) => !dto.selected_columns.includes(c),
    );
    if (missing.length === 0) return;
    const exc = fieldValidationError(
      'selected_columns',
      `新規登録モードでは必須列（${missing.join(', ')}）を含めてください。`,
    );
    Object.defineProperty(exc, 'code', {
      value: 'VALIDATION_ERROR',
      enumerable: true,
    });
    throw exc;
  }

  /**
   * 電子版取込は dokusya_busu=1 / hanbaiten_code=ダミー販売店(9999999999) を
   * 全行へ強制する（顧客要件 2026-08。importExcel の前処理ループ参照）。当該 JA に
   * ダミー販売店が未整備だと、全行が同一理由で「指定された販売店コードが
   * 見つかりません」と個別に弾かれ紛らわしいため、行ループへ入る前に一括で
   * 分かりやすい理由のエラーを返す（`assertNewModeRequiredColumns` と同様の
   * payload 単位チェック）。
   */
  public assertDigitalDummyHanbaitenAvailable(
    dto: ImportDokusyaDto,
    hanbaitenIdByCode: Map<string, number>,
  ): void {
    if (dto.dokusya_shubetsu !== DokusyaShubetsu.DIGITAL) return;
    if (hanbaitenIdByCode.has(HANBAITEN_DUMMY_CODE)) return;
    const exc = fieldValidationError(
      'hanbaiten_code',
      `電子版の取込にはダミー販売店（販売店コード:${HANBAITEN_DUMMY_CODE}）の事前登録が必要です。販売店マスタで作成してから再度お試しください。`,
    );
    Object.defineProperty(exc, 'code', {
      value: 'VALIDATION_ERROR',
      enumerable: true,
    });
    throw exc;
  }

  /**
   * payload 直下の 読者情報変更適用日 / 購読中止日 を検証する（顧客要件 2026-08）。
   * 行ではなくファイル単位の指定なので、行ループではなくここで1回だけ見る。
   *
   *   - 両方指定 … 同じ操作が「更新」なのか「一括中止」なのか決まらない → 400。
   *     FE も相互排他で入力させるが、UI の抑止は境界ではないので BE でも弾く。
   *   - NEW で日付指定 … 新規登録に変更適用日・中止日の概念が無い → 400。
   *   - UPDATE で両方未指定 … 何を適用するのか決まらない → 400。ただし電子版は
   *     適用日が当日固定（画面も disable）なので省略を許し、BE が当日を補う。
   */
  public assertPayloadDates(dto: ImportDokusyaDto): void {
    const joho = String(dto.joho_henko_tekiyo_date ?? '').trim();
    const chushi = String(dto.dokusya_chushi_date ?? '').trim();

    if (joho && chushi) {
      throw this.payloadDateError(
        'dokusya_chushi_date',
        '読者情報変更適用日と購読中止日は同時に指定できません。',
      );
    }

    if (dto.import_mode === 'NEW') {
      this.assertNewModeDates(joho, chushi);
      return;
    }
    this.assertUpdateModeDates(dto, joho, chushi);
  }

  /** NEW — 新規登録に「変更適用日」「中止日」の概念は無い。 */
  private assertNewModeDates(joho: string, chushi: string): void {
    if (joho) {
      throw this.payloadDateError(
        'joho_henko_tekiyo_date',
        '新規登録では読者情報変更適用日を指定できません。',
      );
    }
    if (chushi) {
      throw this.payloadDateError(
        'dokusya_chushi_date',
        '新規登録では購読中止日を指定できません。',
      );
    }
  }

  /** UPDATE — 電子版は適用日が当日固定（画面も disable）なので省略を許す。 */
  private assertUpdateModeDates(
    dto: ImportDokusyaDto,
    joho: string,
    chushi: string,
  ): void {
    const digital = isDigitalOrBoth(dto.dokusya_shubetsu);

    if (!joho && !chushi && !digital) {
      throw this.payloadDateError(
        'joho_henko_tekiyo_date',
        '読者情報変更適用日を入力してください。',
      );
    }
    if (chushi && digital) {
      this.assertDigitalBulkStop(dto, chushi);
    }
  }

  /** 電子版の一括中止だけに掛かる制約（行数上限・月末・当月以降）。 */
  private assertDigitalBulkStop(dto: ImportDokusyaDto, chushi: string): void {
    // 1行 = 電子版APIへの1往復なので、同期処理のままでは大きいファイルが
    // ALB/CloudFront のタイムアウトにかかる。紙版は外部連携が無く従来と同じ
    // コストなので通常の上限（5000）のまま。DTO の @ArrayMaxSize は種別を
    // 跨いだ形式契約なので、種別依存の上限はここに置く。
    if (dto.rows.length > MAX_DIGITAL_BULK_STOP_ROWS) {
      throw this.payloadDateError(
        'dokusya_chushi_date',
        `電子版の一括中止は${MAX_DIGITAL_BULK_STOP_ROWS}件までです。ファイルを分割してください。`,
      );
    }
    // 電子版の解約は**月末で終了**する（SCR-014 の購読中止と同じ）。画面は終了月を
    // 選ばせて月末へ丸めるが、UI の丸めは境界ではないのでここでも検証する。
    if (chushi !== lastDayOfMonthIso(chushi)) {
      throw this.payloadDateError(
        'dokusya_chushi_date',
        '電子版の購読中止日は月末日を指定してください。',
      );
    }
    // 当月以降（過ぎた月では止められない）。日単位の未来判定は紙版のルールで、
    // 電子版は月単位で見る — 当月末は「まだ来ていない」ので許す。
    if (chushi.slice(0, 7) < todayIsoJst().slice(0, 7)) {
      throw this.payloadDateError(
        'dokusya_chushi_date',
        DOKUSYA_CHUSHI_DATE_CURRENT_MONTH_MESSAGE,
      );
    }
  }

  /** payload 日付エラー — `.code` を own property で公開（サービス単体テスト互換）。 */
  private payloadDateError(field: string, message: string): ValidationException {
    const exc = fieldValidationError(field, message);
    Object.defineProperty(exc, 'code', {
      value: 'VALIDATION_ERROR',
      enumerable: true,
    });
    return exc;
  }

  /**
   * 全行のバリデーション + 分類（created/updated 件数を集計）。DataScope 違反は
   * 即時 throw（403）、内容エラーは errors[] に蓄積（呼び出し側で 10 件に丸め）。
   */
  public validateImportRows(
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    session: SessionPayload,
    errors: ImportRowError[],
  ): { createdCount: number; updatedCount: number } {
    let createdCount = 0;
    let updatedCount = 0;
    // 取込バッチ内の電子版/併読 email 重複検知用（email → 自己同定ID）。
    const batchDigitalEmail = new Map<string, number>();

    dto.rows.forEach((row, index) => {
      const rowNo = index + 1;
      this.validateImportRowRequired(row, rowNo, dto, errors);
      this.validateImportRowRules(row, rowNo, dto, errors);
      this.validateImportRowShubetsuMatch(row, rowNo, dto, lookups, errors);
      this.validateImportRowTekiyoDates(row, rowNo, dto, lookups, errors);
      this.validateImportRowRefs(row, rowNo, dto, lookups, errors);
      this.validateImportRowKanriShitenScope(row, rowNo, dto, lookups, session, errors);
      this.validateImportRowEmail(
        row,
        rowNo,
        dto,
        lookups,
        batchDigitalEmail,
        errors,
      );
      this.validateImportRowDokusyaSoBunrui(row, rowNo, dto, lookups, errors);
      this.validateImportRowBunruiCodes(row, rowNo, errors);
      this.validateImportRowCodeMaster(row, rowNo, lookups, errors);
      const category = this.classifyImportRow(
        row,
        rowNo,
        dto,
        lookups,
        session,
        errors,
      );
      if (category === 'created') createdCount += 1;
      else if (category === 'updated') updatedCount += 1;
    });

    return { createdCount, updatedCount };
  }

  /**
   * §4.1/§4.3 — NEW モードの必須列 + kumiaiin 重複チェック。列選択ガードは列が
   * 対象かのみ見るため、空欄の必須 FK/項目は per-row FK チェックを抜け INSERT を
   * NOT NULL/FK で 500 にする — ここで穏当に弾く。
   */
  private validateImportRowRequired(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    errors: ImportRowError[],
  ): void {
    if (dto.import_mode === 'NEW') {
      const rec = row as unknown as Record<string, unknown>;
      for (const field of IMPORT_NEW_REQUIRED_COLUMNS) {
        const v = rec[field];
        if (v === undefined || v === null || v === '') {
          this.pushImportError(errors, {
            row: rowNo,
            field,
            message: `新規登録の場合、${NEW_REQUIRED_LABELS[field] ?? field}は必須です。`,
          });
        }
      }
      // 組合員コードは JA 内で重複を許容する（同一コードの世帯員など）。
      // DB にも UNIQUE 制約は無いため、NEW 取込みで重複チェックは行わない。
      this.validateImportRowHaitatsuNameRequired(rec, rowNo, dto, errors);
    }
  }

  /**
   * 配達先氏名4項目 — UI(DokusyaFormView.vue の `haitatsuRequired`)と同じ条件
   * （紙版/併読 かつ 配達先≠購読者情報）でのみ必須にする（不具合修正2026-08）。
   * NEW は配達先7列を全列書込みのため `resolveEffectiveHaitatsuSameFlg` に
   * selectedColumns を渡さない（`applyImportRow` の NEW 分岐と同じ呼び分け）。
   */
  private validateImportRowHaitatsuNameRequired(
    rec: Record<string, unknown>,
    rowNo: number,
    dto: ImportDokusyaDto,
    errors: ImportRowError[],
  ): void {
    if (Number(dto.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL) return;
    if (resolveEffectiveHaitatsuSameFlg(rec as { haitatsu_same_flg?: boolean } & Record<string, unknown>)) return;
    for (const field of HAITATSU_NAME_REQUIRED_COLUMNS) {
      const v = rec[field];
      if (v === undefined || v === null || v === '') {
        this.pushImportError(errors, {
          row: rowNo,
          field,
          message: `新規登録の場合、${HAITATSU_NAME_LABELS[field] ?? field}は必須です。`,
        });
      }
    }
  }

  /**
   * §4.1 business rules — 併読 not importable, 電子版×クレカ forbidden,
   * 購読部数 > 0（解約は取込で扱わない）、UPDATE は読者情報変更適用日 必須。
   */
  private validateImportRowRules(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    errors: ImportRowError[],
  ): void {
    // 併読(3) は第3システム同期のため取込不可（共通述語・取込文言）。
    if (row.dokusya_shubetsu !== undefined && isBoth(row.dokusya_shubetsu)) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'dokusya_shubetsu',
        message: '購読種別が3:併読のためExcel取込みできません。',
      });
    }
    // 電子版クレカ は読取専用のため取込不可（共通述語・取込文言）。
    if (isDigitalCreditCard(row.dokusya_shubetsu, row.shiharai_hoho)) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'shiharai_hoho',
        message: '電子版かつクレジットカード決済の組み合わせは取込みできません。',
      });
    }
    // 購読部数は 1 以上（解約は取込対象外＝0 入力なし。顧客要件 2026-06）。
    if (row.dokusya_busu !== undefined && Number(row.dokusya_busu) <= 0) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'dokusya_busu',
        message: DOKUSYA_BUSU_MIN_MESSAGE,
      });
    }
    // 電子版は購読部数=1固定（顧客要件・UI と統一。従来 取込では未チェックだった）。
    // 取込は解約を扱わないため tetsuzuki は非解約(1)として判定する。
    for (const v of collectDigitalBusuViolation(
      row.dokusya_shubetsu,
      row.dokusya_busu,
      1,
    )) {
      this.pushImportError(errors, { row: rowNo, field: v.field, message: v.message });
    }
    // 読者情報変更適用日の必須チェックは payload 単位へ移動
    // （assertPayloadDates・顧客要件 2026-08: 1ファイル1つの入力欄になったため、
    // 行ループで見ると同じ内容のエラーが行数ぶん並ぶ）。
  }

  /**
   * §4.1 適用日の整合性（顧客要件 2026-07）。UI 単票と同ルールを取込にも適用。
   *   [解約予定日] NEW/UPDATE 両方・入力時のみ:
   *     - 解約予定日 >= 購読開始日（当日可）／ >= 本日（過去日不可・当日可）
   *     参照の購読開始日は UPDATE=既存レコード（開始日は編集不可）、NEW=行入力値。
   *   [読者情報変更適用日 / 販売店適用日] UPDATE行のみ（NEW は joho=購読開始日で自明）:
   *     - today <= 各適用日（過去日不可）
   *     - 読者情報変更適用日 >= 購読開始日 / 販売店適用日 < 解約予定日（既存レコード基準）
   * 既存行なしは classifyImportRow が「購読者が見つかりません」を出す。
   */
  /**
   * 顧客要件 2026-07 — 購読種別は画面ラジオ（紙版/電子版）で選ぶ取込モード。
   * UPDATE は既存レコードの購読種別が選択モードと一致するか検証（購読種別は編集
   * 不可のためモードと異なる既存購読者は対象外）。NEW は種別を設定するだけで照合不要。
   */
  private validateImportRowShubetsuMatch(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    if (dto.import_mode !== 'UPDATE') return;
    const existing = this.resolveExistingRow(
      row,
      lookups.existingById,
      lookups.existingByKumiaiin,
      dto,
    );
    // 見つからない行は classifyImportRow が「購読者が見つかりません」を出す。
    if (!existing) return;
    // 既存レコードは実クエリで dokusya_shubetsu を必ず SELECT する。値が取れない
    // ケース（不完全なモック等）は照合対象外にする（本番では必ず値が入る）。
    if (existing.dokusya_shubetsu == null) return;
    if (Number(existing.dokusya_shubetsu) !== Number(dto.dokusya_shubetsu)) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'dokusya_shubetsu',
        message: '選択した購読種別と異なる購読者が含まれています。',
      });
    }
  }

  private validateImportRowTekiyoDates(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    const isUpdate =
      dto.import_mode === 'UPDATE';
    // 適用日 / 中止日は payload 直下（1ファイル1つ・顧客要件 2026-08）。
    // 行ごとの値は無くなったので、全行が同じ日付で検証される。
    const joho = dbDateOrNull(dto.joho_henko_tekiyo_date);
    const chushi = dbDateOrNull(dto.dokusya_chushi_date);
    const today = todayIsoJst();
    const nextMonthFirst = nextMonthFirstIsoJst();

    // 参照レコード（UPDATE時の既存行）。購読開始日/解約予定日の相対チェックに使う。
    const existing = isUpdate
      ? this.resolveExistingRow(
          row,
          lookups.existingById,
          lookups.existingByKumiaiin,
          dto,
        )
      : undefined;

    // ── 解約予定日の整合性（入力時のみ）─────────────────────────────────
    // 種別でルールが違う（SCR-014 の購読中止と同じ切り分け）:
    //   紙版   … 日付単位。購読開始日以降 かつ 本日より後。
    //   電子版 … 月単位。月末で終了するため「本日より後」の日付判定は使わない
    //            （当月末を選ぶのは正当だが、月末当日だと日付判定に引っかかる）。
    //            月末であること・当月以降であることは payload 単位で検証済み。
    //            ここでは購読者ごとの 請求開始月 を見る。
    if (chushi) {
      this.checkImportRowChushi(
        { chushi, rowNo, dto, row, existing, isUpdate, today },
        errors,
      );
    }

    // 適用日の単項目（未来日/過去日）チェック。NEW は購読開始日、UPDATE は
    // joho(未来日のみ) を検証する（顧客要件 2026-07: 販売店適用日を廃止し joho に統一）。
    this.checkImportRowDateBounds(row, rowNo, isUpdate, joho, today, nextMonthFirst, errors);

    // NEW 行は相対チェック対象外（joho=購読開始日で自明）。
    if (!isUpdate) return;

    // 相対チェック（既存レコード基準）— 共通ルールを collectTekiyoDateViolations に集約。
    if (!existing) return;
    // 電子版は適用日省略を許す（assertUpdateModeDates）が、書込み側
    // （dokusya-import.service.ts の updateJoho = dbDateOrNull(...) ?? todayIsoJst()）は
    // 省略時に当日を補う。ここの相対チェックを未補完の null のまま走らせると「適用日 <
    // 購読開始日」（購読開始日が未到来の電子版読者を当日付けで更新）が検出されず、
    // 共通ライタ applyChange の findBefore(joho=当日) が直前行なしと誤判定して
    // before=null 起点の不完全な履歴行を作ってしまう（バグ報告 2026-08）。書込み側と
    // 同じ既定値に揃えて相対チェックを効かせる。
    const effectiveJoho =
      joho ?? (isDigitalOrBoth(dto.dokusya_shubetsu) ? today : null);
    for (const v of collectTekiyoDateViolations({
      johoDate: effectiveJoho,
      kaishiDate: existing.dokusya_kaishi_date as string | null | undefined,
      chushiDate: existing.dokusya_chushi_date as string | null | undefined,
    })) {
      this.pushImportError(errors, {
        row: rowNo,
        field: tekiyoViolationField(v.kind),
        message: v.message,
      });
    }

    // [shubetsu-date-mode] 当日/未来 の可否を購読種別で判定（UI と統一・顧客要件
    // 2026-07 改訂）。購読種別は既存レコードの保存値基準（種別は編集不可・改竄防御）。
    //   電子版: 当日のみ（未来 joho は不可）。
    //   紙版  : 当日変更で帳票影響項目を変更した場合は予約変更（未来日）を要求。
    // 併読/電子版クレカ は validateImportRowRules で既に弾かれる。
    if (joho) {
      const shubetsu = Number(existing.dokusya_shubetsu);
      for (const v of collectDigitalTodayModeViolation({
        shubetsu,
        joho,
        today,
        field: 'joho_henko_tekiyo_date',
      })) {
        this.pushImportError(errors, { row: rowNo, field: v.field, message: v.message });
      }
      for (const v of collectTodayModeReportViolations({
        shubetsu,
        joho,
        today,
        changedReportFields: this.changedReportFieldsForImport(
          row,
          existing,
          dto,
          lookups,
        ),
      })) {
        this.pushImportError(errors, { row: rowNo, field: v.field, message: v.message });
      }
      // [reserved-same-date] 紙版の予約変更（未来日）は同一適用日への変更を1回
      // までに制限する（顧客要件2026-08）。対象集合は buildImportLookups が
      // 一括で1クエリ算出済み。
      for (const v of collectReservedSameDateViolation({
        shubetsu,
        isReservedMode: joho !== today,
        existingChangeFound: lookups.sameDateActiveDokusyaIds.has(
          Number(existing.dokusya_id),
        ),
        field: 'joho_henko_tekiyo_date',
      })) {
        this.pushImportError(errors, { row: rowNo, field: v.field, message: v.message });
      }
    }
  }

  /**
   * 当日変更の制限判定に渡す「変更された帳票影響項目」を取込用に算出する。
   *
   * 取込 UPDATE は `selected_columns` の列だけが変更対象。行は全列に既定値を持つため、
   * 選択列に限定しないと未選択列の既定値まで「変更」に数えてしまう（UI は全項目送信
   * なので単票側では不要な絞り込み）。
   *
   * [hanbaiten-key] 取込行は販売店を **コード** で持つが、`REPORT_FIELD_PAIRS` は
   * 単票 dto に合わせて `hanbaiten_id` を見る。変換しないと
   * `computeChangedReportFields` が `newValues['hanbaiten_id']` を undefined と見なして
   * continue し、**販売店の変更だけが帳票影響項目として検出されない** —
   * 「当日変更で販売店は変えられない」ルールが Excel 経路からすり抜ける。
   * 解決できないコードは別途「販売店コードが見つかりません」で弾かれるため、
   * ここでは id を立てず比較対象から外す（同じ行に二重エラーを出さない）。
   */
  private changedReportFieldsForImport(
    row: ImportDokusyaRowDto,
    existing: Record<string, unknown>,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
  ): string[] {
    const rowForReport: Record<string, unknown> = {
      ...(row as unknown as Record<string, unknown>),
    };
    const code = row.hanbaiten_code;
    if (code !== undefined && code !== null && String(code) !== '') {
      const id = lookups.hanbaitenIdByCode.get(String(code));
      if (id !== undefined) rowForReport.hanbaiten_id = id;
    }

    const selected = new Set(dto.selected_columns ?? []);
    return (
      computeChangedReportFields(rowForReport, existing)
        // 戻り値は単票 dto のキー。取込の列名へ戻してから選択列で絞り、
        // そのままエラーの field にもなる（利用者に見せるのは Excel の列名）。
        .map((f) => REPORT_FIELD_IMPORT_ALIAS[f] ?? f)
        .filter((f) => selected.has(f))
    );
  }

  /**
   * 解約予定日の行単位チェック。種別でルールが違う（SCR-014 の購読中止と同じ切り分け）。
   *
   *   紙版   … 日付単位。購読開始日以降 かつ 本日より後。
   *   電子版 … 月単位。月末で終了するため「本日より後」の日付判定は使わない
   *            （当月末を選ぶのは正当だが、月末**当日**だと日付判定に引っかかり
   *            正しい操作が弾かれる）。月末であること・当月以降であることは
   *            payload 単位で検証済みなので、ここは購読者ごとの 請求開始月 を見る。
   */
  private checkImportRowChushi(
    input: {
      chushi: string;
      rowNo: number;
      dto: ImportDokusyaDto;
      row: ImportDokusyaRowDto;
      existing: Record<string, unknown> | undefined;
      isUpdate: boolean;
      today: string;
    },
    errors: ImportRowError[],
  ): void {
    const { chushi, rowNo, dto, row, existing, isUpdate, today } = input;
    if (isDigitalOrBoth(dto.dokusya_shubetsu)) {
      // 請求開始月が未設定 = 料金徴収が始まっていない → 停止できない（SCR-014 と同じ）。
      const seikyu = str(existing?.seikyu_kaishi_month).trim();
      if (!seikyu) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'dokusya_chushi_date',
          message: SEIKYU_NOT_STARTED_MSG,
        });
        return;
      }
      const chushiMonth = chushi.slice(0, 4) + chushi.slice(5, 7); // YYYYMM
      if (chushiMonth < seikyu) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'dokusya_chushi_date',
          message: `購読中止日は請求開始月（${seikyu.slice(0, 4)}/${seikyu.slice(4, 6)}）以降の月を選択してください。`,
        });
      }
      return;
    }

    const kaishiRef = isUpdate
      ? (existing?.dokusya_kaishi_date as string | null | undefined)
      : dbDateOrNull(row.dokusya_kaishi_date);
    for (const v of collectChushiViolations({
      chushiDate: chushi,
      kaishiDate: kaishiRef,
      today,
    })) {
      this.pushImportError(errors, {
        row: rowNo,
        field: tekiyoViolationField(v.kind),
        message: v.message,
      });
    }
  }

  /**
   * 適用日の単項目境界チェック（顧客要件 2026-07 改訂、電子版は顧客要件 2026-08 改訂）。
   *   NEW    : 紙版は購読開始日(=情報変更適用日) が未来日のみ（当日・過去日 不可）。
   *            電子版は「本日」または「翌月1日」のいずれかのみ（ACSMS-SCR-011
   *            登録画面のラジオボタン「今日から/翌月1日から」と同一制約 —
   *            {@link collectDigitalNewKaishiDateViolation} 参照）。
   *   UPDATE : 読者情報変更適用日は過去日不可（当日・未来日は可）。当日 vs 未来の
   *            可否は購読種別ルール（validateImportRowTekiyoDates 内）で判定する。
   */
  private checkImportRowDateBounds(
    row: ImportDokusyaRowDto,
    rowNo: number,
    isUpdate: boolean,
    joho: string | null,
    today: string,
    nextMonthFirst: string,
    errors: ImportRowError[],
  ): void {
    if (!isUpdate) {
      const kaishi = dbDateOrNull(row.dokusya_kaishi_date);
      // row.dokusya_shubetsu は importExcel の前処理ループで dto.dokusya_shubetsu が
      // 既に全行へコピー済み（validateImportRowRules 等、既存の他チェックと同じ参照元）。
      for (const v of collectDigitalNewKaishiDateViolation({
        shubetsu: row.dokusya_shubetsu,
        kaishiDate: kaishi,
        today,
        nextMonthFirst,
        field: 'dokusya_kaishi_date',
      })) {
        this.pushImportError(errors, { row: rowNo, field: v.field, message: v.message });
      }
      if (
        Number(row.dokusya_shubetsu) !== DokusyaShubetsu.DIGITAL &&
        kaishi &&
        normalizeDbDate(kaishi) <= today
      ) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'dokusya_kaishi_date',
          message: DOKUSYA_KAISHI_DATE_FUTURE_MESSAGE,
        });
      }
      return;
    }
    // UPDATE は当日変更 + 予約変更（未来日）可（UI と統一・顧客要件 2026-07 改訂）。
    // 過去日のみ不可。当日 vs 未来 の可否は購読種別ルール
    // (validateImportRowTekiyoDates の collectDigitalTodayModeViolation /
    // collectTodayModeReportViolations) で判定する。
    if (joho && normalizeDbDate(joho) < today) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'joho_henko_tekiyo_date',
        message: '読者情報変更適用日は本日以降の日付を指定してください。',
      });
    }
  }

  /** §4.3.1-§4.3.3 — tanka / hanbaiten / kanri_shiten / shiten existence. */
  private validateImportRowRefs(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    if (row.tanka_code && !lookups.tankaCodeSet.has(String(row.tanka_code))) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'tanka_code',
        message: '指定された新聞単価コードが見つかりません。',
      });
    } else if (
      row.tanka_code &&
      lookups.tankaExpiredCodeSet.has(String(row.tanka_code))
    ) {
      // バグ報告2026-08：失効(active_flg=false)単価を選択できてしまい、取込は
      // 成功するが詳細画面には失効している旨が表示されず気付けなかった。
      this.pushImportError(errors, {
        row: rowNo,
        field: 'tanka_code',
        message: '指定された新聞単価コードは失効しています。',
      });
    }
    if (
      row.hanbaiten_code &&
      !lookups.hanbaitenCodeSet.has(String(row.hanbaiten_code))
    ) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'hanbaiten_code',
        message: '指定された販売店コードが見つかりません。',
      });
    } else if (
      row.hanbaiten_code &&
      lookups.hanbaitenClosedCodeSet.has(String(row.hanbaiten_code))
    ) {
      // バグ報告2026-08：廃店(haiten_flg=true)販売店を選択できてしまい、取込は
      // 成功するが詳細画面には廃店している旨が表示されず気付けなかった。
      this.pushImportError(errors, {
        row: rowNo,
        field: 'hanbaiten_code',
        message: '指定された販売店コードは廃店のため選択できません。',
      });
    } else if (
      row.hanbaiten_code &&
      String(row.hanbaiten_code) === HANBAITEN_DUMMY_CODE &&
      !isDigitalOrBoth(dto.dokusya_shubetsu)
    ) {
      // バグ報告2026-08：電子版単独用のダミー販売店(9999999999)を紙版の取込で
      // 選択できてしまっていた。ダミーは「配達先の販売店が無い」を意味する
      // ため（hanbaiten-dummy.constant.ts）、紙を配る読者に付くと増減連絡票・
      // 名簿の配達担当が誤る。ACSMS-SCR-011 の登録/編集画面は既に
      // BaseHanbaitenSelect でダミーを候補から除外しているので、Excel取込の
      // 自由入力だけがこのガードを欠いていた。
      this.pushImportError(errors, {
        row: rowNo,
        field: 'hanbaiten_code',
        message: HANBAITEN_DUMMY_NOT_ALLOWED_FOR_PAPER_MESSAGE,
      });
    }
    if (
      row.kanri_shiten_code &&
      !lookups.kanriShitenCodeSet.has(String(row.kanri_shiten_code))
    ) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'kanri_shiten_code',
        message: '指定された管理支店が見つかりません。',
      });
    }
    if (
      row.shiten_code &&
      !lookups.shitenCodeSet.has(String(row.shiten_code)) &&
      // 管理支店に固定されたアカウントは validateImportRowKanriShitenScope が
      // 「存在しない/自管理支店配下でない」を1つのメッセージにまとめて報告する
      // ので、ここでの汎用メッセージは二重報告になるため出さない。
      lookups.ownKanriShitenCode == null
    ) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'shiten_code',
        message: '指定された支店が見つかりません。',
      });
    }
  }

  /**
   * [layer4-scope-guard] 管理支店(kanri_shiten)/支店(shiten) のスコープ検証
   * （顧客要件2026-08）。存在チェック自体は {@link validateImportRowRefs} の
   * 担当なので、ここは「存在するがこの取込では使えない」ケースだけを見る
   * （存在しない場合はそちらのエラーに任せ、二重報告を避ける）。
   *
   * 1. 管理支店自体の取扱いフラグ（m_kanri_shiten.paper_flg/denshi_flg）—
   *    アカウントの取扱いフラグ(m_account)とは別物。全アカウント共通。
   * 2. 行内の親子関係整合性 — 指定された shiten_code が同じ行の kanri_shiten_code
   *    配下に実在するか。全アカウント共通（不具合報告2026-08）。
   * 3. session.kanri_shiten_id のみ固定（shiten_id=null）のアカウント —
   *    自管理支店以外を指定できない。支店を追加指定する場合は自管理支店配下
   *    でなければならない。
   * 4. session.kanri_shiten_id と shiten_id の両方が固定されたアカウント —
   *    自管理支店／自支店以外を一切指定できない。
   */
  private validateImportRowKanriShitenScope(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    session: SessionPayload,
    errors: ImportRowError[],
  ): void {
    const kanriShitenCode = row.kanri_shiten_code
      ? String(row.kanri_shiten_code)
      : '';
    const shitenCode = row.shiten_code ? String(row.shiten_code) : '';
    if (!kanriShitenCode || !lookups.kanriShitenCodeSet.has(kanriShitenCode)) {
      return;
    }

    this.validateKanriShitenHandlesShubetsu(
      kanriShitenCode,
      Number(dto.dokusya_shubetsu),
      rowNo,
      lookups,
      errors,
    );
    this.validateShitenBelongsToKanriShiten(
      kanriShitenCode,
      shitenCode,
      rowNo,
      lookups,
      errors,
    );
    this.validateAccountKanriShitenScope(
      kanriShitenCode,
      shitenCode,
      rowNo,
      lookups,
      errors,
    );
  }

  /**
   * [layer4-scope-guard] 行内の親子関係整合性 — 支店(shiten_code)が、同じ行で
   * 指定された管理支店(kanri_shiten_code)の配下に実在するか（不具合報告
   * 2026-08：無関係な管理支店/支店の組合せ（例: 支店Bは管理支店Cの配下なのに
   * kanri_shiten_code=A・shiten_code=Bで取込）でも取込が成功していた）。
   *
   * アカウントのスコープに関わらず全アカウント共通で検証する。ただし
   * session.kanri_shiten_id で固定されたアカウント（JA_KANRI_SHITEN）は
   * {@link validateAccountKanriShitenScope} が自スコープとの整合性を別途・
   * より厳密に検証し同じ組合せで重複報告になるため対象外
   * （ownKanriShitenCode != null はスキップ）。存在しない支店コード自体は
   * {@link validateImportRowRefs} が報告するのでここでは対象外。
   */
  private validateShitenBelongsToKanriShiten(
    kanriShitenCode: string,
    shitenCode: string,
    rowNo: number,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    if (lookups.ownKanriShitenCode != null) return;
    if (!shitenCode || !lookups.shitenCodeSet.has(shitenCode)) return;
    const belongsTo = lookups.shitenKanriShitenCodeByCode.get(shitenCode);
    if (belongsTo !== kanriShitenCode) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'shiten_code',
        message: `支店「${shitenCode}」は管理支店「${kanriShitenCode}」配下の支店ではありません。`,
      });
    }
  }

  /** [layer4-scope-guard] 1. 管理支店自体の取扱いフラグ（m_kanri_shiten）。 */
  private validateKanriShitenHandlesShubetsu(
    kanriShitenCode: string,
    shubetsu: number,
    rowNo: number,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    const flags = lookups.kanriShitenFlagsByCode.get(kanriShitenCode);
    if (!flags) return;
    if (shubetsu === DokusyaShubetsu.PAPER && !flags.paperFlg) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'kanri_shiten_code',
        message: `管理支店「${kanriShitenCode}」は紙版を取り扱っていないため指定できません。`,
      });
    } else if (shubetsu === DokusyaShubetsu.DIGITAL && !flags.denshiFlg) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'kanri_shiten_code',
        message: `管理支店「${kanriShitenCode}」は電子版を取り扱っていないため指定できません。`,
      });
    }
  }

  /**
   * [layer4-scope-guard] 2/3. ログイン中アカウント自身の管理支店/支店スコープ。
   * session.kanri_shiten_id が未固定（CHUOKAI/JA_HONTEN/NICHINO_*）ならスコープ
   * 制約自体が無いので即 return。
   */
  private validateAccountKanriShitenScope(
    kanriShitenCode: string,
    shitenCode: string,
    rowNo: number,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    if (lookups.ownKanriShitenCode == null) return;

    if (lookups.ownShitenCode != null) {
      // 3. 管理支店 + 支店の両方に固定されたアカウント。
      const kanriMismatch = kanriShitenCode !== lookups.ownKanriShitenCode;
      const shitenMismatch =
        shitenCode !== '' && shitenCode !== lookups.ownShitenCode;
      if (kanriMismatch || shitenMismatch) {
        this.pushImportError(errors, {
          row: rowNo,
          field: kanriMismatch ? 'kanri_shiten_code' : 'shiten_code',
          message: `このアカウントは管理支店「${lookups.ownKanriShitenCode}」／支店「${lookups.ownShitenCode}」の読者のみ取込できます。`,
        });
      }
      return;
    }

    // 2. 管理支店のみに固定されたアカウント（shiten_id=null）。
    if (kanriShitenCode !== lookups.ownKanriShitenCode) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'kanri_shiten_code',
        message: `管理支店は自管理支店「${lookups.ownKanriShitenCode}」のみ指定できます。`,
      });
      return;
    }
    if (shitenCode === '') return;
    const belongsTo = lookups.shitenKanriShitenCodeByCode.get(shitenCode);
    if (belongsTo !== lookups.ownKanriShitenCode) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'shiten_code',
        message: `支店「${shitenCode}」は管理支店「${lookups.ownKanriShitenCode}」配下の支店ではありません。`,
      });
    }
  }

  /**
   * 顧客要件 — 読者属性(dokusyaso_bunrui) は電子版(2)・併読(3) で1つ以上必須
   * （紙版(1) は任意）。フォーム(SCR-011)の必須ルールと同一。
   * - 実効購読種別: NEW は行の種別、UPDATE は既存レコードの種別（編集不可のため
   *   DB 値で判定）。email 必須と同じ扱い。
   * - UPDATE で dokusyaso_bunrui 列が selected_columns に無い行は未変更で検証しない。
   */
  private validateImportRowDokusyaSoBunrui(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    // dokusyaso_bunrui 列が対象でない UPDATE は素通し（既存値を維持）。
    const targeted =
      dto.import_mode === 'NEW' ||
      (dto.import_mode === 'UPDATE' &&
        dto.selected_columns.includes('dokusyaso_bunrui'));
    if (!targeted) return;

    let effectiveShubetsu: number;
    if (dto.import_mode === 'NEW') {
      effectiveShubetsu = Number(row.dokusya_shubetsu);
    } else {
      const existing = this.resolveExistingRow(
        row,
        lookups.existingById,
        lookups.existingByKumiaiin,
        dto,
      );
      // 見つからない行は classifyImportRow が「購読者が見つかりません」を出す。
      if (!existing) return;
      effectiveShubetsu = Number(existing.dokusya_shubetsu);
    }

    // 紙版は任意。
    if (!isDigitalOrBoth(effectiveShubetsu)) return;

    const value =
      typeof row.dokusyaso_bunrui === 'string'
        ? row.dokusyaso_bunrui.trim()
        : '';
    if (!value) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'dokusyaso_bunrui',
        message: DOKUSYASO_BUNRUI_REQUIRED_DIGITAL_MSG,
      });
    }
  }

  /**
   * 購読者層分類 / 農業者分類 は電子版と同じコード値のカンマ区切りで保存する
   * （顧客要件 2026-07）。日本語ラベル（'農業者' 等）や未定義コードを取り込むと
   * push 時に profession/products へ変換できず 999(その他) に落ちるため、
   * 取込時点で弾く。テンプレートのサンプル行も `0` 形式。
   */
  private validateImportRowBunruiCodes(
    row: ImportDokusyaRowDto,
    rowNo: number,
    errors: ImportRowError[],
  ): void {
    if (!isValidDokusyaSoBunruiCsv(row.dokusyaso_bunrui)) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'dokusyaso_bunrui',
        message: DOKUSYASO_BUNRUI_INVALID_MSG,
      });
    }
    if (!isValidNogyosyaBunruiCsv(row.nogyosya_bunrui)) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'nogyosya_bunrui',
        message: NOGYOSYA_BUNRUI_INVALID_MSG,
      });
    }
  }

  /**
   * m_code 参照列（性別・メールマガジン・引落預金種別・郵送区分・支払方法）の
   * 値が customer-editable キャッシュに存在するかを検証する（バックエンド
   * レビュー finding #9）。単票 create/update は `assertMCodeValues` で即時
   * throw するが、取込みは行単位で errors[] に蓄積し呼び出し側で最大
   * `IMPORT_ERROR_CAP` 件へ丸めるため、同じ判定を pushImportError 経由で行う。
   * 空欄（undefined/null/''）はスキップ — 必須チェックは
   * `validateImportRowRequired` の責務。ラベル文字列（'男性' 等）は
   * `DokusyaImportService.toMCodeValue` が事前にコードへ変換済みで本メソッド
   * には来ない想定だが、念のため lookups の Set は `CodeService` の
   * `normalizeValue` と同じ正規化（`normalizeForCache`）を経て構築されている
   * ため、数値形の文字列もそのまま比較できる。
   */
  private validateImportRowCodeMaster(
    row: ImportDokusyaRowDto,
    rowNo: number,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    this.pushCodeMasterError(
      row.gender,
      'GENDER',
      lookups,
      rowNo,
      'gender',
      '性別',
      errors,
    );
    this.pushCodeMasterError(
      row.mail_magazine_flg,
      'MAIL_MAGAZINE_FLG',
      lookups,
      rowNo,
      'mail_magazine_flg',
      'メールマガジン配信フラグ',
      errors,
    );
    this.pushCodeMasterError(
      row.hikiotoshi_yokin_shubetsu,
      'YOKIN_SHUBETSU',
      lookups,
      rowNo,
      'hikiotoshi_yokin_shubetsu',
      '引落預金種別',
      errors,
    );
    this.pushCodeMasterError(
      row.yubin_kubun,
      'YUBIN_KUBUN',
      lookups,
      rowNo,
      'yubin_kubun',
      '郵送区分',
      errors,
    );
    this.pushCodeMasterError(
      row.shiharai_hoho,
      'SHIHARAI_HOHO',
      lookups,
      rowNo,
      'shiharai_hoho',
      '支払方法',
      errors,
    );
  }

  /** 1フィールド分の m_code 許容値チェック — 空欄はスキップ。 */
  private pushCodeMasterError(
    value: number | string | undefined,
    category: string,
    lookups: ImportRowLookups,
    rowNo: number,
    field: string,
    label: string,
    errors: ImportRowError[],
  ): void {
    if (value === undefined || value === null || value === '') return;
    if (lookups.hasCode(category, normalizeForCache(value))) return;
    this.pushImportError(errors, {
      row: rowNo,
      field,
      message: `${label}の値が不正です。`,
    });
  }

  /**
   * 顧客要件 — メールアドレスは電子版(2)・併読(3) で必須かつ電子版/併読レコード間
   * で一意（紙版(1) は任意・重複可）。
   * - 実効購読種別: NEW は行の種別、UPDATE_* は既存レコードの種別（編集不可のため
   *   Excel 値でなく DB 値で判定）。
   * - UPDATE で email 列が selected_columns に無い行は未変更で検証しない。
   * - 一意性: DB 内の電子版/併読レコード（自身は除外）＋同一取込バッチ内の
   *   電子版/併読行同士の双方で重複検知。
   */
  private validateImportRowEmail(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    batchDigitalEmail: Map<string, number>,
    errors: ImportRowError[],
  ): void {
    // email 列が対象でない UPDATE は素通し（既存メールを維持）。
    const emailTargeted =
      dto.import_mode === 'NEW' ||
      (dto.import_mode === 'UPDATE' &&
        dto.selected_columns.includes('email'));
    if (!emailTargeted) return;

    // 実効購読種別 + 自己同定ID を求める。
    let effectiveShubetsu: number;
    let identity: number;
    if (dto.import_mode === 'NEW') {
      effectiveShubetsu = Number(row.dokusya_shubetsu);
      // NEW 行は各行が別レコード。実 dokusya_id（正値）と衝突しない負値を使う。
      identity = -rowNo;
    } else {
      const existing = this.resolveExistingRow(
        row,
        lookups.existingById,
        lookups.existingByKumiaiin,
        dto,
      );
      // 見つからない行は classifyImportRow が「購読者が見つかりません」を出す。
      if (!existing) return;
      effectiveShubetsu = Number(existing.dokusya_shubetsu);
      identity = Number(existing.dokusya_id);
    }

    // 紙版は必須でも一意でもない。
    if (!isDigitalOrBoth(effectiveShubetsu)) return;

    const email = typeof row.email === 'string' ? row.email.trim() : '';
    if (!email) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'email',
        message: EMAIL_REQUIRED_DIGITAL_MSG,
      });
      return;
    }

    // DB 内の電子版/併読レコードとの重複（自身は除外）。
    const dbIds = lookups.existingDigitalEmailToIds.get(email);
    const dbCollision =
      dbIds !== undefined && Array.from(dbIds).some((id) => id !== identity);

    // 同一取込バッチ内の電子版/併読行同士の重複。
    const batchIdentity = batchDigitalEmail.get(email);
    const batchCollision =
      batchIdentity !== undefined && batchIdentity !== identity;
    if (batchIdentity === undefined) batchDigitalEmail.set(email, identity);

    if (dbCollision || batchCollision) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'email',
        message: ErrorMessage.DUPLICATE_EMAIL,
      });
    }
  }

  /**
   * §4.3.4 — 集約件数用に行を created / updated / cancelled へ分類。UPDATE_* /
   * 一括中止 は既存レコード必須（スコープ外→403、該当なし→行エラーで null 返す）。
   * NEW 行は常に 'created'。
   *
   * [id-required-on-update・不具合修正2026-08] 通常更新（`joho_henko_tekiyo_date`
   * 指定）と一括中止（`dokusya_chushi_date` 指定）でキー解決ルールを分ける:
   *   - 通常更新: `dokusya_id` 必須。`kumiaiin_code` は重複しうるキーのため、
   *     通常更新ではフォールバックとして一切使わない（誤って別の購読者を
   *     更新する事故を作り込む余地を無くす）。
   *   - 一括中止: 従来どおり `dokusya_id` 優先、無ければ `kumiaiin_code`
   *     （2件以上ヒットなら曖昧としてエラー・`isAmbiguousKumiaiinKey`）。
   */
  private classifyImportRow(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    session: SessionPayload,
    errors: ImportRowError[],
  ): 'created' | 'updated' | null {
    const needsExisting = dto.import_mode === 'UPDATE';
    if (!needsExisting) return 'created';

    const hasDokusyaId =
      row.dokusya_id !== undefined &&
      row.dokusya_id !== null &&
      String(row.dokusya_id) !== '';
    const isBulkStop = dbDateOrNull(dto.dokusya_chushi_date) != null;

    if (!isBulkStop) {
      // 通常更新 — dokusya_id 必須。kumiaiin_code は重複可のためフォールバック
      // キーとして使わない（下の isAmbiguousKumiaiinKey / resolveExistingRow の
      // kumiaiin_code 分岐は一括中止専用にする）。
      if (!hasDokusyaId) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'dokusya_id',
          message: 'IDは必須です。',
        });
        return null;
      }
    } else if (this.isAmbiguousKumiaiinKey(row, hasDokusyaId, lookups)) {
      // 一括中止のみ: dokusya_id が無い行は kumiaiin_code をキーにする。組合員
      // コードは重複可のため、同一コードが2件以上ある場合は一括誤解約を防ぐため
      // 行エラー。
      this.pushImportError(errors, {
        row: rowNo,
        field: 'kumiaiin_code',
        message: '組合員コードが重複しているため、IDを指定してください。',
      });
      return null;
    }

    const existing = this.resolveExistingRow(
      row,
      lookups.existingById,
      lookups.existingByKumiaiin,
      dto,
    );
    if (!existing) {
      this.pushImportError(errors, {
        row: rowNo,
        field: hasDokusyaId ? 'dokusya_id' : 'kumiaiin_code',
        message: '指定された購読者が見つかりません。',
      });
      return null;
    }

    // JA_KANRI_SHITEN スコープ外の既存レコード → 403。
    assertBranchScopeViolation(
      Number(existing.ja_id),
      existing.kanri_shiten_id == null ? null : Number(existing.kanri_shiten_id),
      session,
    );
    // 所属支店スコープ（顧客要件 2026-07）— session.shiten_id 設定時は他支店の
    // 読者を取込で更新できない（403）。
    assertShitenScopeViolation(
      existing.shiten_id == null ? null : Number(existing.shiten_id),
      session,
    );
    // 販売店適用日は廃止（顧客要件 2026-07）。販売店変更の適用日は読者情報変更
    // 適用日(joho)に統一されるため、店舗変更時の販売店適用日必須チェックは撤廃。
    return 'updated';
  }

  /**
   * dokusya_id 無し かつ kumiaiin_code が JA 内で 2 件以上 → キーが曖昧
   * （一括誤更新防止のため呼び出し側で行エラーにする）。
   */
  private isAmbiguousKumiaiinKey(
    row: ImportDokusyaRowDto,
    hasDokusyaId: boolean,
    lookups: ImportRowLookups,
  ): boolean {
    if (hasDokusyaId || !row.kumiaiin_code) return false;
    return (lookups.kumiaiinCounts.get(String(row.kumiaiin_code)) ?? 0) > 1;
  }

  /** 行エラーを追加（10件上限を超えない）。 */
  private pushImportError(
    errors: Array<{ row: number; field: string; message: string }>,
    error: { row: number; field: string; message: string },
  ): void {
    if (errors.length < IMPORT_ERROR_CAP) errors.push(error);
  }

  /**
   * UPDATE_* / 一括中止 行の既存購読者を解決。dokusya_id があれば優先（解約も同じ
   * — UPDATE 句の WHERE と一致）。無い場合のみ kumiaiin_code にフォールバック
   * （呼び出し側で重複件数を検証済み）。
   */
  /**
   * [id-required-on-update・不具合修正2026-08] `dokusya_id` 優先、無ければ
   * `kumiaiin_code` にフォールバック — だが、このフォールバックは**一括中止
   * （`dto.dokusya_chushi_date` 指定）でのみ**許可する。通常更新
   * （`joho_henko_tekiyo_date` 指定）で `dokusya_id` が無い行は、たとえ
   * `kumiaiin_code` が一意にヒットしても未解決(`undefined`)として扱う —
   * `classifyImportRow` がこれを検知して「IDは必須です。」の行エラーを出し、
   * 本メソッドを呼ぶ他の全チェック（購読種別照合・適用日整合性・読者属性・
   * メール重複）も静かにスキップする（いずれも「見つからない行は
   * classifyImportRow が出す」前提で `if (!existing) return;` している）。
   */
  private resolveExistingRow(
    row: ImportDokusyaRowDto,
    byId: Map<number, Record<string, unknown>>,
    byKumiaiin: Map<string, Record<string, unknown>>,
    dto: ImportDokusyaDto,
  ): Record<string, unknown> | undefined {
    const hasDokusyaId =
      row.dokusya_id !== undefined &&
      row.dokusya_id !== null &&
      String(row.dokusya_id) !== '';
    if (hasDokusyaId) {
      return byId.get(Number(row.dokusya_id));
    }
    const isBulkStop = dbDateOrNull(dto.dokusya_chushi_date) != null;
    if (!isBulkStop) return undefined;
    return row.kumiaiin_code ? byKumiaiin.get(row.kumiaiin_code) : undefined;
  }
}

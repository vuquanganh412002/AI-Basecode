import { Injectable } from '@nestjs/common';

import { ValidationException } from '@/common/exceptions/common.exceptions';
import { assertBranchScopeViolation } from '@/common/utils/data-scope';
import { DokusyaShubetsu, ShiharaiHoho } from '@/common/enums';
import type { SessionPayload } from '@/modules/auth/session.service';

import { ErrorMessage } from '@/common/constants/error-codes.constant';
import {
  normalizeDbDate,
  dbDateOrNull,
  todayIsoJst,
} from '@/common/utils/datetime';
import { ImportDokusyaDto, ImportDokusyaRowDto } from './dto/import-dokusya.dto';
import {
  collectTekiyoDateViolations,
  collectChushiViolations,
  tekiyoViolationField,
} from './dokusya-tekiyo-date.rules';

/**
 * Pre-fetched lookup sets/maps shared by the per-row Excel-import
 * validators. Built once in `importExcel` before the row loop so each
 * row check is O(1) against in-memory structures, not a per-row query.
 */
interface ImportRowLookups {
  existingById: Map<number, Record<string, unknown>>;
  existingByKumiaiin: Map<string, Record<string, unknown>>;
  /** kumiaiin_code → 既存件数（2 以上なら kumiaiin キーでの更新/解約は曖昧）。 */
  kumiaiinCounts: Map<string, number>;
  tankaCodeSet: Set<string>;
  hanbaitenCodeSet: Set<string>;
  /** 販売店コード → hanbaiten_id（取込時の販売店変更検知に使う）。 */
  hanbaitenIdByCode: Map<string, number>;
  kanriShitenCodeSet: Set<string>;
  shitenCodeSet: Set<string>;
  /**
   * 既存の電子版(2)・併読(3) レコードの email → dokusya_id 群（JA 全件）。
   * 取込時のメール重複チェック用。紙版(1) は含めない（重複可）。
   */
  existingDigitalEmailToIds: Map<string, Set<number>>;
}

/** Per-row import error accumulator entry. */
type ImportRowError = { row: number; field: string; message: string };

/** 電子版・併読で email 未入力時のメッセージ（BE/FE/取込で共通文言）。 */
const EMAIL_REQUIRED_DIGITAL_MSG =
  'メールアドレスは電子版・併読の場合は必須です。';

/**
 * 電子版(2)・併読(3) 判定。これらの購読種別は email 必須かつ
 * email の一意性チェック対象。紙版(1) は email 任意・重複可。
 * core 側 DokusyaService と同一実装（取込と UI で判定を揃えるため複製）。
 */
function isDigitalOrBoth(shubetsu: number | null | undefined): boolean {
  const n = Number(shubetsu);
  return n === DokusyaShubetsu.DIGITAL || n === DokusyaShubetsu.BOTH;
}

/**
 * Raise a single VALIDATION_ERROR with a one-field errors[] payload.
 * Shape matches `ValidationPipe`'s exception so the FE
 * `useApiForm` composable maps the error to `<a-form-item :help>`
 * uniformly with DTO failures.
 * core 側 DokusyaService と同一実装（取込と UI で文言・形を揃えるため複製）。
 */
function fieldValidationError(
  field: string,
  message: string,
): ValidationException {
  return new ValidationException([{ field, message }]);
}

/**
 * SCR-016 — the 13 physical columns NEW mode REQUIRES in
 * `selected_columns` (api.md §4.1).
 */
const IMPORT_NEW_REQUIRED_COLUMNS: readonly string[] = [
  'dokusya_shubetsu',
  'kanri_shiten_code',
  'shiten_code',
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
 * SCR-016 — Japanese labels for the NEW required columns, used to build a
 * per-row "{label}は必須です。" message when a selected required column
 * carries a BLANK value. The column-selection check above only verifies the
 * column is targeted; this value-presence check prevents a blank required
 * FK / field from slipping through to the INSERT (which would otherwise hit
 * a NOT NULL / FK constraint and surface as a 500 instead of a graceful
 * IMPORT_VALIDATION_ERROR).
 */
const NEW_REQUIRED_LABELS: Readonly<Record<string, string>> = {
  dokusya_shubetsu: '購読種別',
  kanri_shiten_code: '管理支店',
  shiten_code: '支店',
  dokusya_busu: '購読部数',
  tanka_code: '新聞単価',
  yubin_no: '郵便番号',
  todofuken_code: '都道府県',
  shikuchoson: '市町村郡',
  chome_banchi: '丁目番地',
  renrakusaki_1: '連絡先１',
  hanbaiten_code: '販売店コード',
  shiharai_hoho: '支払方法',
  dokusya_kaishi_date: '購読開始日',
};

/** SCR-016 — row-error cap returned to the client (api.md §4.1). */
const IMPORT_ERROR_CAP = 10;

/**
 * SCR-016 — 購読者Excelデータ取込の純粋バリデーションクラスタを担うサービス。
 *
 * 肥大化した `DokusyaImportService` から「行バリデーション + 分類」concern を
 * 切り出したもの。注入依存を一切持たない leaf サービス（全メソッドが引数の
 * rows / dto / 事前解決済み lookups のみで完結する純粋ロジック）。`importExcel`
 * は `assertNewModeRequiredColumns` / `validateImportRows` の 2 メソッドを呼び、
 * 残り 9 メソッドはこのクラスタ内でのみ相互呼び出しされる。
 */
@Injectable()
export class DokusyaImportValidator {
  /**
   * §4.1 — NEW モードは必須13列を selected_columns に含むこと。欠けていれば
   * VALIDATION_ERROR（`.code` を own property で公開しサービス単体テストが
   * `err.code` を直接参照できるようにする）。
   */
  public assertNewModeRequiredColumns(dto: ImportDokusyaDto): void {
    if (dto.import_mode !== 'NEW') return;
    const missing = IMPORT_NEW_REQUIRED_COLUMNS.filter(
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
      this.validateImportRowTekiyoDates(row, rowNo, dto, lookups, errors);
      this.validateImportRowRefs(row, rowNo, lookups, errors);
      this.validateImportRowEmail(
        row,
        rowNo,
        dto,
        lookups,
        batchDigitalEmail,
        errors,
      );
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
   * §4.1/§4.3 — NEW-mode required-column + duplicate-kumiaiin checks.
   * The column-selection guard only checks a column is targeted; a blank
   * required FK/field would otherwise slip past the per-row FK checks and
   * crash the INSERT (NOT NULL / FK) as a 500 — surface it gracefully.
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
    if (
      row.dokusya_shubetsu !== undefined &&
      Number(row.dokusya_shubetsu) === DokusyaShubetsu.BOTH
    ) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'dokusya_shubetsu',
        message: '購読種別が3:併読のためExcel取込みできません。',
      });
    }
    if (
      Number(row.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
      Number(row.shiharai_hoho) === ShiharaiHoho.CREDIT_CARD
    ) {
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
        message: '購読部数は1以上で入力してください。',
      });
    }
    // UPDATE は読者情報変更適用日が必須（履歴の情報変更イベント日。顧客要件
    // 2026-06）。販売店適用日は「販売店が変わる行」で classifyImportRow が検証する。
    const isUpdate =
      dto.import_mode === 'UPDATE_ALL' || dto.import_mode === 'UPDATE_PARTIAL';
    if (isUpdate && !String(row.joho_henko_tekiyo_date ?? '').trim()) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'joho_henko_tekiyo_date',
        message: '読者情報変更適用日を入力してください。',
      });
    }
  }

  /**
   * §4.1 適用日の整合性（顧客要件 2026-07）。UI 単票と同じルールを取込にも適用。
   *   [解約予定日] NEW / UPDATE 両方・入力時のみ:
   *     - 解約予定日 >= 購読開始日（当日可）
   *     - 解約予定日 >= 本日（過去日不可・当日可）
   *     参照の購読開始日は UPDATE=既存レコード（開始日は編集不可）、NEW=行の入力値。
   *   [読者情報変更適用日 / 販売店適用日] UPDATE行のみ（NEW は joho=購読開始日で自明）:
   *     - today <= 各適用日（過去日不可）
   *     - 読者情報変更適用日 >= 購読開始日 / 販売店適用日 < 解約予定日（既存レコード基準）
   * 既存行が見つからないケースは classifyImportRow が別途「購読者が見つかりません」を出す。
   */
  private validateImportRowTekiyoDates(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    const isUpdate =
      dto.import_mode === 'UPDATE_ALL' || dto.import_mode === 'UPDATE_PARTIAL';
    const joho = dbDateOrNull(row.joho_henko_tekiyo_date);
    const hanbaiten = dbDateOrNull(row.hanbaiten_tekiyo_date);
    const chushi = dbDateOrNull(row.dokusya_chushi_date);
    const today = todayIsoJst();

    // 参照レコード（UPDATE時の既存行）。購読開始日/解約予定日の相対チェックに使う。
    const existing = isUpdate
      ? this.resolveExistingRow(
          row,
          lookups.existingById,
          lookups.existingByKumiaiin,
        )
      : undefined;

    // ── 解約予定日の整合性（NEW / UPDATE 両方・入力時のみ）───────────────
    if (chushi) {
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

    // 以降の joho/hanbaiten 相対＋過去日チェックは UPDATE 行のみ対象。
    if (!isUpdate) return;

    // 過去日チェック（today基準）。
    if (joho && normalizeDbDate(joho) < today) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'joho_henko_tekiyo_date',
        message: '読者情報変更適用日に過去日は指定できません。',
      });
    }
    if (hanbaiten && normalizeDbDate(hanbaiten) < today) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'hanbaiten_tekiyo_date',
        message: '販売店適用日に過去日は指定できません。',
      });
    }

    // 相対チェック（既存レコード基準）— 共通ルールを collectTekiyoDateViolations に集約。
    if (!existing) return;
    for (const v of collectTekiyoDateViolations({
      johoDate: joho,
      hanbaitenDate: hanbaiten,
      kaishiDate: existing.dokusya_kaishi_date as string | null | undefined,
      chushiDate: existing.dokusya_chushi_date as string | null | undefined,
    })) {
      this.pushImportError(errors, {
        row: rowNo,
        field: tekiyoViolationField(v.kind),
        message: v.message,
      });
    }
  }

  /** §4.3.1-§4.3.3 — tanka / hanbaiten / kanri_shiten / shiten existence. */
  private validateImportRowRefs(
    row: ImportDokusyaRowDto,
    rowNo: number,
    lookups: ImportRowLookups,
    errors: ImportRowError[],
  ): void {
    if (row.tanka_code && !lookups.tankaCodeSet.has(String(row.tanka_code))) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'tanka_code',
        message: '指定された新聞単価コードが見つかりません。',
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
      !lookups.shitenCodeSet.has(String(row.shiten_code))
    ) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'shiten_code',
        message: '指定された支店が見つかりません。',
      });
    }
  }

  /**
   * 顧客要件 — メールアドレスは電子版(2)・併読(3) で必須かつ電子版/併読の
   * レコード間で一意（紙版(1) は任意・重複可）。
   *
   * - 実効購読種別: NEW は行の購読種別、UPDATE_* は既存レコードの購読種別
   *   （購読種別は編集不可のため Excel 上の値ではなく DB の値で判定）。
   * - UPDATE_PARTIAL で email 列が selected_columns に無い行は email 未変更
   *   のため検証しない。
   * - 一意性: DB 内の電子版/併読レコード（自身は除外）＋同一取込バッチ内の
   *   電子版/併読行同士の双方で重複を検知する。
   */
  private validateImportRowEmail(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    batchDigitalEmail: Map<string, number>,
    errors: ImportRowError[],
  ): void {
    // email 列が対象でない UPDATE_PARTIAL は素通し（既存メールを維持）。
    const emailTargeted =
      dto.import_mode === 'NEW' ||
      dto.import_mode === 'UPDATE_ALL' ||
      (dto.import_mode === 'UPDATE_PARTIAL' &&
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
   * §4.3.4 — classify a row as created / updated / cancelled for the
   * summary counts. UPDATE_* / 一括中止 require an existing record
   * (out-of-scope → 403; not found → row error, returns null). NEW rows
   * are always 'created'.
   */
  private classifyImportRow(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    session: SessionPayload,
    errors: ImportRowError[],
  ): 'created' | 'updated' | null {
    const needsExisting =
      dto.import_mode === 'UPDATE_ALL' ||
      dto.import_mode === 'UPDATE_PARTIAL';
    if (!needsExisting) return 'created';

    const hasDokusyaId =
      row.dokusya_id !== undefined &&
      row.dokusya_id !== null &&
      String(row.dokusya_id) !== '';

    // dokusya_id が無い行は kumiaiin_code をキーにする。組合員コードは重複可
    // のため、同一コードが 2 件以上ある場合は一括誤更新を防ぐため行エラー。
    if (this.isAmbiguousKumiaiinKey(row, hasDokusyaId, lookups)) {
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
    );
    if (!existing) {
      this.pushImportError(errors, {
        row: rowNo,
        field: hasDokusyaId ? 'dokusya_id' : 'kumiaiin_code',
        message: '指定された購読者が見つかりません。',
      });
      return null;
    }

    // JA_KANRI_SHITEN out-of-scope existing record → 403.
    assertBranchScopeViolation(
      Number(existing.ja_id),
      existing.kanri_shiten_id == null ? null : Number(existing.kanri_shiten_id),
      session,
    );
    this.assertHanbaitenTekiyoForStoreChange(
      row,
      rowNo,
      dto,
      lookups,
      existing,
      errors,
    );
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

  /**
   * 販売店が変わる UPDATE 行は販売店適用日 (hanbaiten_tekiyo_date) が必須
   * （履歴の販売店イベント日。顧客要件 2026-06）。UPDATE_PARTIAL は販売店コード列が
   * selected_columns にあるときのみ「変更対象」とみなす。
   */
  private assertHanbaitenTekiyoForStoreChange(
    row: ImportDokusyaRowDto,
    rowNo: number,
    dto: ImportDokusyaDto,
    lookups: ImportRowLookups,
    existing: Record<string, unknown>,
    errors: ImportRowError[],
  ): void {
    const storeColumnActive =
      dto.import_mode === 'UPDATE_ALL' ||
      (dto.import_mode === 'UPDATE_PARTIAL' &&
        dto.selected_columns.includes('hanbaiten_code'));
    if (!storeColumnActive || !row.hanbaiten_code) return;

    const newHanbaitenId = lookups.hanbaitenIdByCode.get(
      String(row.hanbaiten_code),
    );
    const storeChanged =
      existing.hanbaiten_id != null &&
      newHanbaitenId != null &&
      newHanbaitenId !== Number(existing.hanbaiten_id);
    if (storeChanged && !String(row.hanbaiten_tekiyo_date ?? '').trim()) {
      this.pushImportError(errors, {
        row: rowNo,
        field: 'hanbaiten_tekiyo_date',
        message: '販売店適用日を入力してください。',
      });
    }
  }

  /** Push a row error, never exceeding the 10-entry cap. */
  private pushImportError(
    errors: Array<{ row: number; field: string; message: string }>,
    error: { row: number; field: string; message: string },
  ): void {
    if (errors.length < IMPORT_ERROR_CAP) errors.push(error);
  }

  /**
   * Resolve the existing 購読者 for an UPDATE_* / 一括中止 row. dokusya_id
   * があればそれを優先（解約も同じ — UPDATE 句の WHERE と一致させる）。無い
   * 場合のみ kumiaiin_code にフォールバック（呼び出し側で重複件数を検証済み）。
   */
  private resolveExistingRow(
    row: ImportDokusyaRowDto,
    byId: Map<number, Record<string, unknown>>,
    byKumiaiin: Map<string, Record<string, unknown>>,
  ): Record<string, unknown> | undefined {
    const hasDokusyaId =
      row.dokusya_id !== undefined &&
      row.dokusya_id !== null &&
      String(row.dokusya_id) !== '';
    if (hasDokusyaId) {
      return byId.get(Number(row.dokusya_id));
    }
    return row.kumiaiin_code ? byKumiaiin.get(row.kumiaiin_code) : undefined;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { normalizeDbDate, dbDateOrNull, todayIsoJst } from '@/common/utils/datetime';
import {
  AuditOperation,
  DenshiShoninStatus,
  DokusyaShubetsu,
  LogType,
  ResultStatus,
  TetsuzukiShurui,
} from '@/common/enums';
import { TANKA_TYPE_KODOKU } from '@/common/constants/tanka-type.constant';
import { MAIL_MAGAZINE_FLG_OFF } from '@/common/constants/mail-magazine-flg.constant';
import { YUBIN_KUBUN_NASHI } from '@/common/constants/yubin-kubun.constant';
import {
  allowsDokusyasoBunruiSonota,
  allowsJaYakushokuinFlg,
  allowsNogyoKankeiFlg,
  allowsNogyosyaBunruiSonota,
} from '@/common/constants/dokusya-bunrui.constant';
import { buildBunruiPayload } from './dokusya.mapper';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import { DenshibanPushService } from '@/modules/denshiban/denshiban-push.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { ImportDokusyaDto, ImportDokusyaRowDto } from './dto/import-dokusya.dto';
import { DokusyaImportValidationException } from './exceptions/import-validation.exception';
import { DokusyaRowLimitExceededException } from './exceptions/row-limit-exceeded.exception';
import { DokusyaAccountFlagService } from './dokusya-account-flag.service';
import { DokusyaRirekiService } from './dokusya-rireki-helper.service';
import { DokusyaImportValidator } from './dokusya-import-validator.service';
import { applyChange, insertScheduledKaiyaku } from './dokusya-history.writer';
import { DokusyaFields } from './dokusya-history.types';

/** ACSMS-SCR-016 — 監査コンテキストの画面名ラベル。 */
const SCREEN_NAME_SCR016 = '購読者Excelデータ取込画面 (ACSMS-SCR-016)';

/** ACSMS-SCR-016 監査ログ用テーブル名（t_log.target_table）。DokusyaService と同値だが自己完結のため複製。 */
const TABLE_NAME = 't_dokusya';

/**
 * getRawMany() の列（実行時は常にスカラ）を primitive に絞り込む。
 * String() の `[object Object]` を防ぐ。unknown を受けるためアサーション必須。
 */
function asScalar(value: unknown): string | number {
  return value as string | number;
}

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
  /**
   * m_code 参照列の許容値判定（バックエンドレビュー finding #9）。
   * `DokusyaImportValidator` は依存ゼロの leaf サービスなので CodeService を
   * inject させず、ここで `codeService.has` をそのまま束縛した関数を渡す。
   */
  hasCode: (category: string, value: number | string) => boolean;
}

/** m_code 値の入力（取込みは数値/文字列、未指定は undefined）。 */
type MCodeInput = number | string | undefined;

/**
 * ACSMS-SCR-016 — 取込テンプレート46列のヘッダー順（api.md §テンプレートファイル仕様）。
 * 各要素は生成ブックの1行目に出る日本語ヘッダー名。
 *
 * Excel 列でないもの:
 *   - 購読種別         … 画面ラジオ（紙版/電子版）で選び全行へ一律適用（顧客要件 2026-07）
 *   - 読者情報変更適用日 … 画面の入力欄。1ファイル1つの適用日（顧客要件 2026-08）
 *   - 購読中止日        … 同上。入力すると「一括中止」になる（joho と排他）
 *
 * 後ろ2つを列から外したのは、入力源を二重に持たないため。行ごとに別の適用日を
 * 持てる状態だと、画面の入力欄とどちらが勝つのかが仕様として説明できない。
 */
const IMPORT_TEMPLATE_HEADERS: readonly string[] = [
  'ID',
  '管理支店',
  '支店',
  '組合員コード',
  '購読者氏名_氏',
  '購読者氏名_名',
  '購読者かな_氏',
  '購読者かな_名',
  '購読部数',
  '新聞単価',
  'メールアドレス',
  'メールマガジン',
  '生年（西暦）',
  '性別',
  '郵便番号',
  '都道府県',
  '市町村郡',
  '丁目番地',
  'マンション・アパート名',
  '連絡先１',
  '連絡先２',
  '購読者情報と同じ',
  '郵便番号(配達先)',
  '都道府県(配達先)',
  '市町村郡(配達先)',
  '丁目番地(配達先)',
  'ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)',
  '連絡先１(配達先)',
  '連絡先２(配達先)',
  '配達先苗字（漢字）',
  '配達先名前（漢字）',
  '配達先苗字（かな）',
  '配達先名前（かな）',
  '販売店コード',
  '郵送区分',
  '支払方法',
  '購読料支払サイクル（月数）',
  '引落口座貯金種目',
  '引落口座支店コード',
  '引落口座支店名',
  '引落口座番号',
  '引落口座名義',
  '購読者層分類',
  'かつJAグループ役職員',
  '農業関係',
  '読者属性（その他の内容）',
  '農業者分類',
  '主な生産物（その他の内容）',
  '購読開始日',
  '備考',
] as const;

/**
 * テンプレート同梱のサンプル行（2行目、IMPORT_TEMPLATE_HEADERS 順）。全列の期待
 * フォーマットを示す完全記入例 — 新規(NEW)、口座引落(1)+引落口座一式、購読者情報と
 * 同じ=FALSE+配達先一式、email あり（紙版/電子版とも有効）、ひらがなかな、郵便番号
 * 7桁、連絡先は数字のみ、日付は YYYY-MM-DD。
 * 購読種別（電子版/紙版）・読者情報変更適用日・購読中止日は画面で指定するため列は無い。
 * 意図的に空欄（空が正しい値）:
 *   - ID       : UPDATE のキー。新規は必ず空。
 * FK コード列（管理支店/支店/新聞単価/販売店コード）は placeholder コード。顧客が
 * 自組織のマスタコード（IDでなく）に書き換えてから取込む。備考にも記載。
 */
const IMPORT_TEMPLATE_SAMPLE_ROW: readonly (string | number)[] = [
  '', // ID (UPDATE のキー — 新規は空のまま)
  'KS01', // 管理支店 (管理支店コード — 自組織のコードに書き換え)
  'SH01', // 支店 (支店コード — 自組織のコードに書き換え)
  'SAMPLE001', // 組合員コード (サンプル — 既存コードと衝突しない値)
  '農業', // 購読者氏名_氏
  '太郎', // 購読者氏名_名
  'のうぎょう', // 購読者かな_氏 (ひらがな)
  'たろう', // 購読者かな_名 (ひらがな)
  1, // 購読部数
  'TANKA01', // 新聞単価 (単価コード — 自組織のコードに書き換え)
  'taro@example.com', // メールアドレス (電子版・併読は必須)
  1, // メールマガジン (1:配信する)
  1980, // 生年（西暦）
  1, // 性別 (1:男性 / 2:女性 / 9:回答しない)
  '1000001', // 郵便番号 (半角数字7桁・ハイフンなし)
  '13', // 都道府県 (JISコード 01〜47)
  '千代田区', // 市町村郡
  '千代田1-1-1', // 丁目番地
  'サンプルマンション101', // マンション・アパート名
  '0312345678', // 連絡先１ (半角数字・ハイフンなし)
  '09012345678', // 連絡先２ (半角数字・ハイフンなし)
  'FALSE', // 購読者情報と同じ (FALSE:配達先を別途入力 / TRUE:配達先列は空でよい)
  '1500001', // 郵便番号(配達先) (7桁)
  '13', // 都道府県(配達先)
  '渋谷区', // 市町村郡(配達先)
  '神宮前1-1-1', // 丁目番地(配達先)
  'サンプルビル201', // ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)
  '0311112222', // 連絡先１(配達先)
  '09033334444', // 連絡先２(配達先)
  '配達', // 配達先苗字（漢字）
  '花子', // 配達先名前（漢字）
  'はいたつ', // 配達先苗字（かな・ひらがな）
  'はなこ', // 配達先名前（かな・ひらがな）
  'HAN01', // 販売店コード (販売店コード — 自組織のコードに書き換え)
  '1', // 郵送区分 (0:空 / 1:郵送)
  1, // 支払方法 (1:口座引落 / 2:現金集金 / 3:振込集金 …)
  1, // 購読料支払サイクル（月数）
  1, // 引落口座貯金種目 (1:普通 / 2:当座)
  '001', // 引落口座支店コード (半角数字3桁)
  'サンプル支店', // 引落口座支店名
  '1234567', // 引落口座番号
  'ノウギョウ タロウ', // 引落口座名義
  '0', // 購読者層分類 (自組織の分類コード)
  'TRUE', // かつJAグループ役職員 (購読者層分類=0:農業者 のときのみ有効)
  'FALSE', // 農業関係 (購読者層分類=2:企業・団体 のときのみ有効)
  '', // 読者属性（その他の内容）(購読者層分類=999:その他 のときのみ入力)
  '0', // 農業者分類 (自組織の分類コード)
  '', // 主な生産物（その他の内容）(農業者分類に 999:その他 を含むときのみ入力)
  '2026-04-01', // 購読開始日 (YYYY-MM-DD)
  'サンプル行です。管理支店・支店・新聞単価・販売店コードは自組織のマスタコードに書き換えてからインポートしてください。', // 備考
] as const;

/** ACSMS-SCR-016 import — 取込ファイル名 (api.md §レスポンスヘッダ). */
const IMPORT_TEMPLATE_FILENAME = '購読者Excelデータ取込_テンプレート.xlsx';

/**
 * ACSMS-SCR-016 — 更新モードで編集不可の物理カラム。購読種別・購読開始日は登録時のみ
 * 設定可、更新では既存値維持（ACSMS-SCR-011 編集画面の pin と同ルール）。
 * FE は更新モードで未チェック＋disable、BE は selected_columns から除外。
 *
 * 氏名4列（shimei_sei / shimei_mei / shimei_kana_sei / shimei_kana_mei）は
 * **更新可**（顧客要件 2026-07）。ACSMS-SCR-011 の編集画面が既に氏名の変更を許可して
 * おり（UpdateDokusyaDto は CreateDokusyaDto の必須+書式検証をそのまま継承）、
 * 取込だけ不可だと同じ改姓を画面からはできて Excel からはできない不整合になる。
 * 紙版・電子版のどちらでも同じ扱い。
 */
const IMPORT_EDIT_IMMUTABLE_COLUMNS: ReadonlySet<string> = new Set([
  'dokusya_shubetsu',
  'dokusya_kaishi_date',
]);

/** ACSMS-SCR-016 — クライアントへ返す行エラー上限（api.md §4.1）。 */
const IMPORT_ERROR_CAP = 10;

/** ACSMS-SCR-016 — 取込最大行数（api.md §4.1）。 */
const IMPORT_MAX_ROWS = 5000;

/**
 * 取込モード → 監査ログ operation ラベル（api.md §4.5）。バッチ操作なので
 * bare-verb ルールの例外。販売店取込 (ACSMS-SCR-019) と同一ラベルで統一。
 */
const IMPORT_OPERATION_BY_MODE: Record<'NEW' | 'UPDATE', AuditOperation> = {
  NEW: AuditOperation.IMPORT_NEW,
  // UPDATE は選択列のみ更新（partial 相当）。監査 operation は既存
  // IMPORT_UPDATE_PARTIAL を再利用（過去ログ互換のため enum は変えない）。
  UPDATE: AuditOperation.IMPORT_UPDATE_PARTIAL,
};


/**
 * ACSMS-SCR-016 — 購読者Excelデータ取込（テンプレートDL + 一括取込）サービス。
 *
 * DokusyaService から Excel-IMPORT concern を切り出したもの。取込専用処理
 * （テンプレート生成・行バリデーション・INSERT/UPDATE・履歴スナップショット）を
 * 集約し、DokusyaService は facade として本サービスへ薄く委譲する。
 *
 * rireki 共通ヘルパー（lockDokusyaRow / nextRirekiNo / writeRirekiSplit）は UI
 * 登録/更新フロー（DokusyaService）と完全共有。step C で共有リーフサービス
 * DokusyaRirekiService へ切り出し直接 inject（取込と UI で履歴生成を完全一致させる
 * ため）。step B の facade↔取込 forwardRef 循環もこれで解消。
 */
@Injectable()
export class DokusyaImportService {
  private readonly logger = new Logger(DokusyaImportService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
    private readonly accountFlags: DokusyaAccountFlagService,
    private readonly rireki: DokusyaRirekiService,
    private readonly validator: DokusyaImportValidator,
    private readonly denshiPush: DenshibanPushService,
  ) {}

  async downloadImportTemplate(
    _session: SessionPayload,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'agrinews';
    const sheet = workbook.addWorksheet('購読者');
    sheet.addRow([...IMPORT_TEMPLATE_HEADERS]);
    // 2行目 — サンプル行（顧客が実利用前に書き換え。FK コードの有効値はテナント依存）。
    sheet.addRow([...IMPORT_TEMPLATE_SAMPLE_ROW]);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    sheet.columns = IMPORT_TEMPLATE_HEADERS.map(() => ({ width: 18 }));
    const buf = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    return { buffer, filename: IMPORT_TEMPLATE_FILENAME };
  }

  // ─── ACSMS-API-016-002 — POST /api/v1/dokusya/import ──────────────────────────
  /**
   * 購読者行を1トランザクションで一括取込（api.md §4.4）。
   *
   * モード: NEW（各行 INSERT）、UPDATE（selected_columns のみ・空欄はスキップ、
   * 全列指定で全更新）、一括中止（tetsuzuki_shurui=0 + kumiaiin_code → 解約）。
   *
   * バリデーション順（全てトランザクション前）:
   *   §4.1 top-level — import_mode / NEW 必須列 / 行数上限。
   *   §4.1 per-row — dokusya_shubetsu 1|2、電子版×クレカ、dokusya_busu、
   *        gender / yokin 文言→code。
   *   §4.3 事前チェック（dataSource.query）— tanka/hanbaiten/kanri_shiten/shiten
   *        存在、UPDATE_* / 一括中止 の既存 dokusya（エラーは10件で丸め →
   *        IMPORT_VALIDATION_ERROR）。
   *   §4.2/§4.3 DataScope — スコープ外の既存レコード → 403。
   *
   * 事前チェック後: 1 dataSource.transaction で全 INSERT/UPDATE + rireki 行 +
   * 監査1行（bare 'CREATE'）を包む。エラーログはロールバック外で出す。
   */
  async importExcel(
    dto: ImportDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{
    data: {
      import_mode: string;
      total_rows: number;
      created_count: number;
      updated_count: number;
      cancelled_count: number;
      skipped_count: number;
      rireki_count: number;
      imported_at: string;
    };
    message: string;
  }> {
    // 紙版・電子版いずれの取扱い権限も無いアカウントはExcel取込不可
    // (account_concept.md §139-145).
    await this.accountFlags.assertAnyDokusyaFlag(session);

    // 購読種別は画面ラジオ（紙版/電子版）で選ぶ取込モード（顧客要件 2026-07）。Excel 列
    // ではないため全行へ一律適用してから検証・登録（既存の per-row shubetsu ロジック=
    // 検証/entity build/部数固定 を流用）。NEW は種別を設定、UPDATE は既存値と一致検証。
    for (const row of dto.rows) {
      row.dokusya_shubetsu = dto.dokusya_shubetsu;
    }

    // §4.1 — 行数上限（多層防御。DTO @ArrayMaxSize でも防ぐ）。
    if (dto.rows.length > IMPORT_MAX_ROWS) {
      throw new DokusyaRowLimitExceededException();
    }

    // §4.1 — NEW モードは必須13列を含むこと。
    this.validator.assertNewModeRequiredColumns(dto);
    // 適用日 / 中止日は payload 単位（1ファイル1つ・顧客要件 2026-08）。行ループの
    // 前に見る — 行ごとに出すと同じ内容のエラーが行数ぶん並ぶ。
    this.validator.assertPayloadDates(dto);

    const jaId = Number(session.ja_id ?? 0);
    const errors: Array<{ row: number; field: string; message: string }> = [];

    // §4.3 — FK 解決 + 既存購読者ロード（ja_id スコープ）をまとめて行う。
    const { lookups, fkMaps } = await this.buildImportLookups(dto, jaId);

    // 解約(手続種類=0)は取込で扱わない（顧客要件 2026-06。cancelled_count は常に 0）。
    const cancelledCount = 0;

    const { createdCount, updatedCount } = this.validator.validateImportRows(
      dto,
      lookups,
      session,
      errors,
    );

    if (errors.length > 0) {
      // バリデーション失敗の内訳をログに残す（どの行・項目で弾かれたかを運用ログ
      // から追える。errors[] はレスポンスにも返るが画面で握りつぶされた場合の調査用）。
      this.logger.warn({
        event: 'import.validation_failed',
        import_mode: dto.import_mode,
        total_rows: dto.rows?.length ?? 0,
        error_count: errors.length,
        errors: errors.slice(0, IMPORT_ERROR_CAP),
      });
      throw new DokusyaImportValidationException(errors.slice(0, IMPORT_ERROR_CAP));
    }

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR016,
      TABLE_NAME,
      null,
    );
    const importedAt = new Date().toISOString();

    // 取込はバッチ操作 — モード別 prefixed ラベル（IMPORT_NEW / IMPORT_UPDATE_PARTIAL）。
    // bare-verb ルールの例外（api.md §4.5。単一 INSERT と一括取込を t_log で区別）。
    // UPDATE は partial 相当のため既存 IMPORT_UPDATE_PARTIAL を再利用（過去ログ互換）。
    const importOperation = IMPORT_OPERATION_BY_MODE[dto.import_mode];

    // 一括中止で電子版へ cancel を送った会員ID。tx の外に置く — ロールバックしても
    // 「既に送ってしまった」事実は消えないので、補償 push の対象として残す必要がある。
    const pushedKaiinIds: number[] = [];

    try {
      await this.dataSource.transaction(async (manager) => {
        // Phase 2 — cloud 側の DML を全行ぶん。一括中止の push はここでは送らず、
        // 後段でまとめて送る（送信済みの記録を tx の外に残すため）。
        const pendingStopPushes: Array<{ after: Dokusya }> = [];
        for (const row of dto.rows) {
          await this.applyImportRow(
            manager,
            dto,
            row,
            session,
            fkMaps,
            pendingStopPushes,
          );
        }

        // Phase 3 — 一括中止の電子版連携。1件でも失敗すれば例外が上へ抜け、
        // tx はロールバックされる（＝cloud 側は無かったことになる）。
        // 紙版は pushOnWrite が対象外として false を返すので何も送られない。
        await this.pushBulkStops(
          manager,
          dto,
          pendingStopPushes,
          pushedKaiinIds,
        );

        // §4.5 — 取込1回につき集約監査1行、tx に参加。
        await this.auditLog.logOperation(
          {
            logType: LogType.USER_OPERATION,
            accountId: auditCtx.accountId,
            jaId: auditCtx.jaId,
            gamenName: auditCtx.screen,
            operation: importOperation,
            resultStatus: ResultStatus.SUCCESS,
            targetId: null,
            targetTable: auditCtx.table,
            afterValue: JSON.stringify({
              import_mode: dto.import_mode,
              total_rows: dto.rows.length,
              created_count: createdCount,
              updated_count: updatedCount,
              cancelled_count: cancelledCount,
              imported_at: importedAt,
            }),
            ipAddress: auditCtx.ipAddress,
            userAgent: auditCtx.userAgent,
          },
          manager,
        );
      });
    } catch (err) {
      // Phase 4b — cloud 側はロールバック済み。だが既に電子版へ送った cancel は
      // 取り消されないので、送った分へ補償（cancel_ym 空 ＝ 解約予約の取消）を投げる。
      // これをしないと「電子版では解約・cloud では購読中」という乖離が残る。
      await this.compensateBulkStops(pushedKaiinIds, auditCtx);
      // §4.7 — エラーログは standalone 接続（manager なし）でロールバックを生き残らせる。
      await this.auditLog.logError(auditCtx, importOperation, err as Error);
      throw err;
    }

    return {
      data: {
        import_mode: dto.import_mode,
        total_rows: dto.rows.length,
        created_count: createdCount,
        updated_count: updatedCount,
        cancelled_count: cancelledCount,
        skipped_count: 0,
        rireki_count: dto.rows.length,
        imported_at: importedAt,
      },
      message: '取り込みました。',
    };
  }

  /**
   * 一括中止 Phase 3 — 予約を入れた行を電子版へ cancel として送る（顧客要件 2026-08）。
   *
   * 行ループの中で送らないのは、途中失敗したときに「どこまで送ったか」を tx の外へ
   * 残す必要があるため。tx 内のローカル変数に積むと、ロールバックと一緒に呼び出し側の
   * catch から見えなくなる。
   *
   * 1件でも失敗すれば例外がそのまま上へ抜け tx がロールバックする。cloud 側は
   * 無かったことになるが、それまでに送った分は `pushedKaiinIds` に残り
   * {@link compensateBulkStops} が打ち消す。
   *
   * 紙版は `pushOnWrite` が対象外として false を返すので、この関数を通っても
   * 何も送られず `pushedKaiinIds` も空のまま（＝補償も no-op）。種別の分岐を
   * ここに書かないのは、対象判定を isPushTarget の一箇所に保つため。
   */
  private async pushBulkStops(
    manager: EntityManager,
    dto: ImportDokusyaDto,
    targets: ReadonlyArray<{ after: Dokusya }>,
    pushedKaiinIds: number[],
  ): Promise<void> {
    if (targets.length === 0) return;
    const chushi = dbDateOrNull(dto.dokusya_chushi_date);
    if (!chushi) return;
    const cancelYm = chushi.replaceAll('-', '').slice(0, 6);

    for (const t of targets) {
      const pushed = await this.denshiPush.pushOnWrite(manager, {
        action: 'cancel',
        after: t.after,
        source: 'IMPORT',
        cancelYm,
      });
      // 送れた分だけ控える。会員IDが無い（電子版に未登録）行は push 自体が
      // skip されるので補償対象にもならない。
      if (pushed && t.after.denshiKaiinId != null) {
        pushedKaiinIds.push(Number(t.after.denshiKaiinId));
      }
    }
  }

  /**
   * 一括中止 Phase 4b — ロールバック後の補償。送信済みの解約予約を打ち消す。
   *
   * 電子版APIには「解約取消」専用の処理区分が無いため、ACSMS-SCR-014 の予約取消と同じく
   * `cancel` に空の `cancel_ym` を送る（顧客判断 2026-08）。
   *
   * 補償そのものが失敗した分は救えない。握りつぶすと「電子版だけ解約済み」の会員が
   * 誰か分からなくなるので、必ず ERROR ログに会員IDを残す（運用が手で戻すための唯一の
   * 手がかり）。補償の失敗で元の例外を差し替えないよう、ここでは throw しない。
   */
  private async compensateBulkStops(
    pushedKaiinIds: readonly number[],
    auditCtx: ReturnType<typeof buildAuditCtx>,
  ): Promise<void> {
    if (pushedKaiinIds.length === 0) return;
    this.logger.warn(
      `bulk-stop rollback: compensating ${pushedKaiinIds.length} pushed cancel(s)`,
    );

    const failed: number[] = [];
    for (const kaiinId of pushedKaiinIds) {
      try {
        await this.denshiPush.push(
          this.dataSource.manager,
          'cancel',
          { denshiKaiinId: kaiinId } as Dokusya,
          { cancelYm: '' },
        );
      } catch {
        failed.push(kaiinId);
      }
    }

    if (failed.length > 0) {
      const detail = `電子版で解約予約が残った可能性のある会員ID: ${failed.join(', ')}`;
      this.logger.error(`bulk-stop compensation failed — ${detail}`);
      await this.auditLog.logError(
        auditCtx,
        AuditOperation.IMPORT_UPDATE_PARTIAL,
        new Error(`一括中止の補償に失敗しました。${detail}`),
      );
    }
  }

  /**
   * §4.3 — 取込対象行の FK コードを ja_id スコープで一括解決し、行バリデーション
   * 用の lookups（存在 Set / コード→id / 既存購読者 Map）と、書込み用の fkMaps
   * （コード→物理id）を組み立てる。
   */
  private async buildImportLookups(
    dto: ImportDokusyaDto,
    jaId: number,
  ): Promise<{
    lookups: ImportRowLookups;
    fkMaps: {
      tankaIdByCode: Map<string, number>;
      hanbaitenIdByCode: Map<string, number>;
      kanriShitenIdByCode: Map<string, number>;
      shitenIdByCode: Map<string, number>;
    };
  }> {
    const tankaCodes = this.uniqueStrings(dto.rows.map((r) => r.tanka_code));
    const hanbaitenCodes = this.uniqueStrings(
      dto.rows.map((r) => r.hanbaiten_code),
    );
    const kanriShitenCodes = this.uniqueStrings(
      dto.rows.map((r) => r.kanri_shiten_code),
    );
    const shitenCodes = this.uniqueStrings(dto.rows.map((r) => r.shiten_code));
    const dokusyaIds = this.uniqueNumbers(dto.rows.map((r) => r.dokusya_id));
    const kumiaiinCodes = this.uniqueStrings(
      dto.rows.map((r) => r.kumiaiin_code),
    );

    const tankaRows: Array<Record<string, unknown>> =
      tankaCodes.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT tanka_id, tanka_code FROM m_tanka
              WHERE ja_id = $1 AND tanka_code = ANY($2::text[])
                AND tanka_type = ${TANKA_TYPE_KODOKU} AND deleted_at IS NULL`,
            [jaId, tankaCodes],
          );
    const tankaCodeSet = new Set(tankaRows.map((r) => String(r.tanka_code)));
    // code → id マップ。NEW INSERT が解決済み FK id を保存（t_dokusya は
    // tanka_id / hanbaiten_id を持ちコードは持たない）。
    const tankaIdByCode = new Map(
      tankaRows.map((r) => [String(r.tanka_code), Number(r.tanka_id)]),
    );

    const hanbaitenRows: Array<Record<string, unknown>> =
      hanbaitenCodes.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT hanbaiten_id, hanbaiten_code FROM m_hanbaiten
              WHERE ja_id = $1 AND hanbaiten_code = ANY($2::text[])
                AND deleted_at IS NULL`,
            [jaId, hanbaitenCodes],
          );
    const hanbaitenCodeSet = new Set(
      hanbaitenRows.map((r) => String(r.hanbaiten_code)),
    );
    const hanbaitenIdByCode = new Map(
      hanbaitenRows.map((r) => [
        String(r.hanbaiten_code),
        Number(r.hanbaiten_id),
      ]),
    );

    const kanriShitenRows: Array<Record<string, unknown>> =
      kanriShitenCodes.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT kanri_shiten_id, kanri_shiten_code FROM m_kanri_shiten
              WHERE ja_id = $1 AND kanri_shiten_code = ANY($2::text[])
                AND deleted_at IS NULL`,
            [jaId, kanriShitenCodes],
          );
    const kanriShitenCodeSet = new Set(
      kanriShitenRows.map((r) => String(r.kanri_shiten_code)),
    );
    // code → id マップ。INSERT/UPDATE が kanri_shiten_id を保存（t_dokusya は
    // id FK、取込はコードを持つ）。
    const kanriShitenIdByCode = new Map(
      kanriShitenRows.map((r) => [
        String(r.kanri_shiten_code),
        Number(r.kanri_shiten_id),
      ]),
    );

    const shitenRows: Array<Record<string, unknown>> =
      shitenCodes.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT shiten_id, shiten_code FROM m_shiten
              WHERE ja_id = $1 AND shiten_code = ANY($2::text[])
                AND deleted_at IS NULL`,
            [jaId, shitenCodes],
          );
    const shitenCodeSet = new Set(
      shitenRows.map((r) => String(r.shiten_code)),
    );
    const shitenIdByCode = new Map(
      shitenRows.map((r) => [String(r.shiten_code), Number(r.shiten_id)]),
    );

    // §4.3.4 — 既存 dokusya（UPDATE_* / 一括中止）。dokusya_id or kumiaiin_code キー、
    // ja_id スコープ。
    const existingRows: Array<Record<string, unknown>> =
      dokusyaIds.length === 0 && kumiaiinCodes.length === 0
        ? []
        : await this.dataSource.query(
            // 帳票影響項目（REPORT_FIELD_PAIRS の12項目）も読む。当日変更の制限判定
            // (collectTodayModeReportViolations) は「既存値と違うか」で判断するため、
            // 既存値が無いと Excel 側の値が undefined と比較され、値が同じ行でも
            // 常に「変更あり」になってしまう（＝紙版の当日取込が理由なく弾かれる）。
            `SELECT dokusya_id, kumiaiin_code, ja_id, kanri_shiten_id, shiten_id,
                    dokusya_shubetsu, email, hanbaiten_id,
                    dokusya_kaishi_date, dokusya_chushi_date, seikyu_kaishi_month,
                    dokusya_busu,
                    yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
                    haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson,
                    haitatsu_chome_banchi, haitatsu_tatemono_mei
               FROM t_dokusya
              WHERE ja_id = $1
                AND (dokusya_id = ANY($2::bigint[])
                     OR kumiaiin_code = ANY($3::text[]))
                AND deleted_at IS NULL`,
            [jaId, dokusyaIds, kumiaiinCodes],
          );
    // 顧客要件 2026-08（#56568）— メール一意性は電子版(2)・併読(3) レコード間で
    // **JA を跨いで全件**担保する（電子版ではメールが会員の同定キーのため）。
    // 紙版は重複可で対象外。論理削除済みは再利用できるので除外。
    // NEW 行が既存電子版メールを再利用するケースも検知できるよう全件読む。
    const digitalEmailRows: Array<Record<string, unknown>> =
      await this.dataSource.query(
        `SELECT dokusya_id, email
           FROM t_dokusya
          WHERE dokusya_shubetsu = ANY($1::int[])
            AND email <> ''
            AND deleted_at IS NULL`,
        [[DokusyaShubetsu.DIGITAL, DokusyaShubetsu.BOTH]],
      );
    const existingDigitalEmailToIds = new Map<string, Set<number>>();
    for (const r of digitalEmailRows) {
      const email = String(asScalar(r.email));
      const id = Number(r.dokusya_id);
      const set = existingDigitalEmailToIds.get(email);
      if (set) set.add(id);
      else existingDigitalEmailToIds.set(email, new Set([id]));
    }

    const existingById = new Map<number, Record<string, unknown>>();
    const existingByKumiaiin = new Map<string, Record<string, unknown>>();
    // 組合員コードは重複可。kumiaiin_code キーで更新/解約時に複数ヒットすると
    // 一括誤更新するため、件数を数え 2 件以上なら行エラー（ID 指定を促す）。
    const kumiaiinCounts = new Map<string, number>();
    for (const row of existingRows) {
      existingById.set(Number(row.dokusya_id), row);
      if (row.kumiaiin_code != null) {
        const code = String(asScalar(row.kumiaiin_code));
        existingByKumiaiin.set(code, row);
        kumiaiinCounts.set(code, (kumiaiinCounts.get(code) ?? 0) + 1);
      }
    }

    const lookups: ImportRowLookups = {
      existingById,
      existingByKumiaiin,
      kumiaiinCounts,
      tankaCodeSet,
      hanbaitenCodeSet,
      hanbaitenIdByCode,
      kanriShitenCodeSet,
      shitenCodeSet,
      existingDigitalEmailToIds,
      hasCode: (category, value) => this.codeService.has(category, value),
    };

    return {
      lookups,
      fkMaps: {
        tankaIdByCode,
        hanbaitenIdByCode,
        kanriShitenIdByCode,
        shitenIdByCode,
      },
    };
  }

  // ─── private helpers (SCR-016) ───────────────────────────────────────

  /** 列投影からユニークな非空文字列。 */
  private uniqueStrings(values: Array<string | undefined>): string[] {
    return Array.from(
      new Set(values.filter((v): v is string => typeof v === 'string' && v !== '')),
    );
  }

  /** 列投影からユニークな有効数値。 */
  private uniqueNumbers(values: Array<number | undefined>): number[] {
    return Array.from(
      new Set(
        values
          .filter((v): v is number => v !== undefined && v !== null)
          .map(Number),
      ),
    );
  }

  /**
   * 行の m_code 項目（数値コード or 顧客編集可の日本語ラベル）を保存用の数値コードへ
   * 変換。ラベルは CodeService で解決するため m_code.code_name を改名してもコード改修
   * なしで取込継続（ハードコード label→code マップ無し）。空欄は null、既にコードなら
   * そのまま Number(value)。
   */
  private toMCodeValue(
    category: string,
    value: MCodeInput,
  ): number | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return value;
    const byLabel = this.codeService.getValueByLabel(category, value);
    if (byLabel !== null) return Number(byLabel);
    return Number(value);
  }

  private toGenderCode(value: MCodeInput): number | null {
    return this.toMCodeValue('GENDER', value);
  }

  private toYokinCode(value: MCodeInput): number | null {
    return this.toMCodeValue('YOKIN_SHUBETSU', value);
  }

  /**
   * manager.query(… RETURNING dokusya_id) の結果から dokusya_id を取り出す。
   * TypeORM query() は INSERT…RETURNING で行配列、UPDATE/DELETE…RETURNING で
   * [行配列, 影響件数] を返す。後者では result[0] が「行」でなく「行配列」になり
   * result[0].dokusya_id が undefined → 履歴(t_dokusya_rireki)が作られない不具合が
   * あった。両形状を吸収し UPDATE が1件でもヒットすれば必ず履歴を作る。
   */
  private extractReturnedDokusyaId(result: unknown): number | null {
    if (!Array.isArray(result)) return null;
    const head = result[0];
    // UPDATE/DELETE…RETURNING: [rows, affectedCount] → head は行配列。
    // INSERT…RETURNING: [row, …] → head は行オブジェクト。
    const row = Array.isArray(head) ? head[0] : head;
    const id = (row as { dokusya_id?: unknown } | undefined)?.dokusya_id;
    return id === undefined || id === null ? null : Number(id) || null;
  }

  /**
   * 配達先7項目のいずれかに値があるかを判定。取込テンプレートに「配達先＝購読者
   * 住所と同じか」の per-row flag が無いため、配達先項目に入力があれば「別住所」とみなす:
   *   - haitatsu_same_flg を false（配達先 ≠ 購読者住所）
   *   - zougen_hokoku_flg を true（配達先変更は増減報告対象）
   * selectedColumns 指定時（UPDATE）は選択列のみ判定 — 未選択＝未書込みの配達先列の
   * 誤検知を防ぐため。
   */
  private hasHaitatsuDeliveryData(
    row: ImportDokusyaRowDto,
    selectedColumns?: string[],
  ): boolean {
    const HAITATSU_DELIVERY_FIELDS: Array<keyof ImportDokusyaRowDto> = [
      'haitatsu_yubin_no',
      'haitatsu_todofuken_code',
      'haitatsu_shikuchoson',
      'haitatsu_shimei_sei',
      'haitatsu_shimei_mei',
      'haitatsu_shimei_kana_sei',
      'haitatsu_shimei_kana_mei',
    ];
    const selected = selectedColumns ? new Set(selectedColumns) : null;
    return HAITATSU_DELIVERY_FIELDS.some((field) => {
      if (selected && !selected.has(field)) return false;
      const value = row[field];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });
  }

  /**
   * NEW 取込行の CREATE `values` を構築（create フロー列集合の写し — 参照
   * DokusyaService.buildInsertPayload）。FK コード列は事前マップで物理 *_id へ解決。
   * 空欄 varchar → ''（NOT NULL）、空欄 int/FK → null。joho_henko_tekiyo_date は
   * 購読開始日に揃える（顧客要件 — UI create と異なり当日ではない）。
   */
  private buildNewImportValues(
    row: ImportDokusyaRowDto,
    session: SessionPayload,
    fkMaps: {
      tankaIdByCode: Map<string, number>;
      hanbaitenIdByCode: Map<string, number>;
      kanriShitenIdByCode: Map<string, number>;
      shitenIdByCode: Map<string, number>;
    },
    sameFlg: boolean,
    updatedBy: string,
  ): { values: DokusyaFields; johoDate: string } {
    const str = (v: unknown): string =>
      v === undefined || v === null ? '' : String(asScalar(v));
    const intOrNull = (v: unknown): number | null =>
      v === undefined || v === null || v === '' ? null : Number(v);
    const kaishiDate = normalizeDbDate(str(row.dokusya_kaishi_date));
    const values: DokusyaFields = {
      jaId: Number(session.ja_id ?? 0),
      kanriShitenId:
        fkMaps.kanriShitenIdByCode.get(str(row.kanri_shiten_code)) ?? null,
      shitenId: fkMaps.shitenIdByCode.get(str(row.shiten_code)) ?? null,
      kumiaiinCode: str(row.kumiaiin_code),
      dokusyaShubetsu: intOrNull(row.dokusya_shubetsu),
      // NEW は手続種類=新規(1)固定（顧客要件 2026-06）。
      tetsuzukiShurui: TetsuzukiShurui.SHINKI,
      shimeiSei: str(row.shimei_sei),
      shimeiMei: str(row.shimei_mei),
      shimeiKanaSei: str(row.shimei_kana_sei),
      shimeiKanaMei: str(row.shimei_kana_mei),
      dokusyaBusu: Number(row.dokusya_busu ?? 0),
      yubinNo: str(row.yubin_no),
      todofukenCode: str(row.todofuken_code),
      shikuchoson: str(row.shikuchoson),
      chomeBanchi: str(row.chome_banchi),
      tatemonoMei: str(row.tatemono_mei),
      renrakusaki1: str(row.renrakusaki_1),
      renrakusaki2: str(row.renrakusaki_2),
      email: str(row.email),
      mailMagazineFlg: Number(row.mail_magazine_flg ?? MAIL_MAGAZINE_FLG_OFF),
      birthYear: intOrNull(row.birth_year),
      gender: this.toGenderCode(row.gender),
      haitatsuSameFlg: sameFlg,
      haitatsuYubinNo: str(row.haitatsu_yubin_no),
      haitatsuTodofukenCode: str(row.haitatsu_todofuken_code),
      haitatsuShikuchoson: str(row.haitatsu_shikuchoson),
      haitatsuChomeBanchi: str(row.haitatsu_chome_banchi),
      haitatsuTatemonoMei: str(row.haitatsu_tatemono_mei),
      haitatsuRenrakusaki1: str(row.haitatsu_renrakusaki_1),
      haitatsuRenrakusaki2: str(row.haitatsu_renrakusaki_2),
      haitatsuShimeiSei: str(row.haitatsu_shimei_sei),
      haitatsuShimeiMei: str(row.haitatsu_shimei_mei),
      haitatsuShimeiKanaSei: str(row.haitatsu_shimei_kana_sei),
      haitatsuShimeiKanaMei: str(row.haitatsu_shimei_kana_mei),
      hanbaitenId:
        fkMaps.hanbaitenIdByCode.get(str(row.hanbaiten_code)) ?? null,
      tankaId: fkMaps.tankaIdByCode.get(str(row.tanka_code)) ?? null,
      yubinKubun: row.yubin_kubun ?? YUBIN_KUBUN_NASHI,
      shiharaiHoho: intOrNull(row.shiharai_hoho),
      dokusyaryoShiharaiCycle: intOrNull(row.dokusyaryo_shiharai_cycle),
      bankBranchCode: str(row.bank_branch_code),
      bankBranchName: str(row.bank_branch_name),
      hikiotoshiYokinShubetsu: this.toYokinCode(row.hikiotoshi_yokin_shubetsu),
      hikiotoshiKozaNo: str(row.hikiotoshi_koza_no),
      hikiotoshiKozaMeigi: str(row.hikiotoshi_koza_meigi),
      // 分類まわり 6 項目は画面登録(SCR-011)と同じゲートを通す。従属 4 項目は
      // 親の分類が条件コードを含むときだけ値を持てる（列 COMMENT の
      // 「〜の場合のみ設定可 / 入力可」）。取込だけ素通しにすると、画面では
      // 作れない組合せが Excel から入り、しかもその組合せは電子版 push で
      // V26〜V30 に当たって同期できない読者になる。
      ...buildBunruiPayload({
        dokusyaso_bunrui: str(row.dokusyaso_bunrui),
        ja_yakushokuin_flg: row.ja_yakushokuin_flg,
        nogyo_kankei_flg: row.nogyo_kankei_flg,
        dokusyaso_bunrui_sonota: str(row.dokusyaso_bunrui_sonota),
        nogyosya_bunrui: str(row.nogyosya_bunrui),
        nogyosya_bunrui_sonota: str(row.nogyosya_bunrui_sonota),
      }),
      shokiDokusyaKaishiDate: kaishiDate,
      dokusyaKaishiDate: kaishiDate,
      // NEW は購読中止日を持たない（画面で新規登録時は入力不可・顧客要件 2026-08）。
      // 一括中止は UPDATE 側の専用経路が担う。
      dokusyaChushiDate: null,
      johoHenkoTekiyoDate: kaishiDate,
      biko: str(row.biko),
      // 電子版(2)は承認済(1)で取込む（紙版は null）。Excel一括取込は職員操作の
      // ため承認済で登録する（create() の電子版 承認待ち(0) とは異なる方針）。
      denshiShoninStatus:
        Number(row.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL
          ? DenshiShoninStatus.APPROVED
          : null,
      createdBy: updatedBy,
    };
    // updated_by は t_dokusya の NOT NULL 列だが DokusyaRireki には無く DokusyaFields
    // 型に載らない。ensureMaster の master INSERT で必要なため runtime 付与（UI create
    // の buildInsertPayload と同扱い）。
    (values as Record<string, unknown>).updatedBy = updatedBy;
    return { values, johoDate: kaishiDate };
  }

  /**
   * UPDATE 取込行の対象 dokusya_id を呼出元 JA 内で解決（dokusya_id 優先、なければ
   * kumiaiin_code）。該当なしは null（履歴スキップ＝旧 RETURNING null と同義）。
   * 行存在は上流で検証済みのため miss は通常経路でない。
   */
  private async resolveImportTargetId(
    manager: EntityManager,
    jaId: number,
    row: ImportDokusyaRowDto,
  ): Promise<number | null> {
    const kumiaiin =
      row.kumiaiin_code === undefined || row.kumiaiin_code === null
        ? ''
        : String(asScalar(row.kumiaiin_code));
    const found = await manager.query<Array<{ dokusya_id?: number }>>(
      `SELECT dokusya_id FROM t_dokusya
        WHERE ja_id = $1::int AND deleted_at IS NULL
          AND (($2::bigint IS NOT NULL AND dokusya_id = $2::bigint)
               OR ($3 <> '' AND kumiaiin_code = $3))
        LIMIT 1`,
      [jaId, row.dokusya_id ?? null, kumiaiin],
    );
    return this.extractReturnedDokusyaId(found);
  }

  /**
   * UPDATE 取込行の UPDATE `values` を構築（api.md §4.4.3）。書込み可能な物理列に
   * 対応する selected_columns のみ載せ、未選択列は省略＝applyChange が前値を維持。
   * 編集不可列（{@link IMPORT_EDIT_IMMUTABLE_COLUMNS}）と dokusya_id（キー）は書かない。
   * FK コード列は物理 *_id へ解決し値がある時のみ設定（空欄→既存維持）。
   * joho_henko_tekiyo_date は適用日パラメータで業務値ではない（販売店適用日
   * hanbaiten_tekiyo_date は廃止・顧客要件 2026-07）。
   */
  private buildUpdatePartialValues(
    selectedColumns: string[],
    row: ImportDokusyaRowDto,
    fkMaps: {
      tankaIdByCode: Map<string, number>;
      hanbaitenIdByCode: Map<string, number>;
      kanriShitenIdByCode: Map<string, number>;
      shitenIdByCode: Map<string, number>;
    },
  ): DokusyaFields {
    const str = (v: unknown): string =>
      v === undefined || v === null ? '' : String(asScalar(v));
    const intOrNull = (v: unknown): number | null =>
      v === undefined || v === null || v === '' ? null : Number(v);
    const str_ = (k: keyof ImportDokusyaRowDto) => () => str(row[k]);
    const MAP = this.buildImportColumnMap(row, fkMaps, str, intOrNull, str_);

    const values: DokusyaFields = {};
    const out = values as Record<string, unknown>;
    for (const col of selectedColumns) {
      if (col === 'dokusya_id') continue; // キー、書込まない
      if (IMPORT_EDIT_IMMUTABLE_COLUMNS.has(col)) continue; // 編集不可 → 既存値維持
      const entry = MAP[col];
      if (!entry) continue; // joho/hanbaiten 適用日など values 対象外の列
      const v = entry.value();
      if (entry.optionalFk && v == null) continue; // 空欄 FK → 既存値維持
      out[entry.field] = v;
    }
    DokusyaImportService.dropOrphanBunruiValues(out, selectedColumns, {
      dokusyaso: str(row.dokusyaso_bunrui),
      nogyosya: str(row.nogyosya_bunrui),
    });

    // haitatsu_same_flg: 明示選択+指定ならその値、未指定でも選択配達先列に入力が
    // あれば「別住所」(false) に下ろす（buildPartialUpdate と同ルール）。
    if (
      selectedColumns.includes('haitatsu_same_flg') &&
      row.haitatsu_same_flg !== undefined
    ) {
      out.haitatsuSameFlg = Boolean(row.haitatsu_same_flg);
    } else if (this.hasHaitatsuDeliveryData(row, selectedColumns)) {
      out.haitatsuSameFlg = false;
    }
    return values;
  }

  /**
   * 開いた tx 内で取込1行を適用。モード + 一括中止 で t_dokusya への INSERT/UPDATE
   * を振り分け、前 rireki の saishin フラグを落として t_dokusya_rireki を1行 INSERT。
   * SQL 形状は unit spec の manager.query 正規表現ルータに一致させる。
   */
  private async applyImportRow(
    manager: EntityManager,
    dto: ImportDokusyaDto,
    row: ImportDokusyaRowDto,
    session: SessionPayload,
    fkMaps: {
      tankaIdByCode: Map<string, number>;
      hanbaitenIdByCode: Map<string, number>;
      kanriShitenIdByCode: Map<string, number>;
      shitenIdByCode: Map<string, number>;
    },
    /** 一括中止で push 待ちの行を積む先（呼び出し側が Phase 3 でまとめて送る）。 */
    pendingStopPushes: Array<{ after: Dokusya }> = [],
  ): Promise<void> {
    const updatedBy = String(session.account_id);
    const jaId = Number(session.ja_id ?? 0);
    const bulkStopChushi = dbDateOrNull(dto.dokusya_chushi_date);
    // 配達先7項目に入力があれば「別住所」扱い: haitatsu_same_flg を false、
    // zougen_hokoku_flg を true（NEW は全配達先列書込みのため row 単位、UPDATE は選択列のみ）。
    const hasHaitatsuData =
      dto.import_mode === 'UPDATE'
        ? this.hasHaitatsuDeliveryData(row, dto.selected_columns)
        : this.hasHaitatsuDeliveryData(row);
    // 「購読者情報と同じ」(haitatsu_same_flg) は列で明示指定されればそれを採用
    // （顧客要件 2026-06 — BE は配達先データ有無から推論しない）。未指定の行のみ
    // 従来どおり配達先入力の有無から導出。
    const sameFlg =
      row.haitatsu_same_flg === undefined
        ? !hasHaitatsuData
        : Boolean(row.haitatsu_same_flg);
    // UPDATE が影響した dokusya_id を RETURNING で受け取り、履歴スナップショットは
    // この1件の dokusya_id だけをキーに作成（kumiaiin は重複可で曖昧キーにしない）。
    // NEW は下の分岐で applyChange を呼び return 済み。

    if (dto.import_mode === 'NEW') {
      // NEW は共通ライタ applyChange(CREATE) に集約 (S3.2)。master 作成 + rireki #1
      // (shinki) + recomputeMaster(当日) を1 tx で実行し UI create と履歴生成を統一。
      // joho は購読開始日に揃える（顧客要件 — UI create の当日基準と異なり実開始日）。
      const { values, johoDate } = this.buildNewImportValues(
        row,
        session,
        fkMaps,
        sameFlg,
        updatedBy,
      );
      const createResult = await applyChange(manager, {
        mode: 'CREATE',
        values,
        johoDate: johoDate || todayIsoJst(),
        source: 'IMPORT',
        actor: updatedBy,
      });
      // cloud → 電子版 push（新規会員）。同期 Saga。取込は全行を1 tx で包むため
      // push 失敗時は取込全体がロールバック（cloud 側は整合）。ただし同一取込で
      // 先行行が電子版へ create 済みなら電子版側に孤児が残りうる → per-record atomic 化
      // と孤児 reconcile は follow-up・§4.4/§6。
      //
      // 対象判定（push 有効化 / 電子版・併読か / campaign 単価か）は pushOnWrite 内の
      // isPushTarget に一本化。呼び出し側で種別を先出しチェックしない（3条件の1つだけを
      // 各所に写すと条件追加時に更新漏れが起きる）。非対象は no-op で返る。
      await this.denshiPush.pushOnWrite(manager, {
        action: 'create',
        after: createResult.after,
        source: 'IMPORT',
      });
      // 履歴は applyChange が書いたので writeRirekiSnapshot はスキップ。
      // updated_by は values に載せているので ensureMaster の INSERT で確定済み。
      return;
    }

    // 一括中止 — 中止日が指定された取込は「解約予約を入れる」だけの操作
    // （顧客要件 2026-08）。他の列は書かない（画面も列グリッドをキー列へ縮退させる）。
    // 電子版への cancel push は行ループでは行わず、DML を全行終えてから
    // まとめて送る（importExcel 側の Phase 3）— 途中失敗時に「送った分だけ」
    // 補償する必要があり、行ごとに送ると送信済みの記録が tx と一緒に消えるため。
    if (bulkStopChushi) {
      const stopId = await this.resolveImportTargetId(manager, jaId, row);
      if (stopId == null) return;
      await this.rireki.lockDokusyaRow(manager, stopId);
      const result = await insertScheduledKaiyaku(manager, {
        dokusyaId: stopId,
        chushiDate: bulkStopChushi,
        shubetsu: Number(dto.dokusya_shubetsu),
        actor: updatedBy,
      });
      await manager.update(Dokusya, { dokusyaId: stopId }, { updatedBy });
      pendingStopPushes.push({ after: result.after });
      return;
    }

    // UPDATE — 選択列のみ applyChange(UPDATE) に集約 (S3.2c)。対象 dokusya_id を解決し
    // 選択された編集可能列だけ values に載せる（未選択列は省略＝前値維持、空欄はスキップ）。
    // 全列更新は FE が全列を selected_columns に含めて実現。販売店含む全変更は単一適用日
    // (joho) で1履歴行にまとめる（顧客要件 2026-07: 販売店適用日を廃止・UI/置換と同ロジック）。
    // 配達先データあり(hasHaitatsuData)は forceZougen で増減報告対象。NEW は上で return 済み。
    const dokusyaId = await this.resolveImportTargetId(manager, jaId, row);
    if (dokusyaId == null) return; // 該当なし → 履歴なし（従来の RETURNING null と同義）
    // [rireki-no-race] 採番前に master 行をロック（UI update と同じ直列化）。
    await this.rireki.lockDokusyaRow(manager, dokusyaId);
    // 適用日は payload 直下（1ファイル1つ）。電子版は画面で当日固定・省略可のため
    // 未指定なら当日を補う（従来の行単位フォールバックと同じ意味）。
    const updateJoho = dbDateOrNull(dto.joho_henko_tekiyo_date) ?? todayIsoJst();
    const updateResult = await applyChange(manager, {
      mode: 'UPDATE',
      dokusyaId,
      values: this.buildUpdatePartialValues(dto.selected_columns, row, fkMaps),
      johoDate: updateJoho,
      source: 'IMPORT',
      actor: updatedBy,
      forceZougen: hasHaitatsuData,
    });
    // updated_by は rireki に無い列で recompute 対象外 → master へ明示スタンプ。
    await manager.update(Dokusya, { dokusyaId }, { updatedBy });

    // cloud → 電子版 push（情報変更）。当日適用のみ即 push。UI update と同一方針。
    // 対象判定は pushOnWrite 内の isPushTarget に一本化（上の create と同じ理由）。
    await this.denshiPush.pushOnWrite(manager, {
      action: 'update',
      after: updateResult.after,
      source: 'IMPORT',
      immediateJohoDate: updateJoho,
    });
  }


  /**
   * import 選択列名 → { entity プロパティ(camelCase), 値, optionalFk } の対応表。
   *
   * buildUpdatePartialValues から切り出した宣言部（50列超のテーブルがそのまま
   * 関数本体にあると Cognitive Complexity が 27 になっていた）。ロジックは持たず、
   * 「どの列がどのエンティティ項目になるか」だけを表す。
   * optionalFk=true は解決できたときのみ載せる（空欄は既存値維持）。
   */
  private buildImportColumnMap(
    row: ImportDokusyaRowDto,
    fkMaps: {
      tankaIdByCode: Map<string, number>;
      hanbaitenIdByCode: Map<string, number>;
      kanriShitenIdByCode: Map<string, number>;
      shitenIdByCode: Map<string, number>;
    },
    str: (v: unknown) => string,
    intOrNull: (v: unknown) => number | null,
    str_: (k: keyof ImportDokusyaRowDto) => () => string,
  ): Record<string, { field: string; value: () => unknown; optionalFk?: boolean }> {
    return {
      kanri_shiten_code: {
        field: 'kanriShitenId',
        value: () => fkMaps.kanriShitenIdByCode.get(str(row.kanri_shiten_code)) ?? null,
        optionalFk: true,
      },
      shiten_code: {
        field: 'shitenId',
        value: () => fkMaps.shitenIdByCode.get(str(row.shiten_code)) ?? null,
        optionalFk: true,
      },
      kumiaiin_code: { field: 'kumiaiinCode', value: str_('kumiaiin_code') },
      // 氏名4列は更新可（顧客要件 2026-07・改姓等。SCR-011 編集画面と同じ扱い）。
      shimei_sei: { field: 'shimeiSei', value: str_('shimei_sei') },
      shimei_mei: { field: 'shimeiMei', value: str_('shimei_mei') },
      shimei_kana_sei: { field: 'shimeiKanaSei', value: str_('shimei_kana_sei') },
      shimei_kana_mei: { field: 'shimeiKanaMei', value: str_('shimei_kana_mei') },
      dokusya_busu: { field: 'dokusyaBusu', value: () => Number(row.dokusya_busu ?? 0) },
      yubin_no: { field: 'yubinNo', value: str_('yubin_no') },
      // todofuken_code は m_todofuken への実FK（t_dokusya_rireki も同様）。他の
      // 参照コード列（kanri_shiten_code等）と同じ optionalFk 扱いにし、空欄なら
      // 既存値を維持する — さもないと空文字での書込みがFK違反(500)になる
      // （選択列に含めたが対象行のセルが空、という取込では起こり得るケース）。
      todofuken_code: {
        field: 'todofukenCode',
        value: () => {
          const v = str(row.todofuken_code);
          return v === '' ? null : v;
        },
        optionalFk: true,
      },
      shikuchoson: { field: 'shikuchoson', value: str_('shikuchoson') },
      chome_banchi: { field: 'chomeBanchi', value: str_('chome_banchi') },
      tatemono_mei: { field: 'tatemonoMei', value: str_('tatemono_mei') },
      renrakusaki_1: { field: 'renrakusaki1', value: str_('renrakusaki_1') },
      renrakusaki_2: { field: 'renrakusaki2', value: str_('renrakusaki_2') },
      email: { field: 'email', value: str_('email') },
      mail_magazine_flg: { field: 'mailMagazineFlg', value: () => Number(row.mail_magazine_flg ?? MAIL_MAGAZINE_FLG_OFF) },
      birth_year: { field: 'birthYear', value: () => intOrNull(row.birth_year) },
      gender: { field: 'gender', value: () => this.toGenderCode(row.gender) },
      haitatsu_yubin_no: { field: 'haitatsuYubinNo', value: str_('haitatsu_yubin_no') },
      haitatsu_todofuken_code: { field: 'haitatsuTodofukenCode', value: str_('haitatsu_todofuken_code') },
      haitatsu_shikuchoson: { field: 'haitatsuShikuchoson', value: str_('haitatsu_shikuchoson') },
      haitatsu_chome_banchi: { field: 'haitatsuChomeBanchi', value: str_('haitatsu_chome_banchi') },
      haitatsu_tatemono_mei: { field: 'haitatsuTatemonoMei', value: str_('haitatsu_tatemono_mei') },
      haitatsu_renrakusaki_1: { field: 'haitatsuRenrakusaki1', value: str_('haitatsu_renrakusaki_1') },
      haitatsu_renrakusaki_2: { field: 'haitatsuRenrakusaki2', value: str_('haitatsu_renrakusaki_2') },
      haitatsu_shimei_sei: { field: 'haitatsuShimeiSei', value: str_('haitatsu_shimei_sei') },
      haitatsu_shimei_mei: { field: 'haitatsuShimeiMei', value: str_('haitatsu_shimei_mei') },
      haitatsu_shimei_kana_sei: { field: 'haitatsuShimeiKanaSei', value: str_('haitatsu_shimei_kana_sei') },
      haitatsu_shimei_kana_mei: { field: 'haitatsuShimeiKanaMei', value: str_('haitatsu_shimei_kana_mei') },
      hanbaiten_code: {
        field: 'hanbaitenId',
        value: () => fkMaps.hanbaitenIdByCode.get(str(row.hanbaiten_code)) ?? null,
        optionalFk: true,
      },
      tanka_code: {
        field: 'tankaId',
        value: () => fkMaps.tankaIdByCode.get(str(row.tanka_code)) ?? null,
        optionalFk: true,
      },
      yubin_kubun: { field: 'yubinKubun', value: () => row.yubin_kubun ?? YUBIN_KUBUN_NASHI },
      shiharai_hoho: { field: 'shiharaiHoho', value: () => intOrNull(row.shiharai_hoho), optionalFk: true },
      dokusyaryo_shiharai_cycle: { field: 'dokusyaryoShiharaiCycle', value: () => intOrNull(row.dokusyaryo_shiharai_cycle) },
      bank_branch_code: { field: 'bankBranchCode', value: str_('bank_branch_code') },
      bank_branch_name: { field: 'bankBranchName', value: str_('bank_branch_name') },
      hikiotoshi_yokin_shubetsu: { field: 'hikiotoshiYokinShubetsu', value: () => this.toYokinCode(row.hikiotoshi_yokin_shubetsu) },
      hikiotoshi_koza_no: { field: 'hikiotoshiKozaNo', value: str_('hikiotoshi_koza_no') },
      hikiotoshi_koza_meigi: { field: 'hikiotoshiKozaMeigi', value: str_('hikiotoshi_koza_meigi') },
      dokusyaso_bunrui: { field: 'dokusyasoBunrui', value: str_('dokusyaso_bunrui') },
      ja_yakushokuin_flg: {
        field: 'jaYakushokuinFlg',
        value: () => row.ja_yakushokuin_flg === true,
      },
      nogyo_kankei_flg: {
        field: 'nogyoKankeiFlg',
        value: () => row.nogyo_kankei_flg === true,
      },
      dokusyaso_bunrui_sonota: {
        field: 'dokusyasoBunruiSonota',
        value: str_('dokusyaso_bunrui_sonota'),
      },
      nogyosya_bunrui: { field: 'nogyosyaBunrui', value: str_('nogyosya_bunrui') },
      nogyosya_bunrui_sonota: {
        field: 'nogyosyaBunruiSonota',
        value: str_('nogyosya_bunrui_sonota'),
      },
      biko: { field: 'biko', value: str_('biko') },
    }
  }

  /**
   * 従属 4 項目は親の分類が条件コードを含むときだけ値を持てる。**親の列も同時に
   * 更新対象のときだけ**ここで落とす — 親が未選択なら既存値が維持されるので、
   * 取込行だけを見て判定できない（既存値の読み出しはこの純関数の責務外）。
   *
   * 判定できないケースが残るのは許容する。矛盾した組合せが DB に残っても、
   * 電子版 push は保存値から profession を組み直したうえで条件付き項目を出し
   * 分ける（denshiban-push.mapper）ので、V26〜V30 で同期が壊れることはない。
   * 実害は「意味の無いフラグが残る」だけで、画面から開いて保存し直せば
   * buildBunruiPayload が整える。
   */
  private static dropOrphanBunruiValues(
    out: Record<string, unknown>,
    selectedColumns: string[],
    parents: { dokusyaso: string; nogyosya: string },
  ): void {
    if (selectedColumns.includes('dokusyaso_bunrui')) {
      const parent = parents.dokusyaso;
      if ('jaYakushokuinFlg' in out && !allowsJaYakushokuinFlg(parent)) {
        out.jaYakushokuinFlg = false;
      }
      if ('nogyoKankeiFlg' in out && !allowsNogyoKankeiFlg(parent)) {
        out.nogyoKankeiFlg = false;
      }
      if ('dokusyasoBunruiSonota' in out && !allowsDokusyasoBunruiSonota(parent)) {
        out.dokusyasoBunruiSonota = '';
      }
    }
    if (
      selectedColumns.includes('nogyosya_bunrui') &&
      'nogyosyaBunruiSonota' in out &&
      !allowsNogyosyaBunruiSonota(parents.nogyosya)
    ) {
      out.nogyosyaBunruiSonota = '';
    }
  }

}

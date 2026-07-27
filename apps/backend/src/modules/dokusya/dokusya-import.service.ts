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
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { ImportDokusyaDto, ImportDokusyaRowDto } from './dto/import-dokusya.dto';
import { DokusyaImportValidationException } from './exceptions/import-validation.exception';
import { DokusyaRowLimitExceededException } from './exceptions/row-limit-exceeded.exception';
import { DokusyaAccountFlagService } from './dokusya-account-flag.service';
import { DokusyaRirekiService } from './dokusya-rireki-helper.service';
import { DokusyaImportValidator } from './dokusya-import-validator.service';
import { applyChange } from './dokusya-history.writer';
import { DokusyaFields } from './dokusya-history.types';

/** SCR-016 — 購読者Excelデータ取込画面 audit-context label. */
const SCREEN_NAME_SCR016 = '購読者Excelデータ取込画面 (ACSMS-SCR-016)';

/**
 * SCR-016 監査ログ用テーブル名（t_log.target_table）。core 側 DokusyaService と
 * 同一値だが、本サービス内で完結させるため複製して保持する。
 */
const TABLE_NAME = 't_dokusya';

/**
 * Narrow a raw `getRawMany()` column (always scalar at runtime) to a
 * primitive so String() can't hit the `[object Object]` path. The
 * assertion is required — the `string | number` receiver does not accept
 * `unknown` without it.
 */
function asScalar(value: unknown): string | number {
  return value as string | number;
}

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

/** m_code 値の入力（取込みは数値/文字列、未指定は undefined）。 */
type MCodeInput = number | string | undefined;

/**
 * SCR-016 — 48-column import template header order (api.md §テンプレート
 * ファイル仕様). Each entry is the Japanese ヘッダー名 the FE / customer
 * sees in row 1 of the generated workbook. 購読種別 is chosen on the screen
 * radio (紙版/電子版) and applied uniformly to every row, so it is NOT an
 * Excel column (顧客要件 2026-07: 取込を紙版/電子版の2モードに分離).
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
  '農業者分類',
  '購読開始日',
  '購読中止日',
  '備考',
  '読者情報変更適用日',
] as const;

/**
 * One illustrative sample row shipped in the template (row 2), in the
 * exact IMPORT_TEMPLATE_HEADERS order. It demonstrates the expected format
 * per column — 紙版(1) / 新規(1) so no 電子版×クレカ or 併読 block, dokusya_busu
 * > 0, gender 1, hiragana kana, 7-digit yubin, digits-only 連絡先, date as
 * YYYY-MM-DD, 現金集金(2) so no 引落口座 required. FK columns (管理支店 / 支店 /
 * 新聞単価 / 販売店コード) are left BLANK because their valid codes are
 * tenant-specific — the customer fills them with their own master codes.
 * The 備考 cell flags it as a placeholder. Length is asserted to equal the
 * header count in the spec so the two never drift.
 */
const IMPORT_TEMPLATE_SAMPLE_ROW: readonly (string | number)[] = [
  '', // ID (UPDATE_* キー — 新規は空)
  '', // 管理支店 (FK code — 自組織の管理支店コードに書き換え)
  '', // 支店 (FK code — 自組織の支店コードに書き換え)
  'SAMPLE001', // 組合員コード (サンプル — 既存コードと衝突しない値)
  '農業', // 購読者氏名_氏
  '太郎', // 購読者氏名_名
  'のうぎょう', // 購読者かな_氏
  'たろう', // 購読者かな_名
  1, // 購読部数
  '', // 新聞単価 (FK code — 自組織の値に書き換え)
  '', // メールアドレス
  0, // メールマガジン (0:配信しない)
  1980, // 生年（西暦）
  1, // 性別 (1:男性)
  '1000001', // 郵便番号 (7桁)
  '13', // 都道府県 (コード)
  '千代田区', // 市町村郡
  '千代田1-1', // 丁目番地
  '', // マンション・アパート名
  '0312345678', // 連絡先１ (半角数字)
  '', // 連絡先２
  'TRUE', // 購読者情報と同じ (true: 配達先＝購読者住所。配達先列は空でよい)
  '', // 郵便番号(配達先)
  '', // 都道府県(配達先)
  '', // 市町村郡(配達先)
  '', // 丁目番地(配達先)
  '', // ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)
  '', // 連絡先１(配達先)
  '', // 連絡先２(配達先)
  '', // 配達先苗字（漢字）
  '', // 配達先名前（漢字）
  '', // 配達先苗字（かな）
  '', // 配達先名前（かな）
  '', // 販売店コード (FK code — 自組織の値に書き換え)
  '0', // 郵送区分
  2, // 支払方法 (2:現金集金 — 引落口座不要)
  1, // 購読料支払サイクル（月数）
  '', // 引落口座貯金種目
  '', // 引落口座支店コード
  '', // 引落口座支店名
  '', // 引落口座番号
  '', // 引落口座名義
  '', // 購読者層分類
  '', // 農業者分類
  '2026-04-01', // 購読開始日 (YYYY-MM-DD)
  '', // 購読中止日
  'サンプル行です。管理支店・支店はID(数値)、新聞単価・販売店コードは自組織のコードに書き換えてからインポートしてください。', // 備考
  '', // 読者情報変更適用日（販売店を含む全変更の唯一の適用日）
] as const;

/** SCR-016 import — 取込ファイル名 (api.md §レスポンスヘッダ). */
const IMPORT_TEMPLATE_FILENAME = '購読者Excelデータ取込_テンプレート.xlsx';

/**
 * SCR-016 — 更新モードで編集不可の物理カラム。
 * 購読種別・氏名（4 列）・購読開始日 は登録時のみ設定でき、更新では既存値を
 * 維持する（SCR-011 編集画面の pin と同じ業務ルール）。FE はこの列を更新モードで
 * 未チェック＋disable にし、BE は selected_columns から除外する。
 */
const IMPORT_EDIT_IMMUTABLE_COLUMNS: ReadonlySet<string> = new Set([
  'dokusya_shubetsu',
  'shimei_sei',
  'shimei_mei',
  'shimei_kana_sei',
  'shimei_kana_mei',
  'dokusya_kaishi_date',
]);

/** SCR-016 — row-error cap returned to the client (api.md §4.1). */
const IMPORT_ERROR_CAP = 10;

/** SCR-016 — max import rows (api.md §4.1). */
const IMPORT_MAX_ROWS = 30000;

/**
 * 取込モード → 監査ログ operation ラベル（api.md §4.5）。バッチ操作なので
 * bare-verb ルールの例外。販売店取込 (SCR-019) と同一ラベルで統一。
 */
const IMPORT_OPERATION_BY_MODE: Record<'NEW' | 'UPDATE', AuditOperation> = {
  NEW: AuditOperation.IMPORT_NEW,
  // UPDATE は選択列のみ更新（partial 相当）。監査 operation は既存の
  // IMPORT_UPDATE_PARTIAL を再利用する（過去ログとの互換のため enum は変えない）。
  UPDATE: AuditOperation.IMPORT_UPDATE_PARTIAL,
};


/**
 * SCR-016 — 購読者Excelデータ取込（テンプレートDL + 一括取込）を担うサービス。
 *
 * 肥大化した `DokusyaService` から Excel-IMPORT concern を切り出したもの。
 * 取込専用のメソッド（テンプレート生成・行バリデーション・INSERT/UPDATE・
 * 履歴スナップショット）を集約し、`DokusyaService` は本サービスへ薄く委譲する
 * facade として `downloadImportTemplate` / `importExcel` を公開する。
 *
 * rireki（履歴）まわりの共通ヘルパー（lockDokusyaRow / nextRirekiNo /
 * writeRirekiSplit）は UI 登録/更新フロー（DokusyaService）と完全に共有する。
 * step C でこれらを共有リーフサービス `DokusyaRirekiService` へ切り出したため、
 * 本サービスは同サービスを直接 inject して呼び出す（取込と UI で履歴の作り方を
 * 1 ミリも違わせないため）。これにより step B の facade↔取込 `forwardRef` 循環は解消。
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
  ) {}

  async downloadImportTemplate(
    _session: SessionPayload,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'agrinews';
    const sheet = workbook.addWorksheet('購読者');
    sheet.addRow([...IMPORT_TEMPLATE_HEADERS]);
    // Row 2 — one illustrative sample row (customer edits before real use;
    // FK code columns are blank since their valid values are tenant-specific).
    sheet.addRow([...IMPORT_TEMPLATE_SAMPLE_ROW]);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    sheet.columns = IMPORT_TEMPLATE_HEADERS.map(() => ({ width: 18 }));
    const buf = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    return { buffer, filename: IMPORT_TEMPLATE_FILENAME };
  }

  // ─── API-016-002 — POST /api/v1/dokusya/import ──────────────────────────
  /**
   * Bulk-import 購読者 rows in one transaction (api.md §4.4).
   *
   * Modes: NEW (INSERT each row), UPDATE (only `selected_columns` — blank
   * cells are skipped; select all columns to update everything), and
   * 一括中止 (per-row tetsuzuki_shurui=0 + kumiaiin_code → 解約).
   *
   * Validation order (all PRE-transaction):
   *   §4.1 top-level — import_mode / NEW required columns / row-limit.
   *   §4.1 per-row — dokusya_shubetsu 1|2, 電子版×クレカ, dokusya_busu,
   *        gender / yokin 文言→code.
   *   §4.3 pre-checks via dataSource.query — tanka_code, hanbaiten_code,
   *        kanri_shiten / shiten existence, existing dokusya for UPDATE_*
   *        / 一括中止 (errors capped at 10 → IMPORT_VALIDATION_ERROR).
   *   §4.2/§4.3 DataScope — out-of-scope existing record → 403.
   *
   * After pre-checks: one `dataSource.transaction(...)` wraps every
   * INSERT/UPDATE + the rireki rows + a single audit row (bare 'CREATE'
   * operation). Error log fires OUTSIDE the rolled-back tx.
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

    // 購読種別は画面ラジオ（紙版/電子版）で選ぶ取込モード（顧客要件 2026-07）。Excel の
    // 列ではないため、全取込行へ一律適用してから検証・登録する（既存の per-row shubetsu
    // ロジック＝検証/entity build/部数固定 をそのまま活かす）。NEW は新規レコードへ
    // この種別を設定、UPDATE は種別が既存の値と一致することを検証する。
    for (const row of dto.rows) {
      row.dokusya_shubetsu = dto.dokusya_shubetsu;
    }

    // §4.1 — row-limit (defence-in-depth; DTO @ArrayMaxSize also guards).
    if (dto.rows.length > IMPORT_MAX_ROWS) {
      throw new DokusyaRowLimitExceededException();
    }

    // §4.1 — NEW mode must carry the 13 required columns.
    this.validator.assertNewModeRequiredColumns(dto);

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
      // 取込バリデーション失敗の内訳をログに残す（どの行・項目で弾かれたか
      // を運用ログから追えるようにする。errors[] はレスポンスにも返るが、
      // 画面側で握りつぶされた場合の調査用）。
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

    // 取込はバッチ操作 — 操作種別はモード別の prefixed ラベル
    // (IMPORT_NEW / IMPORT_UPDATE_PARTIAL) を使う。bare-verb ルールの例外
    // （api.md §4.5。単一 INSERT と一括取込を t_log で区別するため）。UPDATE は
    // partial 相当のため既存 IMPORT_UPDATE_PARTIAL を再利用（過去ログ互換）。
    const importOperation = IMPORT_OPERATION_BY_MODE[dto.import_mode];

    try {
      await this.dataSource.transaction(async (manager) => {
        for (const row of dto.rows) {
          await this.applyImportRow(manager, dto, row, session, fkMaps);
        }

        // §4.5 — one summary audit row per import call, joined to the tx.
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
      // §4.7 — error log on the standalone connection (NO manager) so it
      // survives the rollback.
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
    // code → id maps so the NEW INSERT can persist the resolved FK ids
    // (t_dokusya stores tanka_id / hanbaiten_id, not the codes).
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
    // code → id map so the INSERT/UPDATE can persist kanri_shiten_id
    // (t_dokusya stores the id FK, the import carries the code).
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

    // §4.3.4 — existing dokusya (UPDATE_* / 一括中止). Keyed by
    // dokusya_id OR kumiaiin_code, scoped by ja_id.
    const existingRows: Array<Record<string, unknown>> =
      dokusyaIds.length === 0 && kumiaiinCodes.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT dokusya_id, kumiaiin_code, ja_id, kanri_shiten_id, shiten_id,
                    dokusya_shubetsu, email, hanbaiten_id,
                    dokusya_kaishi_date, dokusya_chushi_date
               FROM t_dokusya
              WHERE ja_id = $1
                AND (dokusya_id = ANY($2::bigint[])
                     OR kumiaiin_code = ANY($3::text[]))
                AND deleted_at IS NULL`,
            [jaId, dokusyaIds, kumiaiinCodes],
          );
    // 顧客要件 — メール一意性は電子版(2)・併読(3) のレコード間でのみ担保する
    // ため、JA 全件の電子版/併読 email を email → dokusya_id 群で引けるよう
    // 事前ロードする（紙版は重複可なので対象外）。NEW 行が既存の電子版メール
    // を再利用するケースも検知できるよう、取込対象行に限らず全件を読む。
    const digitalEmailRows: Array<Record<string, unknown>> =
      await this.dataSource.query(
        `SELECT dokusya_id, email
           FROM t_dokusya
          WHERE ja_id = $1
            AND dokusya_shubetsu = ANY($2::int[])
            AND email <> ''
            AND deleted_at IS NULL`,
        [jaId, [DokusyaShubetsu.DIGITAL, DokusyaShubetsu.BOTH]],
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
    // 組合員コードは重複可。kumiaiin_code をキーに更新/解約する際、複数件
    // ヒットすると一括で誤更新してしまうため、件数を数えて 2 件以上なら
    // 行エラーにする（ID 指定を促す）。
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

  /** Unique non-blank strings from a column projection. */
  private uniqueStrings(values: Array<string | undefined>): string[] {
    return Array.from(
      new Set(values.filter((v): v is string => typeof v === 'string' && v !== '')),
    );
  }

  /** Unique defined numbers from a column projection. */
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
   * Convert a row's m_code field (numeric code OR the customer-editable
   * Japanese label) to the stored numeric code. Resolves the label via
   * CodeService so a renamed `m_code.code_name` keeps importing without a
   * code change — no hardcoded label→code map. Returns null when blank;
   * falls back to Number(value) when the cell already holds the code.
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
   * Extract `dokusya_id` from a raw `manager.query(… RETURNING dokusya_id)`
   * result. TypeORM の `query()` は INSERT…RETURNING では行配列をそのまま
   * 返すが、UPDATE/DELETE…RETURNING では `[行配列, 影響件数]` の2要素配列を
   * 返す。そのため UPDATE / 解約 では `result[0]` が
   * 「行」ではなく「行配列」になり、`result[0].dokusya_id` が undefined →
   * affectedDokusyaId が null → writeRirekiSnapshot がスキップされ、マスタは
   * 更新されるのに履歴(t_dokusya_rireki)が作成されない不具合になっていた。
   * 両方の戻り値形状を吸収し、UPDATE が1件でもヒットすれば必ず履歴を作る。
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
   * 配達先(delivery destination)7項目のいずれかに値があるかを判定する。
   * 取込テンプレートに「配達先＝購読者住所と同じか」を表す per-row flag が
   * 無いため、これらの配達先項目に入力があれば「別住所」とみなす:
   *   - haitatsu_same_flg を false（配達先 ≠ 購読者住所）に下ろす
   *   - zougen_hokoku_flg を true（配達先変更は増減報告対象）に立てる
   * `selectedColumns` 指定時（UPDATE）は選択された列のみを対象に
   * 判定する — 未選択＝DBへ書き込まれない配達先列を誤検知しないため。
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
   * Build the CREATE `values` for a NEW import row (mirrors the create
   * flow's column set — see DokusyaService.buildInsertPayload). FK code
   * columns are resolved to physical *_id via the pre-built maps; blank
   * varchar → '' (NOT NULL), blank int/FK → null. `joho_henko_tekiyo_date`
   * は購読開始日に揃える（顧客要件 — UI create と異なり当日ではない）。
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
      mailMagazineFlg: Number(row.mail_magazine_flg ?? 0),
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
      yubinKubun: row.yubin_kubun ?? '0',
      shiharaiHoho: intOrNull(row.shiharai_hoho),
      dokusyaryoShiharaiCycle: intOrNull(row.dokusyaryo_shiharai_cycle),
      bankBranchCode: str(row.bank_branch_code),
      bankBranchName: str(row.bank_branch_name),
      hikiotoshiYokinShubetsu: this.toYokinCode(row.hikiotoshi_yokin_shubetsu),
      hikiotoshiKozaNo: str(row.hikiotoshi_koza_no),
      hikiotoshiKozaMeigi: str(row.hikiotoshi_koza_meigi),
      dokusyasoBunrui: str(row.dokusyaso_bunrui),
      nogyosyaBunrui: str(row.nogyosya_bunrui),
      shokiDokusyaKaishiDate: kaishiDate,
      dokusyaKaishiDate: kaishiDate,
      dokusyaChushiDate: normalizeDbDate(row.dokusya_chushi_date ?? null),
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
    // updated_by は t_dokusya の NOT NULL 列だが DokusyaRireki には無いため
    // DokusyaFields 型には載らない。ensureMaster の master INSERT で必要なので
    // runtime に付与する（UI create の buildInsertPayload と同じ扱い）。
    (values as Record<string, unknown>).updatedBy = updatedBy;
    return { values, johoDate: kaishiDate };
  }

  /**
   * Resolve the target dokusya_id for an UPDATE import row within the
   * caller's JA, matching by `dokusya_id` (preferred) or `kumiaiin_code`.
   * Returns `null` when no row matches (→ history is skipped, mirroring the
   * previous `RETURNING`-null behaviour). Row-existence is validated
   * upstream so a miss is not the normal path.
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
   * Build the UPDATE `values` for an UPDATE import row (api.md
   * §4.4.3): ONLY the columns in `selected_columns` (that map to a writable
   * physical column) appear — unselected columns are omitted and carried
   * forward by applyChange. Edit-immutable columns
   * ({@link IMPORT_EDIT_IMMUTABLE_COLUMNS}) and `dokusya_id` (key) are never
   * written. FK code columns resolve to the physical *_id and are set only
   * when present (blank → keep existing). `joho_henko_tekiyo_date` is the
   * applied-date parameter, not a business value.（販売店適用日
   * hanbaiten_tekiyo_date は廃止・顧客要件 2026-07）
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
    // import 選択列名 → { entity プロパティ(camelCase), 値, optionalFk }。
    // optionalFk=true は解決できたときのみ載せる（空欄は既存値維持）。
    const MAP: Record<
      string,
      { field: string; value: () => unknown; optionalFk?: boolean }
    > = {
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
      dokusya_busu: { field: 'dokusyaBusu', value: () => Number(row.dokusya_busu ?? 0) },
      yubin_no: { field: 'yubinNo', value: str_('yubin_no') },
      todofuken_code: { field: 'todofukenCode', value: str_('todofuken_code') },
      shikuchoson: { field: 'shikuchoson', value: str_('shikuchoson') },
      chome_banchi: { field: 'chomeBanchi', value: str_('chome_banchi') },
      tatemono_mei: { field: 'tatemonoMei', value: str_('tatemono_mei') },
      renrakusaki_1: { field: 'renrakusaki1', value: str_('renrakusaki_1') },
      renrakusaki_2: { field: 'renrakusaki2', value: str_('renrakusaki_2') },
      email: { field: 'email', value: str_('email') },
      mail_magazine_flg: { field: 'mailMagazineFlg', value: () => Number(row.mail_magazine_flg ?? 0) },
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
      yubin_kubun: { field: 'yubinKubun', value: () => row.yubin_kubun ?? '0' },
      shiharai_hoho: { field: 'shiharaiHoho', value: () => intOrNull(row.shiharai_hoho), optionalFk: true },
      dokusyaryo_shiharai_cycle: { field: 'dokusyaryoShiharaiCycle', value: () => intOrNull(row.dokusyaryo_shiharai_cycle) },
      bank_branch_code: { field: 'bankBranchCode', value: str_('bank_branch_code') },
      bank_branch_name: { field: 'bankBranchName', value: str_('bank_branch_name') },
      hikiotoshi_yokin_shubetsu: { field: 'hikiotoshiYokinShubetsu', value: () => this.toYokinCode(row.hikiotoshi_yokin_shubetsu) },
      hikiotoshi_koza_no: { field: 'hikiotoshiKozaNo', value: str_('hikiotoshi_koza_no') },
      hikiotoshi_koza_meigi: { field: 'hikiotoshiKozaMeigi', value: str_('hikiotoshi_koza_meigi') },
      dokusyaso_bunrui: { field: 'dokusyasoBunrui', value: str_('dokusyaso_bunrui') },
      nogyosya_bunrui: { field: 'nogyosyaBunrui', value: str_('nogyosya_bunrui') },
      dokusya_chushi_date: { field: 'dokusyaChushiDate', value: () => dbDateOrNull(row.dokusya_chushi_date) },
      biko: { field: 'biko', value: str_('biko') },
    };

    const values: DokusyaFields = {};
    const out = values as Record<string, unknown>;
    for (const col of selectedColumns) {
      if (col === 'dokusya_id') continue; // key, not written
      if (IMPORT_EDIT_IMMUTABLE_COLUMNS.has(col)) continue; // 編集不可 → 既存値維持
      const entry = MAP[col];
      if (!entry) continue; // joho/hanbaiten 適用日など values 対象外の列
      const v = entry.value();
      if (entry.optionalFk && v == null) continue; // 空欄 FK → 既存値維持
      out[entry.field] = v;
    }
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
   * Apply one import row inside the open transaction. Dispatches by mode
   * + 一括中止 to a raw INSERT / UPDATE on `t_dokusya`, then toggles the
   * prior rireki saishin flag + INSERTs one `t_dokusya_rireki` row. SQL
   * shapes match the unit spec's `manager.query` regex router.
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
  ): Promise<void> {
    const updatedBy = String(session.account_id);
    const jaId = Number(session.ja_id ?? 0);
    // 配達先(delivery)7項目に入力があれば「別住所」扱い: haitatsu_same_flg を
    // false に下ろし、zougen_hokoku_flg を true に立てる（NEW は全配達先列を
    // 書込むため row 単位で判定。UPDATE は選択列のみ）。
    const hasHaitatsuData =
      dto.import_mode === 'UPDATE'
        ? this.hasHaitatsuDeliveryData(row, dto.selected_columns)
        : this.hasHaitatsuDeliveryData(row);
    // 「購読者情報と同じ」(haitatsu_same_flg) は列で明示指定されたらそれを採用
    // （顧客要件 2026-06 — BE は配達先データ有無から推論しない）。列が未指定
    // （空欄）の行のみ、従来どおり配達先入力の有無から導出する。
    const sameFlg =
      row.haitatsu_same_flg === undefined
        ? !hasHaitatsuData
        : Boolean(row.haitatsu_same_flg);
    // UPDATE が影響した dokusya_id を RETURNING から受け取り、履歴スナップショットは
    // この 1 件の dokusya_id だけをキーに作成する（kumiaiin は重複可のため曖昧キーに
    // しない）。NEW は下の分岐で applyChange を呼んで return 済み。

    if (dto.import_mode === 'NEW') {
      // NEW は共通ライタ applyChange(CREATE) に集約 (S3.2)。master 作成 +
      // rireki #1 (shinki) + recomputeMaster(当日) を1トランザクションで実行し、
      // UI create と履歴の作り方を統一する。joho は購読開始日に揃える（顧客要件
      // — UI create の当日基準とは異なり、既存データ取込のため実際の開始日）。
      const { values, johoDate } = this.buildNewImportValues(
        row,
        session,
        fkMaps,
        sameFlg,
        updatedBy,
      );
      await applyChange(manager, {
        mode: 'CREATE',
        values,
        johoDate: johoDate || todayIsoJst(),
        source: 'IMPORT',
        actor: updatedBy,
        reason: 'Excel取込',
      });
      // 履歴は applyChange が書いたので writeRirekiSnapshot はスキップ。
      // updated_by は values に載せているので ensureMaster の INSERT で確定済み。
      return;
    }

    // UPDATE — 選択列のみ applyChange(UPDATE) に集約 (S3.2c)。対象 dokusya_id を
    // 解決し、選択された編集可能列だけを values に載せる（未選択列は省略＝
    // predecessor 値を維持、空欄はスキップ）。全列更新は FE が全列を selected_columns
    // に含めることで実現する。販売店を含む全変更は単一の適用日(joho)で1件の履歴行に
    // まとめる（顧客要件 2026-07: 販売店適用日を廃止・UI/置換と同一ロジック）。配達先
    // データあり(hasHaitatsuData)は forceZougen で増減報告対象にする。NEW は上で return 済み。
    const dokusyaId = await this.resolveImportTargetId(manager, jaId, row);
    if (dokusyaId == null) return; // 該当なし → 履歴なし（従来の RETURNING null と同義）
    // [rireki-no-race] 採番前に master 行をロック（UI update と同じ直列化）。
    await this.rireki.lockDokusyaRow(manager, dokusyaId);
    await applyChange(manager, {
      mode: 'UPDATE',
      dokusyaId,
      values: this.buildUpdatePartialValues(dto.selected_columns, row, fkMaps),
      johoDate: dbDateOrNull(row.joho_henko_tekiyo_date) ?? todayIsoJst(),
      source: 'IMPORT',
      actor: updatedBy,
      reason: 'Excel取込',
      forceZougen: hasHaitatsuData,
    });
    // updated_by は rireki に無い列で recompute 対象外 → master へ明示スタンプ。
    await manager.update(Dokusya, { dokusyaId }, { updatedBy });
  }

}

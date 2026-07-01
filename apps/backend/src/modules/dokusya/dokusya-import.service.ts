import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { normalizeDbDate, dbDateOrNull } from '@/common/utils/datetime';
import {
  AuditOperation,
  DenshiShoninStatus,
  DokusyaShubetsu,
  LogType,
  ResultStatus,
  TetsuzukiShurui,
} from '@/common/enums';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { ImportDokusyaDto, ImportDokusyaRowDto } from './dto/import-dokusya.dto';
import { DokusyaImportValidationException } from './exceptions/import-validation.exception';
import { DokusyaRowLimitExceededException } from './exceptions/row-limit-exceeded.exception';
import { DokusyaAccountFlagService } from './dokusya-account-flag.service';
import { DokusyaRirekiService } from './dokusya-rireki-helper.service';
import { DokusyaImportValidator } from './dokusya-import-validator.service';

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
 * SCR-016 — 49-column import template header order (api.md §テンプレート
 * ファイル仕様). Each entry is the Japanese ヘッダー名 the FE / customer
 * sees in row 1 of the generated workbook.
 */
const IMPORT_TEMPLATE_HEADERS: readonly string[] = [
  'ID',
  '購読種別',
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
  '販売店適用日',
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
  1, // 購読種別 (1:紙版)
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
  '', // 読者情報変更適用日
  '', // 販売店適用日 (販売店変更時に入力)
] as const;

/** SCR-016 import — 取込ファイル名 (api.md §レスポンスヘッダ). */
const IMPORT_TEMPLATE_FILENAME = '購読者Excelデータ取込_テンプレート.xlsx';

/**
 * SCR-016 — 更新（全項目更新 / 入力箇所のみ更新）で編集不可の物理カラム。
 * 購読種別・氏名（4 列）・購読開始日 は登録時のみ設定でき、更新では既存値を
 * 維持する（SCR-011 編集画面の pin と同じ業務ルール）。FE はこの列を更新モードで
 * 未チェック＋disable にし、BE は UPDATE_ALL で既存値を COALESCE 維持、
 * UPDATE_PARTIAL では selected_columns から除外する。
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
const IMPORT_OPERATION_BY_MODE: Record<
  'NEW' | 'UPDATE_ALL' | 'UPDATE_PARTIAL',
  AuditOperation
> = {
  NEW: AuditOperation.IMPORT_NEW,
  UPDATE_ALL: AuditOperation.IMPORT_UPDATE_ALL,
  UPDATE_PARTIAL: AuditOperation.IMPORT_UPDATE_PARTIAL,
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
   * Modes: NEW (INSERT each row), UPDATE_ALL (full update — null/'' the
   * unselected columns), UPDATE_PARTIAL (only `selected_columns`), and
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
    // (IMPORT_NEW / IMPORT_UPDATE_ALL / IMPORT_UPDATE_PARTIAL) を使う。
    // bare-verb ルールの例外（api.md §4.5。単一 INSERT と一括取込を t_log で
    // 区別するため）。販売店取込 (SCR-019) と同一ラベルで統一。
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
                AND tanka_type = 1 AND deleted_at IS NULL`,
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
            `SELECT dokusya_id, kumiaiin_code, ja_id, kanri_shiten_id,
                    dokusya_shubetsu, email, hanbaiten_id
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
   * 返す。そのため UPDATE_ALL / UPDATE_PARTIAL / 解約 では `result[0]` が
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
   * `selectedColumns` 指定時（UPDATE_PARTIAL）は選択された列のみを対象に
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
    // false に下ろし、zougen_hokoku_flg を true に立てる（NEW / UPDATE_ALL は
    // 全配達先列を書込むため row 単位で判定。UPDATE_PARTIAL は選択列のみ）。
    const hasHaitatsuData =
      dto.import_mode === 'UPDATE_PARTIAL'
        ? this.hasHaitatsuDeliveryData(row, dto.selected_columns)
        : this.hasHaitatsuDeliveryData(row);
    // 「購読者情報と同じ」(haitatsu_same_flg) は列で明示指定されたらそれを採用
    // （顧客要件 2026-06 — BE は配達先データ有無から推論しない）。列が未指定
    // （空欄）の行のみ、従来どおり配達先入力の有無から導出する。
    const sameFlg =
      row.haitatsu_same_flg === undefined
        ? !hasHaitatsuData
        : Boolean(row.haitatsu_same_flg);
    // 各書込みパス（NEW=INSERT / 解約 / UPDATE_ALL / UPDATE_PARTIAL）が影響した
    // dokusya_id を RETURNING から受け取り、履歴スナップショットはこの 1 件の
    // dokusya_id だけをキーに作成する（kumiaiin は重複可のため曖昧キーにしない）。
    // これにより NEW でも UPDATE でも「1 件の書込み → 1 件の履歴」が保証される。
    let affectedDokusyaId: number | null = null;

    // Value coercion helpers shared by the NEW INSERT and the UPDATE_ALL
    // SET clause. `str` → '' for blank (NOT NULL varchar columns);
    // `intOrNull` → null for blank (nullable ints / COALESCE-guarded FKs).
    const str = (v: unknown): string =>
      v === undefined || v === null ? '' : String(asScalar(v));
    const intOrNull = (v: unknown): number | null =>
      v === undefined || v === null || v === '' ? null : Number(v);

    if (dto.import_mode === 'NEW') {
      // Persist EVERY column t_dokusya needs. The previous INSERT wrote only
      // 11 columns and crashed real Postgres on the NOT NULL columns it
      // omitted (shimei_kana_sei, address, 連絡先, tanka_id, hanbaiten_id,
      // dates, …). Mirror the create flow's column set. String NOT NULL
      // columns default to '' when blank; tanka_id / hanbaiten_id are
      // resolved from the FK code→id maps (both validated to exist above).
      const kaishiDate = normalizeDbDate(str(row.dokusya_kaishi_date));
      const inserted = await manager.query<Array<{ dokusya_id?: number }>>(
        `INSERT INTO t_dokusya
           (ja_id, kanri_shiten_id, shiten_id, kumiaiin_code, dokusya_shubetsu,
            tetsuzuki_shurui, shimei_sei, shimei_mei, shimei_kana_sei,
            shimei_kana_mei, dokusya_busu, yubin_no, todofuken_code,
            shikuchoson, chome_banchi, tatemono_mei, renrakusaki_1,
            renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
            haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
            haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
            haitatsu_renrakusaki_1, haitatsu_renrakusaki_2, haitatsu_shimei_sei,
            haitatsu_shimei_mei, haitatsu_shimei_kana_sei,
            haitatsu_shimei_kana_mei, hanbaiten_id, tanka_id, yubin_kubun,
            shiharai_hoho, dokusyaryo_shiharai_cycle, bank_branch_code,
            bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no,
            hikiotoshi_koza_meigi, dokusyaso_bunrui, nogyosya_bunrui,
            shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
            joho_henko_tekiyo_date, biko, denshi_shonin_status, created_by,
            updated_by)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
            $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
            $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $53)
         RETURNING dokusya_id`,
        [
          Number(session.ja_id ?? 0), // $1 ja_id
          // 管理支店/支店 はコードで取込み、物理カラム *_id へ解決して書く。
          fkMaps.kanriShitenIdByCode.get(str(row.kanri_shiten_code)) ?? null, // $2
          fkMaps.shitenIdByCode.get(str(row.shiten_code)) ?? null, // $3
          str(row.kumiaiin_code), // $4
          intOrNull(row.dokusya_shubetsu), // $5
          TetsuzukiShurui.SHINKI, // $6 — NEW は手続種類=新規(1)固定（顧客要件 2026-06）
          str(row.shimei_sei), // $7
          str(row.shimei_mei), // $8
          str(row.shimei_kana_sei), // $9
          str(row.shimei_kana_mei), // $10
          Number(row.dokusya_busu ?? 0), // $11（解約でも0強制しない。バッチが処理）
          str(row.yubin_no), // $12
          str(row.todofuken_code), // $13
          str(row.shikuchoson), // $14
          str(row.chome_banchi), // $15
          str(row.tatemono_mei), // $16
          str(row.renrakusaki_1), // $17
          str(row.renrakusaki_2), // $18
          str(row.email), // $19
          Number(row.mail_magazine_flg ?? 0), // $20
          intOrNull(row.birth_year), // $21
          this.toGenderCode(row.gender), // $22
          sameFlg, // $23 haitatsu_same_flg — 列指定優先、未指定は配達先入力有無から導出
          str(row.haitatsu_yubin_no), // $24
          str(row.haitatsu_todofuken_code), // $25
          str(row.haitatsu_shikuchoson), // $26
          str(row.haitatsu_chome_banchi), // $27
          str(row.haitatsu_tatemono_mei), // $28
          str(row.haitatsu_renrakusaki_1), // $29
          str(row.haitatsu_renrakusaki_2), // $30
          str(row.haitatsu_shimei_sei), // $31
          str(row.haitatsu_shimei_mei), // $32
          str(row.haitatsu_shimei_kana_sei), // $33
          str(row.haitatsu_shimei_kana_mei), // $34
          fkMaps.hanbaitenIdByCode.get(str(row.hanbaiten_code)) ?? null, // $35
          fkMaps.tankaIdByCode.get(str(row.tanka_code)) ?? null, // $36
          row.yubin_kubun ?? '0', // $37
          intOrNull(row.shiharai_hoho), // $38
          intOrNull(row.dokusyaryo_shiharai_cycle), // $39
          str(row.bank_branch_code), // $40
          str(row.bank_branch_name), // $41
          this.toYokinCode(row.hikiotoshi_yokin_shubetsu), // $42
          str(row.hikiotoshi_koza_no), // $43
          str(row.hikiotoshi_koza_meigi), // $44
          str(row.dokusyaso_bunrui), // $45
          str(row.nogyosya_bunrui), // $46
          kaishiDate, // $47 shoki_dokusya_kaishi_date = kaishi
          kaishiDate, // $48 dokusya_kaishi_date
          normalizeDbDate(row.dokusya_chushi_date ?? null), // $49
          kaishiDate, // $50 joho_henko_tekiyo_date — NEW は購読開始日に揃える（顧客要件）
          str(row.biko), // $51
          // 電子版(2)は承認済(1)で取込む（紙版は null）。create() の電子版は
          // 承認待ち(0) を立てるが、Excel一括取込は職員操作のため承認済で
          // 登録する（顧客要件 — フォーム作成と同様に status を埋める）。
          Number(row.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL
            ? DenshiShoninStatus.APPROVED
            : null, // $52 denshi_shonin_status
          updatedBy, // $53 created_by + updated_by
        ],
      );
      affectedDokusyaId = this.extractReturnedDokusyaId(inserted);
    } else if (dto.import_mode === 'UPDATE_ALL') {
      // Full update (api.md §4.4.2) — 取込テンプレートの全項目を上書きする。
      // 未指定の項目は varchar→'' / nullable→null で上書き。NOT NULL の
      // FK・参照列（管理支店 / 支店 / 販売店 / 新聞単価 / 購読種別 / 手続種類 /
      // 支払方法）は空欄だと制約違反になるため COALESCE(:値, 既存値) で
      // 既存値を維持する（UPDATE モードでは FK コードは任意入力＝検証は
      // 存在時のみ）。購読開始日 (購読開始の初回日 = 不変) は SET から除外。
      const updatedAll = await manager.query<Array<{ dokusya_id?: number }>>(
        `UPDATE t_dokusya
            SET kanri_shiten_id = COALESCE($1, kanri_shiten_id),
                shiten_id = COALESCE($2, shiten_id),
                kumiaiin_code = $3,
                -- 編集不可項目（購読種別 / 手続種類 / 氏名4 / 購読開始日）は
                -- UPDATE_ALL でも既存値を維持する。NOT NULL 列なので
                -- COALESCE(列,$n) は常に既存値を返す（$n は型推論のため参照のみ・
                -- 実質未使用）。手続種類は取込で変更不可（顧客要件 2026-06）。
                dokusya_shubetsu = COALESCE(dokusya_shubetsu, $4),
                tetsuzuki_shurui = COALESCE(tetsuzuki_shurui, $5),
                shimei_sei = COALESCE(shimei_sei, $6),
                shimei_mei = COALESCE(shimei_mei, $7),
                shimei_kana_sei = COALESCE(shimei_kana_sei, $8),
                shimei_kana_mei = COALESCE(shimei_kana_mei, $9),
                dokusya_busu = $10,
                yubin_no = $11,
                todofuken_code = $12,
                shikuchoson = $13,
                chome_banchi = $14,
                tatemono_mei = $15,
                renrakusaki_1 = $16,
                renrakusaki_2 = $17,
                email = $18,
                mail_magazine_flg = $19,
                birth_year = $20,
                gender = $21,
                haitatsu_same_flg = $22,
                haitatsu_yubin_no = $23,
                haitatsu_todofuken_code = $24,
                haitatsu_shikuchoson = $25,
                haitatsu_chome_banchi = $26,
                haitatsu_tatemono_mei = $27,
                haitatsu_renrakusaki_1 = $28,
                haitatsu_renrakusaki_2 = $29,
                haitatsu_shimei_sei = $30,
                haitatsu_shimei_mei = $31,
                haitatsu_shimei_kana_sei = $32,
                haitatsu_shimei_kana_mei = $33,
                hanbaiten_id = COALESCE($34, hanbaiten_id),
                tanka_id = COALESCE($35, tanka_id),
                yubin_kubun = $36,
                shiharai_hoho = COALESCE($37, shiharai_hoho),
                dokusyaryo_shiharai_cycle = $38,
                bank_branch_code = $39,
                bank_branch_name = $40,
                hikiotoshi_yokin_shubetsu = $41,
                hikiotoshi_koza_no = $42,
                hikiotoshi_koza_meigi = $43,
                dokusyaso_bunrui = $44,
                nogyosya_bunrui = $45,
                dokusya_kaishi_date = COALESCE(dokusya_kaishi_date, $46),
                dokusya_chushi_date = $47,
                joho_henko_tekiyo_date = $48,
                biko = $49,
                updated_by = $50,
                updated_at = NOW()
          WHERE ja_id = $52
            AND (($51::bigint IS NOT NULL AND dokusya_id = $51)
                 OR ($53 <> '' AND kumiaiin_code = $53))
            AND deleted_at IS NULL
        RETURNING dokusya_id, rireki_no`,
        [
          // 管理支店/支店 はコードで取込み、物理カラム *_id へ解決（未指定→
          // null で COALESCE が既存値維持）。
          fkMaps.kanriShitenIdByCode.get(str(row.kanri_shiten_code)) ?? null, // $1
          fkMaps.shitenIdByCode.get(str(row.shiten_code)) ?? null, // $2
          str(row.kumiaiin_code), // $3
          intOrNull(row.dokusya_shubetsu), // $4
          intOrNull(row.tetsuzuki_shurui), // $5
          str(row.shimei_sei), // $6
          str(row.shimei_mei), // $7
          str(row.shimei_kana_sei), // $8
          str(row.shimei_kana_mei), // $9
          Number(row.dokusya_busu ?? 0), // $10
          str(row.yubin_no), // $11
          str(row.todofuken_code), // $12
          str(row.shikuchoson), // $13
          str(row.chome_banchi), // $14
          str(row.tatemono_mei), // $15
          str(row.renrakusaki_1), // $16
          str(row.renrakusaki_2), // $17
          str(row.email), // $18
          Number(row.mail_magazine_flg ?? 0), // $19
          intOrNull(row.birth_year), // $20
          this.toGenderCode(row.gender), // $21
          sameFlg, // $22 haitatsu_same_flg — 列指定優先、未指定は配達先入力有無から導出
          str(row.haitatsu_yubin_no), // $23
          str(row.haitatsu_todofuken_code), // $24
          str(row.haitatsu_shikuchoson), // $25
          str(row.haitatsu_chome_banchi), // $26
          str(row.haitatsu_tatemono_mei), // $27
          str(row.haitatsu_renrakusaki_1), // $28
          str(row.haitatsu_renrakusaki_2), // $29
          str(row.haitatsu_shimei_sei), // $30
          str(row.haitatsu_shimei_mei), // $31
          str(row.haitatsu_shimei_kana_sei), // $32
          str(row.haitatsu_shimei_kana_mei), // $33
          fkMaps.hanbaitenIdByCode.get(str(row.hanbaiten_code)) ?? null, // $34
          fkMaps.tankaIdByCode.get(str(row.tanka_code)) ?? null, // $35
          row.yubin_kubun ?? '0', // $36
          intOrNull(row.shiharai_hoho), // $37
          intOrNull(row.dokusyaryo_shiharai_cycle), // $38
          str(row.bank_branch_code), // $39
          str(row.bank_branch_name), // $40
          this.toYokinCode(row.hikiotoshi_yokin_shubetsu), // $41
          str(row.hikiotoshi_koza_no), // $42
          str(row.hikiotoshi_koza_meigi), // $43
          str(row.dokusyaso_bunrui), // $44
          str(row.nogyosya_bunrui), // $45
          dbDateOrNull(row.dokusya_kaishi_date), // $46 (null→既存値 COALESCE)
          dbDateOrNull(row.dokusya_chushi_date), // $47
          dbDateOrNull(row.joho_henko_tekiyo_date), // $48
          str(row.biko), // $49
          updatedBy, // $50
          row.dokusya_id ?? null, // $51
          Number(session.ja_id ?? 0), // $52
          str(row.kumiaiin_code), // $53 — dokusya_id 無しのとき kumiaiin_code をキーに
        ],
      );
      affectedDokusyaId = this.extractReturnedDokusyaId(updatedAll);
    } else {
      // UPDATE_PARTIAL — only the columns in selected_columns appear in
      // the SET clause. Build it dynamically so unselected columns
      // (e.g. shimei_sei) are NOT mutated.
      const { sql, params } = this.buildPartialUpdate(
        dto.selected_columns,
        row,
        updatedBy,
        jaId,
        fkMaps,
      );
      const updatedPartial = await manager.query<Array<{ dokusya_id?: number }>>(
        sql,
        params,
      );
      affectedDokusyaId = this.extractReturnedDokusyaId(updatedPartial);
    }

    // NEW でも UPDATE/解約 でも、影響した 1 件の dokusya_id をキーに履歴を
    // 1 件作成する（共通関数）。affectedDokusyaId が取れない（=該当行なし）
    // 場合は履歴を作らない（classifyImportRow で検証済みのため通常発生しない）。
    if (affectedDokusyaId !== null) {
      // NEW: 販売店適用日は対象外(null)。読者情報変更適用日は購読開始日に揃える
      // （顧客要件 — UI create (SCR-011) と同方針）。UPDATE のみ行の入力値を採用。
      const isNewMode = dto.import_mode === 'NEW';
      await this.writeRirekiSnapshot(
        manager,
        affectedDokusyaId,
        updatedBy,
        isNewMode,
        isNewMode ? null : dbDateOrNull(row.hanbaiten_tekiyo_date), // 販売店適用日
        isNewMode
          ? dbDateOrNull(row.dokusya_kaishi_date) // NEW は購読開始日
          : dbDateOrNull(row.joho_henko_tekiyo_date), // 読者情報変更適用日
        hasHaitatsuData, // 配達先入力ありなら増減報告フラグを立てる
      );
    }
  }

  /**
   * NEW / UPDATE_ALL / UPDATE_PARTIAL / 解約 で共通の履歴スナップショット処理。
   * UI の create()/update() と **同じヘルパー**（buildHistoryFromEntity /
   * buildZenkaiSnapshot / hasZougenReportableChange / nextRirekiNo）を再利用し、
   * 2 つの登録経路（UI と Excel取込）で rireki の作り方を完全に同期させる。
   *
   * 直前に書き込んだ t_dokusya の 1 行（dokusya_id で一意特定）に対して:
   *   1. 既存「最新データ」フラグ (saishin_data_flg) を落とす
   *   2. before（直前の最新履歴）と after（現在の master）から
   *      shinki/kaiyaku/zougen/zenkai_* を算出して履歴を 1 件作成
   *   3. t_dokusya.rireki_no を最新履歴番号に同期
   * kumiaiin_code は重複可のためキーに使わず dokusya_id 単独でキーする。
   */
  private async writeRirekiSnapshot(
    manager: EntityManager,
    dokusyaId: number,
    createdBy: string,
    isNew: boolean,
    hanbaitenDate: string | null,
    johoDate: string | null,
    forceZougenHokoku = false,
  ): Promise<void> {
    // [rireki-no-race] master 行を FOR UPDATE でロックしてから採番する。UI の
    // update()/approve と同じ直列化。取込直前の UPDATE 文でも暗黙の行ロックは
    // かかるが、UI と挙動を揃え、同一購読者への同時編集（UI×取込 / 取込×取込）で
    // 両者が同じ MAX(rireki_no)+1 を読んで (dokusya_id, rireki_no) 一意制約を
    // 衝突させないことを明示的に保証する。
    await this.rireki.lockDokusyaRow(manager, dokusyaId);

    // after = 現在の master 行（INSERT/UPDATE 後）。
    const after = await manager.findOne(Dokusya, {
      where: { dokusyaId, deletedAt: IsNull() },
    });
    if (!after) return;

    // before = 直前の最新履歴（フラグを落とす前に取得）。NEW は履歴なし。
    const before = isNew
      ? null
      : await manager.findOne(DokusyaRireki, {
          where: { dokusyaId, saishinDataFlg: true },
          order: { rirekiNo: 'DESC' },
        });

    // 1. 旧「最新データ」フラグを落とす。
    await manager.update(
      DokusyaRireki,
      { dokusyaId, saishinDataFlg: true },
      { saishinDataFlg: false },
    );

    // 2. 履歴を UI 編集(update) と同じ共通ヘルパーで書き込む。情報＋販売店が同時に
    //    変わった UPDATE は適用日順に2件へ分割される（顧客要件 2026-06）。NEW は
    //    1件（手続種類=新規(1)固定 → shinki_flg=true）。
    const newRirekiNo = await this.rireki.nextRirekiNo(manager, dokusyaId);
    const shinkiFlg =
      isNew && Number(after.tetsuzukiShurui) === TetsuzukiShurui.SHINKI;
    const lastRirekiNo = await this.rireki.writeRirekiSplit(
      manager,
      // before(DokusyaRireki) は master 全カラムを持つ完全スナップショットなので
      // writeRirekiSplit（Dokusya 期待）にそのまま渡せる。
      before as unknown as Dokusya | null,
      after,
      newRirekiNo,
      {
        createdBy,
        henkoRiyu: 'Excel取込',
        shinkiFlg,
        hanbaitenDate,
        johoDate,
        forceZougenHokoku,
      },
    );

    // 3. t_dokusya.rireki_no を最新履歴番号に同期（次回編集の採番ずれ防止）。
    //    分割時は後（遅い適用日）のレコード番号に合わせる。
    await manager.update(Dokusya, { dokusyaId }, { rirekiNo: lastRirekiNo });
  }

  /**
   * Build a dynamic `UPDATE t_dokusya SET <selected> WHERE …` for
   * UPDATE_PARTIAL (api.md §4.4.3). Only columns present in
   * `selectedColumns` (and that map to a writable physical column) appear
   * in the SET clause; `dokusya_id` is the key — never written.
   *
   * The writable allow-list covers EVERY importable column (旧版は13列のみで
   * email / 住所 / 配達先 / 口座 / 単価・販売店 等が更新されない不具合があった)。
   * FK コード列（hanbaiten_code / tanka_code）は物理カラム hanbaiten_id /
   * tanka_id へ解決して書く。NOT NULL の FK・参照列は空欄上書きで制約違反に
   * ならないよう `COALESCE(:値, 既存値)` で既存値を維持する。
   */
  private buildPartialUpdate(
    selectedColumns: string[],
    row: ImportDokusyaRowDto,
    updatedBy: string,
    jaId: number,
    fkMaps: {
      tankaIdByCode: Map<string, number>;
      hanbaitenIdByCode: Map<string, number>;
      kanriShitenIdByCode: Map<string, number>;
      shitenIdByCode: Map<string, number>;
    },
  ): { sql: string; params: unknown[] } {
    const str = (v: unknown): string =>
      v === undefined || v === null ? '' : String(asScalar(v));
    const intOrNull = (v: unknown): number | null =>
      v === undefined || v === null || v === '' ? null : Number(v);
    // selectable 列名 → { 物理カラム, 値, NOT NULL なら coalesce }。
    const str_ = (k: keyof ImportDokusyaRowDto) => () => str(row[k]);
    const WRITABLE: Record<
      string,
      { col: string; value: () => unknown; coalesce?: boolean }
    > = {
      kanri_shiten_code: {
        col: 'kanri_shiten_id',
        value: () =>
          fkMaps.kanriShitenIdByCode.get(str(row.kanri_shiten_code)) ?? null,
        coalesce: true,
      },
      shiten_code: {
        col: 'shiten_id',
        value: () => fkMaps.shitenIdByCode.get(str(row.shiten_code)) ?? null,
        coalesce: true,
      },
      kumiaiin_code: { col: 'kumiaiin_code', value: str_('kumiaiin_code') },
      dokusya_shubetsu: { col: 'dokusya_shubetsu', value: () => intOrNull(row.dokusya_shubetsu), coalesce: true },
      // 手続種類は取込で変更不可（顧客要件 2026-06）— マップから除外し、
      // selected_columns に含まれても無視する。
      shimei_sei: { col: 'shimei_sei', value: str_('shimei_sei') },
      shimei_mei: { col: 'shimei_mei', value: str_('shimei_mei') },
      shimei_kana_sei: { col: 'shimei_kana_sei', value: str_('shimei_kana_sei') },
      shimei_kana_mei: { col: 'shimei_kana_mei', value: str_('shimei_kana_mei') },
      dokusya_busu: { col: 'dokusya_busu', value: () => Number(row.dokusya_busu ?? 0) },
      yubin_no: { col: 'yubin_no', value: str_('yubin_no') },
      todofuken_code: { col: 'todofuken_code', value: str_('todofuken_code') },
      shikuchoson: { col: 'shikuchoson', value: str_('shikuchoson') },
      chome_banchi: { col: 'chome_banchi', value: str_('chome_banchi') },
      tatemono_mei: { col: 'tatemono_mei', value: str_('tatemono_mei') },
      renrakusaki_1: { col: 'renrakusaki_1', value: str_('renrakusaki_1') },
      renrakusaki_2: { col: 'renrakusaki_2', value: str_('renrakusaki_2') },
      email: { col: 'email', value: str_('email') },
      mail_magazine_flg: { col: 'mail_magazine_flg', value: () => Number(row.mail_magazine_flg ?? 0) },
      birth_year: { col: 'birth_year', value: () => intOrNull(row.birth_year) },
      gender: { col: 'gender', value: () => this.toGenderCode(row.gender) },
      haitatsu_yubin_no: { col: 'haitatsu_yubin_no', value: str_('haitatsu_yubin_no') },
      haitatsu_todofuken_code: { col: 'haitatsu_todofuken_code', value: str_('haitatsu_todofuken_code') },
      haitatsu_shikuchoson: { col: 'haitatsu_shikuchoson', value: str_('haitatsu_shikuchoson') },
      haitatsu_chome_banchi: { col: 'haitatsu_chome_banchi', value: str_('haitatsu_chome_banchi') },
      haitatsu_tatemono_mei: { col: 'haitatsu_tatemono_mei', value: str_('haitatsu_tatemono_mei') },
      haitatsu_renrakusaki_1: { col: 'haitatsu_renrakusaki_1', value: str_('haitatsu_renrakusaki_1') },
      haitatsu_renrakusaki_2: { col: 'haitatsu_renrakusaki_2', value: str_('haitatsu_renrakusaki_2') },
      haitatsu_shimei_sei: { col: 'haitatsu_shimei_sei', value: str_('haitatsu_shimei_sei') },
      haitatsu_shimei_mei: { col: 'haitatsu_shimei_mei', value: str_('haitatsu_shimei_mei') },
      haitatsu_shimei_kana_sei: { col: 'haitatsu_shimei_kana_sei', value: str_('haitatsu_shimei_kana_sei') },
      haitatsu_shimei_kana_mei: { col: 'haitatsu_shimei_kana_mei', value: str_('haitatsu_shimei_kana_mei') },
      hanbaiten_code: {
        col: 'hanbaiten_id',
        value: () => fkMaps.hanbaitenIdByCode.get(str(row.hanbaiten_code)) ?? null,
        coalesce: true,
      },
      tanka_code: {
        col: 'tanka_id',
        value: () => fkMaps.tankaIdByCode.get(str(row.tanka_code)) ?? null,
        coalesce: true,
      },
      yubin_kubun: { col: 'yubin_kubun', value: () => row.yubin_kubun ?? '0' },
      shiharai_hoho: { col: 'shiharai_hoho', value: () => intOrNull(row.shiharai_hoho), coalesce: true },
      dokusyaryo_shiharai_cycle: { col: 'dokusyaryo_shiharai_cycle', value: () => intOrNull(row.dokusyaryo_shiharai_cycle) },
      bank_branch_code: { col: 'bank_branch_code', value: str_('bank_branch_code') },
      bank_branch_name: { col: 'bank_branch_name', value: str_('bank_branch_name') },
      hikiotoshi_yokin_shubetsu: { col: 'hikiotoshi_yokin_shubetsu', value: () => this.toYokinCode(row.hikiotoshi_yokin_shubetsu) },
      hikiotoshi_koza_no: { col: 'hikiotoshi_koza_no', value: str_('hikiotoshi_koza_no') },
      hikiotoshi_koza_meigi: { col: 'hikiotoshi_koza_meigi', value: str_('hikiotoshi_koza_meigi') },
      dokusyaso_bunrui: { col: 'dokusyaso_bunrui', value: str_('dokusyaso_bunrui') },
      nogyosya_bunrui: { col: 'nogyosya_bunrui', value: str_('nogyosya_bunrui') },
      // 物理カラムは date 型。空欄は null（kaishi は NOT NULL のため COALESCE で既存値維持）。
      dokusya_kaishi_date: { col: 'dokusya_kaishi_date', value: () => dbDateOrNull(row.dokusya_kaishi_date), coalesce: true },
      dokusya_chushi_date: { col: 'dokusya_chushi_date', value: () => dbDateOrNull(row.dokusya_chushi_date) },
      joho_henko_tekiyo_date: { col: 'joho_henko_tekiyo_date', value: () => dbDateOrNull(row.joho_henko_tekiyo_date) },
      biko: { col: 'biko', value: str_('biko') },
    };

    const setParts: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const col of selectedColumns) {
      if (col === 'dokusya_id') continue; // key, not written
      // 編集不可項目（購読種別 / 氏名4 / 購読開始日）は更新対象外。
      // FE では未チェック＋disable だが、改ざんで送られても無視する。
      if (IMPORT_EDIT_IMMUTABLE_COLUMNS.has(col)) continue;
      const entry = WRITABLE[col];
      if (!entry) continue;
      setParts.push(
        entry.coalesce
          ? `${entry.col} = COALESCE($${idx}, ${entry.col})`
          : `${entry.col} = $${idx}`,
      );
      params.push(entry.value());
      idx += 1;
    }
    // 「購読者情報と同じ」(haitatsu_same_flg) が選択列にあり明示指定されたら
    // その値を採用（顧客要件 2026-06 — BE は推論しない）。未選択/未指定なら
    // 従来どおり、選択された配達先列に値があれば「別住所」(false) に下ろす。
    // （いずれもリテラル代入のためパラメータ番号 idx には影響しない）。
    if (
      selectedColumns.includes('haitatsu_same_flg') &&
      row.haitatsu_same_flg !== undefined
    ) {
      setParts.push(`haitatsu_same_flg = ${Boolean(row.haitatsu_same_flg)}`);
    } else if (this.hasHaitatsuDeliveryData(row, selectedColumns)) {
      setParts.push('haitatsu_same_flg = false');
    }
    // Always bump updated_by + updated_at.
    setParts.push(`updated_by = $${idx}`);
    params.push(updatedBy);
    idx += 1;
    setParts.push('updated_at = NOW()');

    const keyIdx = idx;
    params.push(row.dokusya_id ?? null);
    idx += 1;
    const jaIdx = idx;
    params.push(jaId);
    idx += 1;
    const kumiIdx = idx;
    params.push(str(row.kumiaiin_code));

    // dokusya_id 無しのときは kumiaiin_code をキーに更新する
    // （resolveExistingRow と同じキー解決にそろえる）。
    const sql = `UPDATE t_dokusya
        SET ${setParts.join(', ')}
      WHERE ja_id = $${jaIdx}
        AND (($${keyIdx}::bigint IS NOT NULL AND dokusya_id = $${keyIdx})
             OR ($${kumiIdx} <> '' AND kumiaiin_code = $${kumiIdx}))
        AND deleted_at IS NULL
    RETURNING dokusya_id, rireki_no`;
    return { sql, params };
  }
}

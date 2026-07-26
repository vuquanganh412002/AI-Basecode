import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';

import { ItakuKubun, LogType, ResultStatus } from '@/common/enums';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import {
  DataScopeViolationException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import type { SessionPayload } from '@/modules/auth/session.service';

import {
  ImportHanbaitenDto,
  ImportHanbaitenRowDto,
} from './dto/import-hanbaiten.dto';
import { ImportValidationException } from './exceptions/import-validation.exception';
import { RowLimitExceededException } from './exceptions/row-limit-exceeded.exception';
import {
  IMPORT_COLUMN_TO_FIELD,
  IMPORT_FIELD_EMPTY_DEFAULT,
  IMPORT_MAX_ROWS,
  IMPORT_TEMPLATE_COLUMNS,
  IMPORT_TEMPLATE_PHYSICAL_COLUMNS,
  IMPORT_TEMPLATE_SAMPLE_ROW,
} from './dto/import-template.constants';

/** SCR-019 — 販売店Excelデータ取込画面 audit-context label. */
const SCR019_SCREEN_NAME = '販売店Excelデータ取込画面 (ACSMS-SCR-019)';

/**
 * SCR-019 監査ログ用テーブル名（t_log.target_table）。core 側
 * HanbaitenService と同一値だが、本サービス内で完結させるため複製して保持する。
 */
const TABLE_NAME = 'm_hanbaiten';

/**
 * SCR-019 import — bank fields that become REQUIRED when the EFFECTIVE
 * itaku_kubun of a row is 1 (振込). Per api.md §4.1 this list is SIX
 * fields and deliberately EXCLUDES koza_meigi — narrower than the
 * SCR-017 create form's 7-field `CONDITIONAL_REQUIRED_FIELDS` (spec
 * decision; bulk import does not force the account holder name).
 */
const IMPORT_FURIKOMI_REQUIRED_FIELDS: ReadonlyArray<{
  key:
    | 'bank_code'
    | 'bank_name'
    | 'bank_branch_code'
    | 'bank_branch_name'
    | 'yokin_shubetsu'
    | 'koza_no';
  label: string;
}> = [
  { key: 'bank_code', label: '金融機関コード' },
  { key: 'bank_name', label: '金融機関名' },
  { key: 'bank_branch_code', label: '口座支店コード' },
  { key: 'bank_branch_name', label: '口座支店名' },
  { key: 'yokin_shubetsu', label: '口座種別' },
  { key: 'koza_no', label: '口座番号' },
];

/**
 * Existing-row shape fetched in the import existence pre-check — carries
 * the columns the conditional-required guard needs to compute the
 * EFFECTIVE post-import value of a row in UPDATE mode (TC-019-040:
 * an unselected bank field that is already blank in the DB must still
 * trip the 振込 check).
 */
interface ImportExistingRow {
  hanbaiten_id: number;
  hanbaiten_code: string;
  itaku_kubun: number | null;
  furikomi_tesuryo_futan_kubun: number | null;
  bank_code: string;
  bank_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  yokin_shubetsu: number | null;
  koza_no: string;
}

/**
 * SCR-019 — 販売店Excelデータ取込 concern。テンプレートDL + importExcel +
 * 取込専用の private ヘルパを HanbaitenService から verbatim 切り出した
 * サービス。`codeService` / `tankaRepo` は core 側と同様 `@Optional()` で
 * 注入（取込内の null-guard `if (... && this.tankaRepo)` /
 * `const cs = this.codeService` をそのまま動かすため）。
 */
@Injectable()
export class HanbaitenImportService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    @Optional() private readonly codeService?: CodeService,
    @Optional()
    @InjectRepository(Tanka)
    private readonly tankaRepo?: Repository<Tanka>,
  ) {}

  // ─── ACSMS-API-019-001 — GET /api/v1/hanbaiten/import/template ────────
  /**
   * Canonical 23-column header list — also referenced by integration
   * specs to assert the template payload. Public so the controller-
   * and integration-layer tests can assert against the same source.
   */
  getImportTemplateColumns(): string[] {
    return [...IMPORT_TEMPLATE_COLUMNS];
  }

  /**
   * Generate the Excel template — 1 worksheet, 1 header row carrying
   * the 23 Japanese column names in canonical order. Read-only
   * operation (no audit log written) per api.md §4 — template
   * download is a discovery action, not a state change.
   *
   * `session` is unused in body but kept on the signature so the
   * spec contract stays explicit about who is permitted to call
   * (guard handles the permission, this method assumes the caller
   * has already passed the gate).
   */
  async downloadImportTemplate(_session: SessionPayload): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'agrinews';
    const sheet = workbook.addWorksheet('販売店');
    const headers = this.getImportTemplateColumns();
    sheet.addRow(headers);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    // [sample-row] Ship one ready-to-import sample row (row 2) in header
    // order so users see the expected shape and can import immediately
    // (edit before real use). See IMPORT_TEMPLATE_SAMPLE_ROW for why it's
    // dependency-free (itaku_kubun=2 → no bank fields, no 単価コード).
    sheet.addRow(
      IMPORT_TEMPLATE_PHYSICAL_COLUMNS.map(
        (col) => IMPORT_TEMPLATE_SAMPLE_ROW[col] ?? '',
      ),
    );
    // Give every column a readable default width — exact 16 chars is
    // wide enough for the longest column name '配達手数料支払サイクル' (12 JP chars).
    sheet.columns = headers.map(() => ({ width: 16 }));
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  }

  // ─── ACSMS-API-019-002 — POST /api/v1/hanbaiten/import ────────────────
  /**
   * Bulk-import 販売店 rows. Two modes (api.md §4.4, 顧客要件 2026-07):
   *   NEW    — INSERT each row; rejects on existing hanbaiten_code within
   *            the caller's JA.
   *   UPDATE — UPDATE only `selected_columns` (unselected columns keep their
   *            existing DB value); rejects on missing hanbaiten_code. 全列
   *            更新は全列を selected_columns に含める。旧 UPDATE_ALL は廃止。
   *
   * Validation order (all PRE-transaction so a single failed row
   * short-circuits before any DB write):
   *   1. [row-limit-guard]        — 501+ rows → ROW_LIMIT_EXCEEDED.
   *   2. [partial-key-guard]      — UPDATE must include
   *                                  hanbaiten_code in selected_columns.
   *   3. [data-scope]             — session.ja_id is authoritative;
   *                                  null (NICHINO_STAFF) rejected.
   *   4. [m-code-validation]      — itaku_kubun / furikomi_tesuryo_futan_kubun /
   *                                  yokin_shubetsu via CodeService.
   *   5. [batch-duplicate-guard]  — within-batch hanbaiten_code clash.
   *   6. [type-guard]             — furikomi_tesuryo-style fields that
   *                                  survived DTO as non-numeric strings
   *                                  (FILE_FORMAT-shaped).
   *   7. [existence-precheck]     — NEW: must NOT exist; UPDATE: MUST
   *                                  exist. Single SELECT via ANY().
   *   8. [tanka-fk-resolution]    — haitatsuryo_tanka_code → tanka_id,
   *                                  filtered by ja_id (Layer 4 guard).
   *
   * After all pre-checks pass: one `dataSource.transaction(...)` wraps
   * every INSERT/UPDATE + a single audit-log row (`IMPORT_NEW` /
   * `IMPORT_UPDATE_PARTIAL`). Mid-batch failures
   * roll back atomically; the error-log row is written AFTER the
   * rollback on the standalone connection so the failure trace
   * survives.
   */
  async importExcel(
    body: ImportHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{
    data: {
      import_mode: string;
      total_rows: number;
      created_count: number;
      updated_count: number;
      skipped_count: number;
      imported_at: string;
    };
    message: string;
  }> {
    // [row-limit-guard] — defence-in-depth; DTO @ArrayMaxSize(500)
    // catches this for normal clients.
    if (body.rows.length > IMPORT_MAX_ROWS) {
      throw new RowLimitExceededException();
    }

    // [partial-key-guard] — UPDATE must carry hanbaiten_code in
    // selected_columns; without it the SET clause has nothing to anchor on.
    // Surface as VALIDATION_ERROR (not IMPORT_VALIDATION_ERROR) because the
    // failure is on the top-level array, not a row.
    if (
      body.import_mode === 'UPDATE' &&
      !body.selected_columns.includes('hanbaiten_code')
    ) {
      throw new ValidationException([
        {
          field: 'selected_columns',
          message: 'selected_columns には hanbaiten_code を含めてください。',
        },
      ]);
    }

    // [data-scope] — session.ja_id is authoritative; a JA-less session
    // cannot import. Defense-in-depth: NICHINO_STAFF and NICHINO_ADMIN
    // (both ja_id null) do NOT hold `hanbaiten.import` — it was revoked
    // from NICHINO_STAFF on 2026-06 (migration 1711900900017) and never
    // granted to NICHINO_ADMIN — so the controller's @Permissions gate
    // already 403s them. Only the 3 JA-scoped roles (CHUOKAI / JA_HONTEN
    // / JA_KANRI_SHITEN) reach here and they always carry a ja_id. This
    // guard stays as a backstop against a future mis-grant; 販売店
    // Excel取込 is NOT a 代行入力 feature (confirmed 2026-06).
    if (session.ja_id == null) {
      throw new DataScopeViolationException();
    }
    const targetJaId = Number(session.ja_id);

    const errors: Array<{ row: number; field: string; message: string }> = [];

    this.collectBatchDuplicateCodeErrors(body.rows, errors);
    this.collectImportRowMcodeErrors(body.rows, errors);

    // [existence-precheck] — fetch any rows whose hanbaiten_code matches
    // in the caller's JA. NEW mode treats a hit as "duplicate"; UPDATE_*
    // mode treats a miss as "not found".
    const codes = Array.from(
      new Set(body.rows.map((r) => r.hanbaiten_code).filter(Boolean)),
    );
    const existingRows: ImportExistingRow[] = codes.length === 0
      ? []
      : await this.dataSource.query(
          `SELECT hanbaiten_id, hanbaiten_code, itaku_kubun,
                  furikomi_tesuryo_futan_kubun,
                  bank_code, bank_name, bank_branch_code, bank_branch_name,
                  yokin_shubetsu, koza_no
             FROM m_hanbaiten
            WHERE ja_id = $1 AND hanbaiten_code = ANY($2::text[]) AND deleted_at IS NULL`,
          [targetJaId, codes],
        );
    const existingMap = new Map(
      existingRows.map((r) => [r.hanbaiten_code, Number(r.hanbaiten_id)]),
    );
    // Full-row map keyed by code — the conditional-required guard merges
    // these existing values with the Excel cells for UPDATE.
    const existingDataMap = new Map(
      existingRows.map((r) => [r.hanbaiten_code, r]),
    );

    this.collectExistenceErrors(body.rows, body.import_mode, existingMap, errors);
    this.collectImportConditionalRequiredErrors(
      body.rows,
      body.import_mode,
      body.selected_columns,
      existingDataMap,
      errors,
    );
    this.collectImportRequiredKubunErrors(
      body.rows,
      body.import_mode,
      body.selected_columns,
      existingDataMap,
      errors,
    );

    // [tanka-fk-resolution] — resolve haitatsuryo_tanka_code → tanka_id.
    // Cross-tenant tankas are rejected the same way as missing ones
    // (Layer 4 guard). Extracted helper handles both the resolution and
    // the "not found" row errors.
    const tankaIdMap = await this.resolveImportTankaIds(
      body.rows,
      targetJaId,
      errors,
    );

    // Short-circuit — if anything failed pre-check, throw BEFORE
    // dataSource.transaction opens (api.md §4.3 — pre-check phase
    // strictly precedes §4.4 transaction phase).
    if (errors.length > 0) {
      throw new ImportValidationException(errors);
    }

    // [todofuken-default] — m_hanbaiten.todofuken_code is NOT NULL with
    // FK to m_todofuken. The Excel template does not carry 都道府県
    // (api.md §テンプレートファイル仕様), so default to the caller's
    // JA prefecture. Lookup happens once per import (one row).
    const jaTodofuken = await this.dataSource.query<Array<{ todofuken_code: string }>>(
      `SELECT todofuken_code FROM m_ja WHERE ja_id = $1 AND deleted_at IS NULL`,
      [targetJaId],
    );
    const defaultTodofukenCode = jaTodofuken[0]?.todofuken_code ?? '';

    // [transaction-phase] — all DML + a single audit row commit (or
    // roll back) together. Error log lives OUTSIDE so the failure
    // trace survives any rollback.
    const importedAt = new Date().toISOString();
    let createdCount = 0;
    let updatedCount = 0;
    const createdIds: number[] = [];

    // UPDATE は選択列のみ更新（partial 相当）。監査 operation は既存の
    // IMPORT_UPDATE_PARTIAL を再利用する（過去ログ互換のため enum は変えない）。
    const operation =
      body.import_mode === 'NEW' ? 'IMPORT_NEW' : 'IMPORT_UPDATE_PARTIAL';

    try {
      await this.dataSource.transaction(async (manager) => {
        for (const row of body.rows) {
          const tankaId = row.haitatsuryo_tanka_code
            ? tankaIdMap.get(row.haitatsuryo_tanka_code) ?? null
            : null;

          if (body.import_mode === 'NEW') {
            const saved = await this.applyImportRowNew(manager, row, {
              targetJaId,
              defaultTodofukenCode,
              tankaId,
              session,
              selectedColumns: body.selected_columns,
            });
            createdCount += 1;
            createdIds.push(Number(saved.hanbaitenId));
          } else {
            // UPDATE — 選択列のみ更新（未選択列は既存DB値を維持）。全列更新は
            // selected_columns に全列が含まれる形で実現する。
            await this.applyImportRowUpdatePartial(manager, row, {
              existingMap,
              selectedColumns: body.selected_columns,
              tankaId,
              session,
            });
            updatedCount += 1;
          }
        }

        // [audit-log-in-tx] — one summary row per import call. Atomicity
        // holds because the INSERT goes through `manager`.
        const ctx = buildAuditCtx(
          session,
          req,
          SCR019_SCREEN_NAME,
          TABLE_NAME,
          null,
        );
        const after = {
          import_mode: body.import_mode,
          total_rows: body.rows.length,
          created_count: createdCount,
          updated_count: updatedCount,
          created_ids: createdIds,
          imported_at: importedAt,
        };
        // 取込はバッチ操作なので「1回の取込につき監査ログ1行」。操作種別は
        // 非標準ラベル (IMPORT_NEW / IMPORT_UPDATE_PARTIAL)
        // を logOperation で直接記録する。以前は spec を通すために logCreate /
        // logUpdate も併発しており t_log が1取込で2行（CREATE + IMPORT_NEW 等）
        // になっていた — その重複を排除し logOperation 1本に統一。
        if (body.import_mode === 'NEW') {
          await this.auditLog.logOperation(
            {
              logType: LogType.USER_OPERATION,
              accountId: ctx.accountId,
              jaId: ctx.jaId,
              gamenName: ctx.screen,
              operation,
              resultStatus: ResultStatus.SUCCESS,
              targetId: null,
              targetTable: ctx.table,
              afterValue: JSON.stringify(after),
              ipAddress: ctx.ipAddress,
              userAgent: ctx.userAgent,
            },
            manager,
          );
        } else {
          const before = {
            import_mode: body.import_mode,
            target_codes: codes,
          };
          await this.auditLog.logOperation(
            {
              logType: LogType.USER_OPERATION,
              accountId: ctx.accountId,
              jaId: ctx.jaId,
              gamenName: ctx.screen,
              operation,
              resultStatus: ResultStatus.SUCCESS,
              targetId: null,
              targetTable: ctx.table,
              beforeValue: JSON.stringify(before),
              afterValue: JSON.stringify(after),
              ipAddress: ctx.ipAddress,
              userAgent: ctx.userAgent,
            },
            manager,
          );
        }
      });
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back transaction.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCR019_SCREEN_NAME, TABLE_NAME, null),
        operation,
        err as Error,
      );
      throw err;
    }

    return {
      data: {
        import_mode: body.import_mode,
        total_rows: body.rows.length,
        created_count: createdCount,
        updated_count: updatedCount,
        skipped_count: 0,
        imported_at: importedAt,
      },
      message: '取り込みました。',
    };
  }

  // ──────────────────────────────────────────────────────────────
  // SCR-019 import — batch-duplicate guard. Same hanbaiten_code
  //                  appearing twice in one upload is a row-level error
  //                  rather than a DB constraint violation. Extracted
  //                  from importExcel to keep that function's complexity
  //                  below the Sonar S3776 threshold.
  // ──────────────────────────────────────────────────────────────
  // SCR-019 import — existence-check vs import_mode:
  //   NEW → existing code is a duplicate-error;
  //   UPDATE_* → missing code is a not-found-error.
  // Extracted from importExcel to keep S3776 below threshold.
  // ──────────────────────────────────────────────────────────────
  private collectExistenceErrors(
    rows: ImportHanbaitenRowDto[],
    importMode: ImportHanbaitenDto['import_mode'],
    existingMap: Map<string, number>,
    errors: Array<{ row: number; field: string; message: string }>,
  ): void {
    const isNew = importMode === 'NEW';
    const message = isNew
      ? '同一の販売店コードが既に登録されています。'
      : '指定された販売店コードが存在しません。';
    rows.forEach((row, idx) => {
      const code = row.hanbaiten_code;
      if (!code) return;
      const has = existingMap.has(code);
      if (isNew ? has : !has) {
        errors.push({ row: idx + 2, field: 'hanbaiten_code', message });
      }
    });
  }

  // SCR-019 import — fetch tanka_id for every haitatsuryo_tanka_code
  // referenced by the batch (filtered by jaId for Layer 4) and report
  // rows whose code didn't resolve. Returns the lookup map for the
  // INSERT/UPDATE phase to consume.
  // ──────────────────────────────────────────────────────────────
  private async resolveImportTankaIds(
    rows: ImportHanbaitenRowDto[],
    targetJaId: number,
    errors: Array<{ row: number; field: string; message: string }>,
  ): Promise<Map<string, number>> {
    const tankaCodes = Array.from(
      new Set(
        rows
          .map((r) => r.haitatsuryo_tanka_code)
          .filter((c): c is string => typeof c === 'string' && c.length > 0),
      ),
    );
    const tankaIdMap = new Map<string, number>();
    if (tankaCodes.length > 0 && this.tankaRepo) {
      const found = await this.tankaRepo.find({
        where: tankaCodes.map((code) => ({
          tankaCode: code,
          jaId: targetJaId,
          deletedAt: IsNull(),
        })),
      });
      for (const t of found) {
        tankaIdMap.set(t.tankaCode, Number(t.tankaId));
      }
    }
    rows.forEach((row, idx) => {
      const code = row.haitatsuryo_tanka_code;
      if (code && !tankaIdMap.has(code)) {
        errors.push({
          row: idx + 2,
          field: 'haitatsuryo_tanka_code',
          message: '指定された配達手数料単価コードが見つかりません。',
        });
      }
    });
    return tankaIdMap;
  }

  private collectBatchDuplicateCodeErrors(
    rows: ImportHanbaitenRowDto[],
    errors: Array<{ row: number; field: string; message: string }>,
  ): void {
    const seenCodes = new Set<string>();
    rows.forEach((row, idx) => {
      const code = row.hanbaiten_code;
      if (!code) return;
      if (seenCodes.has(code)) {
        errors.push({
          row: idx + 2,
          field: 'hanbaiten_code',
          message: '同一の販売店コードが取込ファイル内で重複しています。',
        });
      } else {
        seenCodes.add(code);
      }
    });
  }

  // SCR-019 import — pre-check m_code values + numeric-only type
  //                  guard per row. Extracted from `importExcel` to
  //                  keep that function's complexity below threshold.
  // ──────────────────────────────────────────────────────────────
  private collectImportRowMcodeErrors(
    rows: ImportHanbaitenRowDto[],
    errors: Array<{ row: number; field: string; message: string }>,
  ): void {
    // [m-code-validation] — itaku_kubun / furikomi_tesuryo_futan_kubun / yokin_shubetsu
    // values must be present in m_code (or be omitted). CodeService is
    // optional on the service constructor; without it skip the check
    // (the spec's SCR-018 4-arg constructor leaves it undefined, but
    // SCR-019 always wires it through `requireCodeService`).
    const cs = this.codeService;
    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      if (row.itaku_kubun != null && cs && !cs.has('ITAKU_KUBUN', row.itaku_kubun)) {
        errors.push({
          row: rowNo,
          field: 'itaku_kubun',
          message: '委託区分の値が不正です。',
        });
      }
      if (row.furikomi_tesuryo_futan_kubun != null && cs && !cs.has('TESURYO_KUBUN', row.furikomi_tesuryo_futan_kubun)) {
        errors.push({
          row: rowNo,
          field: 'furikomi_tesuryo_futan_kubun',
          message: '振込手数料負担区分の値が不正です。',
        });
      }
      if (row.yokin_shubetsu != null && cs && !cs.has('YOKIN_SHUBETSU', row.yokin_shubetsu)) {
        errors.push({
          row: rowNo,
          field: 'yokin_shubetsu',
          message: '口座種別の値が不正です。',
        });
      }
      // [type-guard] — Numeric-only fields that may have slipped past the
      // DTO (`@IsInt()` does NOT fire when caller bypasses the
      // ValidationPipe — e.g. service-direct test calls). Surface as
      // an IMPORT_VALIDATION_ERROR field so the FE can highlight the
      // offending row + column.
      if (
        row.furikomi_tesuryo != null &&
        typeof row.furikomi_tesuryo !== 'number'
      ) {
        errors.push({
          row: rowNo,
          field: 'furikomi_tesuryo',
          message: '振込手数料は数値で入力してください。',
        });
      }
    });
  }

  // SCR-019 import — conditional-required guard (api.md §4.1): when a
  //                  row's EFFECTIVE itaku_kubun is 1 (振込), the 6 bank
  //                  fields must be non-blank. "Effective" merges the
  //                  Excel cell with the existing DB row per mode:
  //                    NEW            — selected ? cell : default(blank)
  //                    UPDATE — selected ? cell : existing DB value
  //                  (TC-019-040: an unselected, already-blank bank field
  //                   still trips the check). koza_meigi excluded per spec.
  // ──────────────────────────────────────────────────────────────
  private collectImportConditionalRequiredErrors(
    rows: ImportHanbaitenRowDto[],
    importMode: ImportHanbaitenDto['import_mode'],
    selectedColumns: string[],
    existingDataMap: Map<string, ImportExistingRow>,
    errors: Array<{ row: number; field: string; message: string }>,
  ): void {
    const sel = new Set(selectedColumns);
    rows.forEach((row, idx) => {
      const cell = row as unknown as Record<string, unknown>;
      const existing = existingDataMap.get(row.hanbaiten_code) as
        | Record<string, unknown>
        | undefined;
      // Effective post-import value of a column for this row + mode.
      const effective = (field: string): unknown => {
        if (importMode === 'NEW') return sel.has(field) ? cell[field] : undefined;
        // UPDATE — keep the existing DB value for unselected columns.
        return sel.has(field) ? cell[field] : existing?.[field];
      };

      if (effective('itaku_kubun') !== ItakuKubun.FURIKOMI) return;

      for (const { key, label } of IMPORT_FURIKOMI_REQUIRED_FIELDS) {
        const v = effective(key);
        const blank =
          v === undefined ||
          v === null ||
          (typeof v === 'string' && v.trim() === '');
        if (blank) {
          errors.push({
            row: idx + 2,
            field: key,
            message: `委託区分が振込の場合は${label}は必須です。`,
          });
        }
      }
    });
  }

  // SCR-019 import — 委託区分 / 振込手数料負担区分 は必須（顧客要件・作成/更新
  //                  画面と同方針）。EFFECTIVE 値が空なら必須エラー。
  //                    NEW    — selected ? cell : blank（＝未選択は必須違反）
  //                    UPDATE — selected ? cell : existing DB value
  //                  （未選択で既存DBに値があれば維持・エラーにしない）。
  // ──────────────────────────────────────────────────────────────
  private collectImportRequiredKubunErrors(
    rows: ImportHanbaitenRowDto[],
    importMode: ImportHanbaitenDto['import_mode'],
    selectedColumns: string[],
    existingDataMap: Map<string, ImportExistingRow>,
    errors: Array<{ row: number; field: string; message: string }>,
  ): void {
    const sel = new Set(selectedColumns);
    const REQUIRED_KUBUN: ReadonlyArray<{ key: string; label: string }> = [
      { key: 'itaku_kubun', label: '委託区分' },
      { key: 'furikomi_tesuryo_futan_kubun', label: '振込手数料負担区分' },
    ];
    rows.forEach((row, idx) => {
      const cell = row as unknown as Record<string, unknown>;
      const existing = existingDataMap.get(row.hanbaiten_code) as
        | Record<string, unknown>
        | undefined;
      const effective = (field: string): unknown => {
        if (importMode === 'NEW') return sel.has(field) ? cell[field] : undefined;
        return sel.has(field) ? cell[field] : existing?.[field];
      };
      for (const { key, label } of REQUIRED_KUBUN) {
        const v = effective(key);
        const blank =
          v === undefined ||
          v === null ||
          (typeof v === 'string' && v.trim() === '');
        if (blank) {
          errors.push({
            row: idx + 2,
            field: key,
            message: `${label}は必須です。`,
          });
        }
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // SCR-019 import — per-row INSERT/UPDATE branches (extracted from
  //                  the transaction callback to keep complexity low)
  // ──────────────────────────────────────────────────────────────
  private async applyImportRowNew(
    manager: EntityManager,
    row: ImportHanbaitenRowDto,
    ctx: {
      targetJaId: number;
      defaultTodofukenCode: string;
      tankaId: number | null;
      session: SessionPayload;
      selectedColumns: string[];
    },
  ): Promise<Hanbaiten> {
    const { targetJaId, defaultTodofukenCode, tankaId, session, selectedColumns } =
      ctx;
    // [selected-columns-honoured] api.md §4.4.1 — columns NOT in
    // selected_columns are written with their default value (空文字 /
    // NULL / false), NOT the Excel cell. Mirrors the FE 取込列 toggle:
    // unchecking an optional column in 新規登録 means "insert the default
    // for it". hanbaiten_code (key) + todofuken_code (auto-derived from
    // the JA, not a template column) are always written.
    const sel = new Set(selectedColumns);
    // `pick(col, value, dflt)` — keep the Excel value when the column is
    // selected, otherwise fall back to the column's empty default.
    const pick = <T>(col: string, value: T, dflt: T): T =>
      sel.has(col) ? value : dflt;
    const entity = manager.create(Hanbaiten, {
      jaId: targetJaId,
      hanbaitenCode: row.hanbaiten_code,
      todofukenCode: defaultTodofukenCode,
      hanbaitenName: pick('hanbaiten_name', row.hanbaiten_name ?? '', ''),
      hanbaitenNameKana: pick(
        'hanbaiten_name_kana',
        row.hanbaiten_name_kana ?? '',
        '',
      ),
      torihikisakiNo: pick('torihikisaki_no', row.torihikisaki_no ?? '', ''),
      yubinNo: pick('yubin_no', row.yubin_no ?? '', ''),
      address: pick('address', row.address ?? '', ''),
      tel: pick('tel', row.tel ?? '', ''),
      fax: pick('fax', row.fax ?? '', ''),
      shochoName: pick('shocho_name', row.shocho_name ?? '', ''),
      itakuKubun: pick('itaku_kubun', row.itaku_kubun ?? null, null),
      haitatsuryoTankaId: pick('haitatsuryo_tanka_code', tankaId, null),
      haitatsuryoShiharaiCycle: pick(
        'haitatsuryo_shiharai_cycle',
        row.haitatsuryo_shiharai_cycle ?? null,
        null,
      ),
      furikomiTesuryoFutanKubun: pick(
        'furikomi_tesuryo_futan_kubun',
        row.furikomi_tesuryo_futan_kubun ?? null,
        null,
      ),
      furikomiTesuryo: pick('furikomi_tesuryo', row.furikomi_tesuryo ?? null, null),
      bankCode: pick('bank_code', row.bank_code ?? '', ''),
      bankName: pick('bank_name', row.bank_name ?? '', ''),
      bankBranchCode: pick('bank_branch_code', row.bank_branch_code ?? '', ''),
      bankBranchName: pick('bank_branch_name', row.bank_branch_name ?? '', ''),
      yokinShubetsu: pick('yokin_shubetsu', row.yokin_shubetsu ?? null, null),
      kozaNo: pick('koza_no', row.koza_no ?? '', ''),
      kozaMeigi: pick('koza_meigi', row.koza_meigi ?? '', ''),
      haitenFlg: pick('haiten_flg', row.haiten_flg ?? false, false),
      biko: pick('biko', row.biko ?? '', ''),
      createdBy: String(session.account_id),
      updatedBy: String(session.account_id),
    });
    return manager.save(Hanbaiten, entity);
  }

  private async applyImportRowUpdatePartial(
    manager: EntityManager,
    row: ImportHanbaitenRowDto,
    ctx: {
      existingMap: Map<string, number>;
      selectedColumns: string[];
      tankaId: number | null;
      session: SessionPayload;
    },
  ): Promise<void> {
    const { existingMap, selectedColumns, tankaId, session } = ctx;
    const existingId = existingMap.get(row.hanbaiten_code)!;
    const payload: Partial<Hanbaiten> = {
      updatedBy: String(session.account_id),
    };
    for (const col of selectedColumns) {
      if (col === 'hanbaiten_code') continue;
      if (col === 'haitatsuryo_tanka_code') {
        payload.haitatsuryoTankaId = tankaId;
        continue;
      }
      const entityField = IMPORT_COLUMN_TO_FIELD[col];
      if (!entityField) continue;
      const raw = (row as unknown as Record<string, unknown>)[col];
      // For empty cells, fall back to the column's NOT NULL default
      // (empty string / false). Nullable columns (numeric / enum) are
      // not in the map so they pass through as null.
      const fallback = Object.hasOwn(IMPORT_FIELD_EMPTY_DEFAULT, entityField)
        ? IMPORT_FIELD_EMPTY_DEFAULT[entityField]
        : null;
      (payload as Record<string, unknown>)[entityField] =
        raw == null || raw === '' ? fallback : raw;
    }
    await manager.update(Hanbaiten, { hanbaitenId: existingId }, payload);
  }
}

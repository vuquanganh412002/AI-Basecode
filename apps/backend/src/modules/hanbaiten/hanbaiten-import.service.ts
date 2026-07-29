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

/** SCR-019 — 販売店Excelデータ取込画面。監査コンテキストのラベル。 */
const SCR019_SCREEN_NAME = '販売店Excelデータ取込画面 (ACSMS-SCR-019)';

/**
 * SCR-019 監査ログ用テーブル名（t_log.target_table）。core 側と同値だが本
 * サービス内で完結させるため複製して保持。
 */
const TABLE_NAME = 'm_hanbaiten';

/**
 * SCR-019 取込 — 行の EFFECTIVE itaku_kubun が 1（振込）のとき必須になる銀行項目。
 * api.md §4.1 では 6 項目で、koza_meigi を意図的に除外 — SCR-017 作成フォームの
 * 7 項目 `CONDITIONAL_REQUIRED_FIELDS` より狭い（spec 判断：一括取込は口座名義を強制しない）。
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
 * 取込の存在 pre-check で取得する既存行の形 — UPDATE モードで行の EFFECTIVE
 * 取込後値を算出するのに conditional-required ガードが必要とする列を持つ
 * （TC-019-040：DB で既に空の未選択銀行項目も 振込 チェックを発火させる）。
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
   * 正準 23 列ヘッダ一覧（integration spec もテンプレート検証に参照）。
   * controller/integration テストが同一ソースを検証できるよう public。
   */
  getImportTemplateColumns(): string[] {
    return [...IMPORT_TEMPLATE_COLUMNS];
  }

  /**
   * Excel テンプレート生成 — 1 worksheet・正準順の 23 日本語列名を持つヘッダ 1 行。
   * 読取専用（監査ログ無し・api.md §4 — テンプレDLは状態変更でなく discovery）。
   *
   * `session` は body 未使用だが、呼出許可者を spec 契約で明示するため signature に保持
   * （許可は guard 担当・本メソッドは通過済みを前提）。
   */
  async downloadImportTemplate(_session: SessionPayload): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'agrinews';
    const sheet = workbook.addWorksheet('販売店');
    const headers = this.getImportTemplateColumns();
    sheet.addRow(headers);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    // [sample-row] ヘッダ順で即取込可能なサンプル行(row 2)を同梱し、期待形を提示
    // （実利用前に編集）。依存無しの理由は IMPORT_TEMPLATE_SAMPLE_ROW 参照
    // （itaku_kubun=2 → 銀行項目・単価コード不要）。
    sheet.addRow(
      IMPORT_TEMPLATE_PHYSICAL_COLUMNS.map(
        (col) => IMPORT_TEMPLATE_SAMPLE_ROW[col] ?? '',
      ),
    );
    // 全列に読みやすい既定幅 16 — 最長列名 '配達手数料支払サイクル'(12 文字)に十分。
    sheet.columns = headers.map(() => ({ width: 16 }));
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  }

  // ─── ACSMS-API-019-002 — POST /api/v1/hanbaiten/import ────────────────
  /**
   * 販売店を一括取込。2 モード（api.md §4.4, 顧客要件 2026-07）:
   *   NEW    — 各行 INSERT。自 JA 内で既存 hanbaiten_code は拒否。
   *   UPDATE — `selected_columns` の列のみ UPDATE（未選択列は既存 DB 値を維持）、
   *            hanbaiten_code 不在は拒否。全列更新は全列を selected_columns に
   *            含める。旧 UPDATE_ALL は廃止。
   *
   * 検証順（全て PRE-transaction。1 行失敗で DB 書込前に短絡）:
   *   1. [row-limit-guard]        — 501 行以上 → ROW_LIMIT_EXCEEDED。
   *   2. [partial-key-guard]      — UPDATE は selected_columns に hanbaiten_code 必須。
   *   3. [data-scope]             — session.ja_id が権威。null(NICHINO_STAFF)は拒否。
   *   4. [m-code-validation]      — itaku_kubun / furikomi_tesuryo_futan_kubun /
   *                                  yokin_shubetsu を CodeService で検証。
   *   5. [batch-duplicate-guard]  — バッチ内 hanbaiten_code 衝突。
   *   6. [type-guard]             — DTO を非数値文字列で通過した furikomi_tesuryo 系
   *                                  (FILE_FORMAT 形)。
   *   7. [existence-precheck]     — NEW: 非存在必須、UPDATE: 存在必須。ANY() で 1 SELECT。
   *   8. [tanka-fk-resolution]    — haitatsuryo_tanka_code → tanka_id、ja_id 絞込(Layer 4)。
   *
   * 全 pre-check 通過後、1 つの `dataSource.transaction(...)` が全 INSERT/UPDATE +
   * 監査 1 行（`IMPORT_NEW` / `IMPORT_UPDATE_PARTIAL`）を包む。途中失敗は原子的に
   * ロールバック。エラーログ行はロールバック後に standalone 接続で書きトレースを残す。
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
    // [row-limit-guard] — 多層防御。通常クライアントは DTO @ArrayMaxSize(500) で捕捉。
    if (body.rows.length > IMPORT_MAX_ROWS) {
      throw new RowLimitExceededException();
    }

    // [partial-key-guard] — UPDATE は selected_columns に hanbaiten_code 必須
    // （無いと SET 句の基点が無い）。失敗は行でなくトップ配列なので
    // VALIDATION_ERROR（IMPORT_VALIDATION_ERROR でなく）で返す。
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

    // [data-scope] — session.ja_id が権威。JA 無しセッションは取込不可。多層防御:
    // NICHINO_STAFF / NICHINO_ADMIN（共に ja_id null）は `hanbaiten.import` を持たない
    // — NICHINO_STAFF は 2026-06 に剥奪(migration 1711900900017)、NICHINO_ADMIN には
    // 未付与 — なので controller の @Permissions が既に 403。ここに到達するのは JA
    // スコープ 3 役(CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN)のみで常に ja_id を持つ。
    // 本ガードは将来の誤付与への backstop。販売店 Excel取込 は 代行入力 機能ではない(2026-06 確認)。
    if (session.ja_id == null) {
      throw new DataScopeViolationException();
    }
    const targetJaId = Number(session.ja_id);

    const errors: Array<{ row: number; field: string; message: string }> = [];

    this.collectBatchDuplicateCodeErrors(body.rows, errors);
    this.collectImportRowMcodeErrors(body.rows, errors);

    // [existence-precheck] — 自 JA 内で hanbaiten_code が一致する行を取得。
    // NEW は hit を「重複」、UPDATE_* は miss を「not found」扱い。
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
    // code キーの全行マップ — conditional-required ガードが UPDATE で
    // これら既存値と Excel セルをマージする。
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

    // [tanka-fk-resolution] — haitatsuryo_tanka_code → tanka_id 解決。他テナントの
    // tanka は不在と同様に拒否(Layer 4)。抽出 helper が解決と "not found" 行エラー両方を担当。
    const tankaIdMap = await this.resolveImportTankaIds(
      body.rows,
      targetJaId,
      errors,
    );

    // 短絡 — pre-check 失敗があれば dataSource.transaction を開く前に throw
    // （api.md §4.3 — pre-check フェーズは §4.4 transaction フェーズに厳密に先行）。
    if (errors.length > 0) {
      throw new ImportValidationException(errors);
    }

    // [todofuken-default] — m_hanbaiten.todofuken_code は NOT NULL・m_todofuken への FK。
    // Excel テンプレートは 都道府県 を持たない(api.md §テンプレートファイル仕様)ので
    // 呼出者の JA 都道府県を既定に。取込毎に 1 回ルックアップ。
    const jaTodofuken = await this.dataSource.query<Array<{ todofuken_code: string }>>(
      `SELECT todofuken_code FROM m_ja WHERE ja_id = $1 AND deleted_at IS NULL`,
      [targetJaId],
    );
    const defaultTodofukenCode = jaTodofuken[0]?.todofuken_code ?? '';

    // [transaction-phase] — 全 DML + 監査 1 行を一緒に commit/rollback。
    // エラーログは外でロールバック後もトレースを残す。
    const importedAt = new Date().toISOString();
    let createdCount = 0;
    let updatedCount = 0;
    const createdIds: number[] = [];

    // UPDATE は選択列のみ更新（partial 相当）。監査 operation は既存の
    // IMPORT_UPDATE_PARTIAL を再利用（過去ログ互換のため enum を変えない）。
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
            // 全列を selected_columns に含める形で実現。
            await this.applyImportRowUpdatePartial(manager, row, {
              existingMap,
              selectedColumns: body.selected_columns,
              tankaId,
              session,
            });
            updatedCount += 1;
          }
        }

        // [audit-log-in-tx] — 取込 1 回につき要約 1 行。INSERT が `manager` 経由で
        // 原子性を保つ。
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
        // 取込はバッチ操作なので「1取込につき監査ログ1行」。非標準ラベル
        // (IMPORT_NEW / IMPORT_UPDATE_PARTIAL) を logOperation で直接記録。以前は
        // spec を通すため logCreate/logUpdate も併発し t_log が1取込2行になっていた —
        // その重複を排除し logOperation 1本に統一。
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
      // [audit-error-log] — ロールバック外。
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

  // SCR-019 import — 存在チェック vs import_mode：
  //   NEW → 既存コードは重複エラー、UPDATE_* → 不在コードは not-found エラー。
  // importExcel から抽出（Sonar S3776 の複雑度閾値を下げる）。
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

  // SCR-019 import — バッチが参照する全 haitatsuryo_tanka_code の tanka_id を取得
  // (jaId で絞込・Layer 4)し、未解決の行を報告。INSERT/UPDATE 用のルックアップ map を返す。
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

  // SCR-019 import — 行毎の m_code 値 pre-check + 数値限定 type ガード。
  // importExcel から抽出（複雑度を閾値以下に）。
  private collectImportRowMcodeErrors(
    rows: ImportHanbaitenRowDto[],
    errors: Array<{ row: number; field: string; message: string }>,
  ): void {
    // [m-code-validation] — itaku_kubun / furikomi_tesuryo_futan_kubun / yokin_shubetsu
    // の値は m_code に存在（または省略）必須。CodeService は任意注入で、無ければ
    // スキップ（SCR-018 4引数構築では undefined、SCR-019 は常に `requireCodeService` 経由で配線）。
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
      // [type-guard] — DTO をすり抜けうる数値限定項目（呼出者が ValidationPipe を
      // バイパスすると `@IsInt()` が発火しない・例：service 直呼テスト）。FE が該当
      // 行+列をハイライトできるよう IMPORT_VALIDATION_ERROR 項目で返す。
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

  // SCR-019 import — conditional-required ガード(api.md §4.1)：行の EFFECTIVE
  //   itaku_kubun が 1(振込)なら 6 銀行項目は非空必須。"Effective" はモード毎に
  //   Excel セルと既存 DB 行をマージ：NEW=selected?cell:default(空)、
  //   UPDATE=selected?cell:既存DB値（TC-019-040：未選択で既に空の銀行項目も発火）。
  //   koza_meigi は spec により除外。
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
      // この行+モードでの列の取込後 EFFECTIVE 値。
      const effective = (field: string): unknown => {
        if (importMode === 'NEW') return sel.has(field) ? cell[field] : undefined;
        // UPDATE — 未選択列は既存 DB 値を維持。
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

  // SCR-019 import — 委託区分 / 振込手数料負担区分 は必須（顧客要件・作成/更新画面と
  //   同方針）。EFFECTIVE 値が空なら必須エラー。NEW=selected?cell:空（未選択は違反）、
  //   UPDATE=selected?cell:既存DB値（未選択で既存値あれば維持）。
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

  // SCR-019 import — 行毎の INSERT/UPDATE 分岐（transaction callback から抽出・複雑度低減）。
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
    // [selected-columns-honoured] api.md §4.4.1 — selected_columns に無い列は
    // Excel セルでなく既定値（空文字 / NULL / false）で書く。FE 取込列トグルの反映：
    // 新規登録で任意列を外す = 「その列は既定を挿入」。hanbaiten_code(key) +
    // todofuken_code(JA から自動導出・テンプレ列でない)は常に書く。
    const sel = new Set(selectedColumns);
    // `pick(col, value, dflt)` — 列が選択されていれば Excel 値、なければ空既定に fallback。
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
      // 空セルは列の NOT NULL 既定（空文字 / false）に fallback。nullable 列
      // （numeric / enum）は map に無いので null で通過。
      const fallback = Object.hasOwn(IMPORT_FIELD_EMPTY_DEFAULT, entityField)
        ? IMPORT_FIELD_EMPTY_DEFAULT[entityField]
        : null;
      (payload as Record<string, unknown>)[entityField] =
        raw == null || raw === '' ? fallback : raw;
    }
    await manager.update(Hanbaiten, { hanbaitenId: existingId }, payload);
  }
}

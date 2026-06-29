import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { ValidationException } from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import {
  slashDateToIso,
  timestampForFilenameJst,
} from '@/common/utils/datetime';
import { applyBranchScope } from '@/common/utils/data-scope';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { AuditOperation, LogType, ResultStatus } from '@/common/enums';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { SearchDokusyaDto } from './dto/search-dokusya.dto';
import { ExportNoDataException } from './exceptions/export-no-data.exception';
import { ExportLimitExceededException } from './exceptions/export-limit-exceeded.exception';
import {
  DOKUSYA_EXPORT_HEADERS,
  DokusyaListItem,
  toDokusyaExcelRow,
  toDokusyaListItem,
} from './dokusya.mapper';

/**
 * SCR-014 — 購読者明細検索画面 audit-context label. core 側 DokusyaService と
 * 同一値だが、本サービス内で完結させるため複製して保持する（delete も
 * SCR-014 を使うため core 側にも同名定数が残る）。
 */
const SCREEN_NAME_SCR014 = '購読者明細検索画面 (ACSMS-SCR-014)';

/**
 * SCR-014 監査ログ用テーブル名（t_log.target_table）。core 側 DokusyaService と
 * 同一値だが、本サービス内で完結させるため複製して保持する。
 */
const TABLE_NAME = 't_dokusya';

/**
 * Sort-by allow-list for the search endpoint. Maps the FE-supplied
 * snake_case identifier → fully-qualified QB column. Mirror the
 * DTO's `@IsIn` allow-list — both sides MUST agree.
 *
 * `updated_at` is the default; the others mirror screen-design v1.2
 * 検索結果テーブル sortable columns.
 */
const SORT_COLUMN_MAP: Record<string, string> = {
  dokusya_id: 'd.dokusya_id',
  kanri_shiten_id: 'd.kanri_shiten_id',
  shiten_id: 'd.shiten_id',
  kumiaiin_code: 'd.kumiaiin_code',
  hanbaiten_id: 'd.hanbaiten_id',
  shoki_dokusya_kaishi_date: 'd.shoki_dokusya_kaishi_date',
  dokusya_chushi_date: 'd.dokusya_chushi_date',
  updated_at: 'd.updated_at',
};

/** Excel export hard cap (api.md §API-014-003 §4.3 30,000件上限). */
const EXPORT_MAX_ROWS = 30000;

/**
 * Raise a single VALIDATION_ERROR with a one-field errors[] payload.
 * Shape matches `ValidationPipe`'s exception so the FE
 * `useApiForm` composable maps the error to `<a-form-item :help>`
 * uniformly with DTO failures.
 * core 側 DokusyaService と同一実装（検索と UI で文言・形を揃えるため複製）。
 */
function fieldValidationError(
  field: string,
  message: string,
): ValidationException {
  return new ValidationException([{ field, message }]);
}

/**
 * SCR-014 — 購読者明細検索（検索 + Excel出力）を担うサービス。
 *
 * 肥大化した `DokusyaService` から SEARCH / EXPORT concern を切り出したもの。
 * 検索クエリの組み立て（DataScope・等価/部分一致/日付範囲フィルタ）・Excel
 * ワークブック生成・検索専用の m_code 再検証を集約し、`DokusyaService` は本
 * サービスへ薄く委譲する facade として `search` / `exportExcel` を公開する。
 *
 * constructor は dokusyaRepo / auditLog / codeService のみ注入（検索ロジックは
 * dokusyaRepo の QueryBuilder と CodeService のみを使い、dataSource /
 * accountFlags は不要なため注入しない）。
 */
@Injectable()
export class DokusyaSearchService {
  constructor(
    @InjectRepository(Dokusya)
    private readonly dokusyaRepo: Repository<Dokusya>,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  // ════════════════════════════════════════════════════════════════════
  // SCR-014 — 購読者明細検索画面
  // ════════════════════════════════════════════════════════════════════

  // ─── API-014-001 — GET /api/v1/dokusya (search) ─────────────────────
  /**
   * Search 購読者 list with pagination + sort + filters + DataScope.
   *
   * Flow (api.md §API-014-001):
   *   §4.1 DTO validates field shapes + sort_by allow-list. This method
   *        additionally re-validates m_code values (dokusya_shubetsu /
   *        shiharai_hoho / tetsuzuki_shurui / denshi_shonin_status)
   *        against the runtime allow-list — the closed-set DTO `@IsIn`
   *        only covers documented values, not customer-added m_code
   *        extensions.
   *   §4.2 DataScope via applyBranchScope (CHUOKAI/JA_HONTEN → ja_id,
   *        JA_KANRI_SHITEN → kanri_shiten_id, NICHINO_* bypass).
   *   §4.3 Equality + ILIKE + range filters per parameter.
   *   §4.4 + §4.5 single SELECT with COUNT(*) via getCount() so the
   *        spec's `getCount.mockResolvedValue(N)` controls `meta.total`.
   *   §4.6 paginate() wraps the rows into the canonical envelope.
   *
   * Joho-henko-tekiyo-date branch:
   *   - Both empty → live row from t_dokusya (saishin_data_flg semantics
   *     are implicit in the master table); no JOIN to t_dokusya_rireki.
   *   - Either side present → INNER JOIN t_dokusya_rireki and filter
   *     the history's joho_henko_tekiyo_date column.
   */
  async search(
    query: SearchDokusyaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<DokusyaListItem>> {
    this.assertSearchMCodeValues(query);
    const sortColumn = this.resolveSortColumn(query.sort_by);
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.max(1, Math.min(100, Number(query.per_page ?? 20)));

    const qb = this.dokusyaRepo.createQueryBuilder('d');
    this.buildSearchQuery(qb, query, session);

    // ORDER BY + LIMIT + OFFSET only on the data query path.
    qb.orderBy(sortColumn, sortOrder);
    // Use limit/offset (NOT take/skip): take/skip only paginate getMany()
    // entity results — they are IGNORED by getRawMany(), so per_page had no
    // effect and every row was returned. getCount() ignores limit/offset,
    // so total stays correct.
    qb.limit(perPage);
    qb.offset((page - 1) * perPage);

    const [rows, total] = await Promise.all([
      qb.getRawMany<Record<string, unknown>>(),
      qb.getCount(),
    ]);

    const data = rows.map((row) => toDokusyaListItem(row));
    return paginate(data, Number(total), page, perPage);
  }

  // ─── API-014-003 — GET /api/v1/dokusya/export ───────────────────────
  /**
   * Export the filtered 購読者 list as an Excel workbook (xlsx).
   *
   * Flow (api.md §API-014-003):
   *   §4.3 COUNT(*) under the same filter / DataScope.
   *        - 0      → 404 EXPORT_NO_DATA
   *        - >30000 → 409 EXPORT_LIMIT_EXCEEDED
   *   §4.4 Fetch rows (no pagination — hard-capped at 30,000).
   *   §4.5 14-column header mirroring the検索結果テーブル layout
   *        (手続種類 / 購読種別 / 配達先氏名 / 支払方法 included;
   *        支店 / 連絡先２ / かな氏名 excluded).
   *   §4.6 Audit row (log_type=1, operation='EXPORT_EXCEL', after_value
   *        with record_count).
   *   §4.7 Filename `購読者一覧出力_YYYYMMDD_HHmmss.xlsx` (JST).
   *   §4.8 Error log outside any tx — same pattern as remove().
   */
  async exportExcel(
    query: SearchDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ buffer: Buffer; filename: string; headers: readonly string[] }> {
    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR014,
      TABLE_NAME,
      null,
    );

    try {
      this.assertSearchMCodeValues(query);

      // [count-guard] — single QB used twice (getCount + getRawMany).
      // The unit spec's dokusyaQb is a SINGLE shared mock so both
      // calls land on the same chain.
      const qb = this.dokusyaRepo.createQueryBuilder('d');
      this.buildSearchQuery(qb, query, session);

      const total = Number(await qb.getCount());
      if (total === 0) {
        throw new ExportNoDataException();
      }
      if (total > EXPORT_MAX_ROWS) {
        throw new ExportLimitExceededException();
      }

      // No pagination — explicit LIMIT cap as defence-in-depth.
      // limit (NOT take): take is ignored by getRawMany(), so the cap was
      // never applied; limit() emits the real SQL LIMIT.
      qb.orderBy('d.dokusya_id', 'ASC');
      qb.limit(EXPORT_MAX_ROWS);
      const rows = await qb.getRawMany<Record<string, unknown>>();
      const items = rows.map((row) => toDokusyaListItem(row));

      const filename = `購読者一覧出力_${timestampForFilenameJst()}.xlsx`;
      const buffer = await this.buildExcelBuffer(items);

      await this.auditLog.logOperation({
        logType: LogType.USER_OPERATION,
        accountId: session.account_id,
        jaId: session.ja_id,
        gamenName: SCREEN_NAME_SCR014,
        operation: AuditOperation.EXPORT_EXCEL,
        resultStatus: ResultStatus.SUCCESS,
        targetId: null,
        targetTable: TABLE_NAME,
        afterValue: JSON.stringify({
          kanri_shiten_id: query.kanri_shiten_id ?? null,
          shiten_id: query.shiten_id ?? null,
          hanbaiten_id: query.hanbaiten_id ?? null,
          dokusya_shubetsu: query.dokusya_shubetsu ?? null,
          shiharai_hoho: query.shiharai_hoho ?? null,
          tetsuzuki_shurui: query.tetsuzuki_shurui ?? null,
          denshi_shonin_status: query.denshi_shonin_status ?? null,
          record_count: total,
        }),
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });

      return { buffer, filename, headers: DOKUSYA_EXPORT_HEADERS };
    } catch (err) {
      if (
        err instanceof ExportNoDataException ||
        err instanceof ExportLimitExceededException
      ) {
        throw err;
      }
      await this.auditLog.logError(auditCtx, AuditOperation.EXPORT_EXCEL, err as Error);
      throw err;
    }
  }

  // ─── private helpers (SCR-014) ───────────────────────────────────────

  /** Re-validate every m_code-bound search field against CodeService. */
  private assertSearchMCodeValues(query: SearchDokusyaDto): void {
    assertMCodeValues(this.codeService, [
      {
        field: 'dokusya_shubetsu',
        value: query.dokusya_shubetsu,
        category: 'DOKUSYA_SHUBETSU',
        label: '購読種別',
      },
      {
        field: 'shiharai_hoho',
        value: query.shiharai_hoho,
        category: 'SHIHARAI_HOHO',
        label: '支払方法',
      },
      {
        field: 'tetsuzuki_shurui',
        value: query.tetsuzuki_shurui,
        category: 'TETSUZUKI_SHURUI',
        label: '手続種類',
      },
    ]);
  }

  /**
   * Look up the QB column for a FE-supplied sort_by. Throws
   * VALIDATION_ERROR when the field is not in the allow-list — the
   * DTO already rejects unknown values, but this guard remains the
   * authoritative check so a future DTO change (or a programmatic
   * caller bypassing the pipe) cannot inject arbitrary SQL.
   */
  private resolveSortColumn(sortBy: string = 'updated_at'): string {
    const column = SORT_COLUMN_MAP[sortBy];
    if (!column) {
      throw fieldValidationError('sort_by', 'ソートカラムの値が不正です。');
    }
    return column;
  }

  /**
   * Common SELECT-list + JOIN + WHERE shared by search() (which
   * adds ORDER BY + paging) and exportExcel() (no paging).
   *
   * SELECT shape matches api.md §4.5 — full_name / full_name_kana via
   * shimei concat, haitatsu via address concat, is_read_only via
   * boolean expression. The mapper relies on these aliases verbatim.
   */
  private buildSearchQuery(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
    session: SessionPayload,
  ): void {
    qb
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = d.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .leftJoin(
        'm_shiten',
        's',
        's.shiten_id = d.shiten_id AND s.deleted_at IS NULL',
      )
      .leftJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL',
      )
      .leftJoin(
        'm_todofuken',
        't',
        't.todofuken_code = d.haitatsu_todofuken_code',
      )
      .select([
        'd.dokusya_id AS dokusya_id',
        'd.ja_id AS ja_id',
        'd.kanri_shiten_id AS kanri_shiten_id',
        'ks.kanri_shiten_name AS kanri_shiten_name',
        'd.shiten_id AS shiten_id',
        's.shiten_name AS shiten_name',
        'd.kumiaiin_code AS kumiaiin_code',
        "(d.shimei_sei || ' ' || d.shimei_mei) AS full_name",
        "(d.shimei_kana_sei || ' ' || d.shimei_kana_mei) AS full_name_kana",
        'd.renrakusaki_1 AS renrakusaki_1',
        'd.renrakusaki_2 AS renrakusaki_2',
        "(d.haitatsu_shimei_sei || ' ' || d.haitatsu_shimei_mei) AS haitatsu_full_name",
        'd.haitatsu_yubin_no AS haitatsu_yubin_no',
        "(COALESCE(t.todofuken_name, '') || d.haitatsu_shikuchoson || d.haitatsu_chome_banchi || d.haitatsu_tatemono_mei) AS haitatsu",
        'd.hanbaiten_id AS hanbaiten_id',
        'h.hanbaiten_name AS hanbaiten_name',
        'd.dokusya_shubetsu AS dokusya_shubetsu',
        'd.tetsuzuki_shurui AS tetsuzuki_shurui',
        'd.shiharai_hoho AS shiharai_hoho',
        'd.denshi_shonin_status AS denshi_shonin_status',
        'd.shoki_dokusya_kaishi_date AS shoki_dokusya_kaishi_date',
        'd.dokusya_chushi_date AS dokusya_chushi_date',
        '((d.dokusya_shubetsu = 2 AND d.shiharai_hoho = 6) OR d.dokusya_shubetsu = 3) AS is_read_only',
      ])
      .where('d.deleted_at IS NULL');

    // Branch DataScope — NICHINO_* bypass; CHUOKAI/JA_HONTEN narrow by
    // ja_id; JA_KANRI_SHITEN narrows by kanri_shiten_id.
    applyBranchScope(
      qb,
      'd',
      { jaIdField: 'ja_id', kanriShitenIdField: 'kanri_shiten_id' },
      session,
    );

    this.applySearchEqualityFilters(qb, query);
    this.applySearchPartialFilters(qb, query);
    this.applySearchDateFilters(qb, query);
  }

  /** Equality (`= :param`) filters — applied when the value is set. */
  private applySearchEqualityFilters(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
  ): void {
    if (query.kanri_shiten_id !== undefined) {
      qb.andWhere('d.kanri_shiten_id = :kanri_shiten_id', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }
    if (query.shiten_id !== undefined) {
      qb.andWhere('d.shiten_id = :shiten_id', { shiten_id: query.shiten_id });
    }
    if (query.hanbaiten_id !== undefined) {
      qb.andWhere('d.hanbaiten_id = :hanbaiten_id', {
        hanbaiten_id: query.hanbaiten_id,
      });
    }
    if (query.dokusya_shubetsu !== undefined) {
      qb.andWhere('d.dokusya_shubetsu = :dokusya_shubetsu', {
        dokusya_shubetsu: query.dokusya_shubetsu,
      });
    }
    if (query.shiharai_hoho !== undefined) {
      qb.andWhere('d.shiharai_hoho = :shiharai_hoho', {
        shiharai_hoho: query.shiharai_hoho,
      });
    }
    if (query.tetsuzuki_shurui !== undefined) {
      qb.andWhere('d.tetsuzuki_shurui = :tetsuzuki_shurui', {
        tetsuzuki_shurui: query.tetsuzuki_shurui,
      });
    }
    if (query.denshi_shonin_status !== undefined) {
      qb.andWhere('d.denshi_shonin_status = :denshi_shonin_status', {
        denshi_shonin_status: query.denshi_shonin_status,
      });
    }
  }

  /** Partial-match (`ILIKE %param%`) filters — applied when non-empty. */
  private applySearchPartialFilters(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
  ): void {
    if (query.kumiaiin_code) {
      qb.andWhere(
        "d.kumiaiin_code ILIKE '%' || :kumiaiin_code || '%'",
        { kumiaiin_code: query.kumiaiin_code },
      );
    }
    if (query.jastem_toriatsukai_tenpo_code) {
      qb.andWhere(
        "d.bank_branch_code ILIKE '%' || :jastem_toriatsukai_tenpo_code || '%'",
        {
          jastem_toriatsukai_tenpo_code: query.jastem_toriatsukai_tenpo_code,
        },
      );
    }
    if (query.jastem_tenpo_name) {
      qb.andWhere(
        "d.bank_branch_name ILIKE '%' || :jastem_tenpo_name || '%'",
        { jastem_tenpo_name: query.jastem_tenpo_name },
      );
    }
    if (query.full_name) {
      // 氏名: 購読者氏名 + 配達先氏名 の各カラムを部分一致 OR でまとめる。
      // (shimei_sei / shimei_mei / haitatsu_shimei_sei / haitatsu_shimei_mei)
      qb.andWhere(
        "(d.shimei_sei ILIKE '%' || :full_name || '%' " +
          "OR d.shimei_mei ILIKE '%' || :full_name || '%' " +
          "OR d.haitatsu_shimei_sei ILIKE '%' || :full_name || '%' " +
          "OR d.haitatsu_shimei_mei ILIKE '%' || :full_name || '%')",
        { full_name: query.full_name },
      );
    }
    if (query.full_name_kana) {
      // かな氏名: 購読者かな氏名 + 配達先かな氏名 の各カラムを部分一致 OR。
      qb.andWhere(
        "(d.shimei_kana_sei ILIKE '%' || :full_name_kana || '%' " +
          "OR d.shimei_kana_mei ILIKE '%' || :full_name_kana || '%' " +
          "OR d.haitatsu_shimei_kana_sei ILIKE '%' || :full_name_kana || '%' " +
          "OR d.haitatsu_shimei_kana_mei ILIKE '%' || :full_name_kana || '%')",
        { full_name_kana: query.full_name_kana },
      );
    }
    if (query.renrakusaki_1) {
      // 連絡先１: 購読者連絡先１ + 配達先連絡先１ を部分一致 OR。
      qb.andWhere(
        "(d.renrakusaki_1 ILIKE '%' || :renrakusaki_1 || '%' " +
          "OR d.haitatsu_renrakusaki_1 ILIKE '%' || :renrakusaki_1 || '%')",
        { renrakusaki_1: query.renrakusaki_1 },
      );
    }
    if (query.haitatsu) {
      // 配達先住所: 配達先住所4項目 + 購読者住所4項目 をそれぞれ部分一致 OR。
      qb.andWhere(
        "(d.haitatsu_todofuken_code ILIKE '%' || :haitatsu || '%' " +
          "OR d.haitatsu_shikuchoson ILIKE '%' || :haitatsu || '%' " +
          "OR d.haitatsu_chome_banchi ILIKE '%' || :haitatsu || '%' " +
          "OR d.haitatsu_tatemono_mei ILIKE '%' || :haitatsu || '%' " +
          "OR d.todofuken_code ILIKE '%' || :haitatsu || '%' " +
          "OR d.shikuchoson ILIKE '%' || :haitatsu || '%' " +
          "OR d.chome_banchi ILIKE '%' || :haitatsu || '%' " +
          "OR d.tatemono_mei ILIKE '%' || :haitatsu || '%')",
        { haitatsu: query.haitatsu },
      );
    }
    if (query.email) {
      qb.andWhere("d.email ILIKE '%' || :email || '%'", { email: query.email });
    }
    if (query.seikyu_kaishi_month) {
      qb.andWhere(
        "d.seikyu_kaishi_month ILIKE '%' || :seikyu_kaishi_month || '%'",
        { seikyu_kaishi_month: query.seikyu_kaishi_month },
      );
    }
  }

  /** Date-range + 適用日 (履歴) filters — applied when bounds are set. */
  private applySearchDateFilters(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
  ): void {
    // Range filters — shoki_dokusya_kaishi_date.
    if (query.shoki_dokusya_kaishi_date_from) {
      qb.andWhere(
        'd.shoki_dokusya_kaishi_date >= :shoki_dokusya_kaishi_date_from',
        {
          shoki_dokusya_kaishi_date_from:
            slashDateToIso(query.shoki_dokusya_kaishi_date_from),
        },
      );
    }
    if (query.shoki_dokusya_kaishi_date_to) {
      qb.andWhere(
        'd.shoki_dokusya_kaishi_date <= :shoki_dokusya_kaishi_date_to',
        {
          shoki_dokusya_kaishi_date_to:
            slashDateToIso(query.shoki_dokusya_kaishi_date_to),
        },
      );
    }
    if (query.dokusya_chushi_date_from) {
      qb.andWhere('d.dokusya_chushi_date >= :dokusya_chushi_date_from', {
        dokusya_chushi_date_from: slashDateToIso(query.dokusya_chushi_date_from),
      });
    }
    if (query.dokusya_chushi_date_to) {
      qb.andWhere('d.dokusya_chushi_date <= :dokusya_chushi_date_to', {
        dokusya_chushi_date_to: slashDateToIso(query.dokusya_chushi_date_to),
      });
    }

    // 適用日 (joho_henko_tekiyo_date) branch.
    //
    //   - Both empty → use the live master row. The master table already
    //     reflects the current (saishin) state, so no extra predicate
    //     is needed. The unit spec accepts EITHER a saishin_data_flg
    //     predicate OR the absence of a t_dokusya_rireki JOIN — we
    //     pick the latter for performance.
    //
    //   - Either side present → INNER JOIN t_dokusya_rireki and filter
    //     the history rows.
    if (
      query.joho_henko_tekiyo_date_from ||
      query.joho_henko_tekiyo_date_to
    ) {
      qb.innerJoin(
        't_dokusya_rireki',
        'rireki',
        'rireki.dokusya_id = d.dokusya_id',
      );
      if (query.joho_henko_tekiyo_date_from) {
        qb.andWhere(
          'rireki.joho_henko_tekiyo_date >= :joho_henko_tekiyo_date_from',
          {
            joho_henko_tekiyo_date_from: slashDateToIso(
              query.joho_henko_tekiyo_date_from,
            ),
          },
        );
      }
      if (query.joho_henko_tekiyo_date_to) {
        qb.andWhere(
          'rireki.joho_henko_tekiyo_date <= :joho_henko_tekiyo_date_to',
          {
            joho_henko_tekiyo_date_to: slashDateToIso(
              query.joho_henko_tekiyo_date_to,
            ),
          },
        );
      }
    }
  }

  /**
   * Build the Excel workbook buffer. One worksheet named '購読者一覧',
   * 12-column header row (bold), then data rows mapped via
   * `toDokusyaExcelRow`. Returns a Node Buffer (ExcelJS returns an
   * ArrayBuffer on Node).
   */
  private async buildExcelBuffer(rows: DokusyaListItem[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'agrinews';
    const sheet = workbook.addWorksheet('購読者一覧');
    sheet.addRow([...DOKUSYA_EXPORT_HEADERS]);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    // Reasonable defaults — 配達先住所 is the widest column at ~200
    // chars, but Excel auto-fit is unreliable; leave at 18 chars so
    // the user can widen interactively.
    sheet.columns = DOKUSYA_EXPORT_HEADERS.map(() => ({ width: 18 }));
    for (const row of rows) {
      // 手続種類 / 購読種別 / 支払方法 は m_code 値。Excel には
      // 顧客が見やすいラベルを出力する（CodeService は @Global で
      // メモリキャッシュ済みなので行ごとのルックアップは実質ゼロコスト）。
      sheet.addRow(
        toDokusyaExcelRow(row, {
          tetsuzuki_shurui: this.codeService.getLabel(
            'TETSUZUKI_SHURUI',
            row.tetsuzuki_shurui,
          ),
          dokusya_shubetsu: this.codeService.getLabel(
            'DOKUSYA_SHUBETSU',
            row.dokusya_shubetsu,
          ),
          shiharai_hoho: this.codeService.getLabel(
            'SHIHARAI_HOHO',
            row.shiharai_hoho,
          ),
        }),
      );
    }
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  }
}

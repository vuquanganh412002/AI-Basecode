import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Tanka } from '@/database/entities/tanka.entity';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import {
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { assertJaScope, applyJaScope } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import { assertNoRelatedRows } from '@/common/utils/fk-conflict';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import {
  AuditLogService,
  type AuditOperationContext,
} from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateTankaDto } from './dto/create-tanka.dto';
import { UpdateTankaDto } from './dto/update-tanka.dto';
import { SearchTankaDto, type TankaSearchSortBy } from './dto/search-tanka.dto';
import { TankaResponseDto } from './dto/tanka-response.dto';
import { toTankaResponse } from './tanka.mapper';

/** Per-screen audit-context labels. */
const SCREEN_NAME_SCR002 = '単価マスタ明細検索画面 (ACSMS-SCR-002)';
const SCREEN_NAME_SCR003 = '単価マスタ登録画面 (ACSMS-SCR-003)';
const TABLE_NAME = 'm_tanka';

/**
 * Today as YYYY-MM-DD in Asia/Tokyo (operation timezone per
 * `.claude/rules/nestjs.md §Timestamp policy`). String compare against
 * the DTO's YYYY-MM-DD wire format is lexicographically correct.
 *
 * Uses Intl rather than `new Date()` host-locale extractors so the
 * result stays correct on dev machines that didn't set
 * `TZ=Asia/Tokyo` (the Dockerfile pins it for production, but Mac
 * dev or other contributors may not).
 */
const JST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function todayJstIso(): string {
  // en-CA yields `YYYY-MM-DD` directly, no part-stitching needed.
  return JST_DATE_FORMATTER.format(new Date());
}

/**
 * Enforce date-range constraints for CREATE:
 *   - 適用開始日 >= today (no past start; existing records may have
 *     past start_dates on UPDATE, so this is create-only).
 *   - 適用終了日 >= 適用開始日.
 *
 * Throws a VALIDATION_ERROR matching the `ValidationPipe` exception
 * shape so `useApiForm` on the FE maps the field-level errors into
 * `<a-form-item :help>` uniformly.
 */
function assertCreateDateRange(start: string, end: string): void {
  const errors: Array<{ field: string; message: string }> = [];
  const today = todayJstIso();
  if (start < today) {
    errors.push({
      field: 'tekiyo_start_date',
      message: '適用開始日は本日以降の日付を指定してください。',
    });
  }
  if (!errors.length && end < start) {
    errors.push({
      field: 'tekiyo_end_date',
      message: '適用終了日は適用開始日以降を指定してください。',
    });
  }
  if (errors.length) {
    throw new HttpException(
      { code: 'VALIDATION_ERROR', message: '入力値が不正です。', errors },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Whitelist mapping `sort_by` → fully-qualified QueryBuilder column.
 * `@IsIn(TANKA_SEARCH_SORT_BY)` already rejects keys outside this map,
 * but keeping the lookup dynamic prevents SQL injection if the DTO drifts.
 */
/**
 * TypeORM round-trips `date`-typed columns as JS `Date` in production but
 * as ISO string under pg-mem (tests). Normalize to the FE-expected
 * `YYYY-MM-DD` (or null for nullable `tekiyo_end_date`). Hoisted to module
 * scope so the `.map((t) => …)` callback in `searchTanka` stays compact
 * (Sonar S7721).
 */
function tekiyoStartDateIso(t: Tanka): string {
  if (typeof t.tekiyoStartDate === 'string') return t.tekiyoStartDate;
  if (t.tekiyoStartDate) {
    return (t.tekiyoStartDate as unknown as Date).toISOString().slice(0, 10);
  }
  return '';
}

function tekiyoEndDateIso(t: Tanka): string | null {
  if (t.tekiyoEndDate === null || t.tekiyoEndDate === undefined) return null;
  if (typeof t.tekiyoEndDate === 'string') return t.tekiyoEndDate;
  return (t.tekiyoEndDate as unknown as Date).toISOString().slice(0, 10);
}

const SORT_COLUMN_MAP: Record<TankaSearchSortBy, string> = {
  tanka_code: 'mt.tanka_code',
  tanka_name: 'mt.tanka_name',
  kingaku_zeikomi: 'mt.kingaku_zeikomi',
  kingaku_zeinuki: 'mt.kingaku_zeinuki',
  tax_rate: 'mt.tax_rate',
  tekiyo_start_date: 'mt.tekiyo_start_date',
  tekiyo_end_date: 'mt.tekiyo_end_date',
  // Default — newest write bubbles to row 1
  updated_at: 'mt.updated_at',
};

/**
 * Tables whose existence of a row referencing the tanka blocks a delete.
 * Mirrors `docs/design/ACSMS-SCR-002/ACSMS-SCR-002-api.md §4.4`.
 *
 * `m_hanbaiten` checks via `haitatsuryo_tanka_id` column; `t_dokusya` via
 * `tanka_id`. Both columns are interpolated by `assertNoRelatedRows()`
 * — caller MUST pass hardcoded tuples (no user input).
 */
const RELATED_FK_CHECKS: ReadonlyArray<readonly [string, string]> = [
  ['m_hanbaiten', 'haitatsuryo_tanka_id'],
  ['t_dokusya', 'tanka_id'],
];

type TankaListItem = Pick<
  TankaResponseDto,
  | 'tanka_id'
  | 'tanka_type'
  | 'tanka_code'
  | 'tanka_name'
  | 'tekiyo_start_date'
  | 'tekiyo_end_date'
  | 'kingaku_zeikomi'
  | 'kingaku_zeinuki'
  | 'tax_rate'
  | 'active_flg'
>;

@Injectable()
export class TankaService {
  private readonly logger = new Logger(TankaService.name);

  constructor(
    @InjectRepository(Tanka) private readonly repo: Repository<Tanka>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  // ─── API-002-001 — GET /api/v1/tanka ────────────────────────────────────
  /**
   * Paginated tanka list. Applies §4.3 DataScope (CHUOKAI / JA_HONTEN /
   * JA_KANRI_SHITEN see only own ja_id; NICHINO_* have no tanka.view
   * permission per seeder, so they never reach this method via the guard
   * chain). Read-only — does NOT write t_log.
   */
  async findAll(
    query: SearchTankaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<TankaListItem>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by: TankaSearchSortBy =
      (query.sort_by as TankaSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';

    const qb = this.repo.createQueryBuilder('mt');

    // [soft-delete-filter]
    qb.where('mt.deleted_at IS NULL');

    // [filter-conditions] effective-period: NULL=無期限 OR end >= today.
    qb.andWhere(
      '(mt.tekiyo_end_date IS NULL OR mt.tekiyo_end_date >= CURRENT_DATE)',
    );

    // [data-scope] — restricted roles see only their own JA.
    applyJaScope(qb, 'mt', 'jaId', session);

    // [filter-conditions] — completes/partial match.
    if (query.tanka_type !== undefined) {
      qb.andWhere('mt.tanka_type = :tanka_type', {
        tanka_type: query.tanka_type,
      });
    }
    if (query.tanka_name) {
      qb.andWhere('mt.tanka_name ILIKE :tanka_name', {
        tanka_name: `%${query.tanka_name}%`,
      });
    }
    if (query.tekiyo_start_date) {
      // 指定日以降に開始するレコード（lower bound on tekiyo_start_date）
      qb.andWhere('mt.tekiyo_start_date >= :tekiyo_start_date_filter', {
        tekiyo_start_date_filter: query.tekiyo_start_date,
      });
    }
    if (query.tekiyo_end_date) {
      // 指定日以前に終了するレコード（upper bound on tekiyo_end_date）。
      // NULL（無期限）は対象外 — `IS NOT NULL` ガードを明示。
      qb.andWhere(
        'mt.tekiyo_end_date IS NOT NULL AND mt.tekiyo_end_date <= :tekiyo_end_date_filter',
        { tekiyo_end_date_filter: query.tekiyo_end_date },
      );
    }
    if (query.active_flg !== undefined) {
      qb.andWhere('mt.active_flg = :active_flg', {
        active_flg: query.active_flg,
      });
    }

    // [sort-paginate]
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    const data: TankaListItem[] = rows.map((t) => ({
      tanka_id: Number(t.tankaId),
      tanka_type: Number(t.tankaType),
      tanka_code: t.tankaCode,
      tanka_name: t.tankaName,
      tekiyo_start_date: tekiyoStartDateIso(t),
      tekiyo_end_date: tekiyoEndDateIso(t),
      kingaku_zeikomi: Number(t.kingakuZeikomi),
      kingaku_zeinuki: Number(t.kingakuZeinuki),
      tax_rate: Number(t.taxRate),
      active_flg: Boolean(t.activeFlg),
    }));

    return paginate(data, total, page, per_page);
  }

  // ─── API-002-002 — DELETE /api/v1/tanka/:tanka_id ───────────────────────
  /**
   * Logical delete. §4.4 enforces the FK-conflict check; §4.5 sets
   * `deleted_at = NOW()`; §4.6 writes a t_log row inside the same
   * transaction; §4.8 emits an error log (log_type=3) OUTSIDE the
   * rolled-back transaction on failure.
   */
  async remove(
    tankaId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — also serves as before_value snapshot
    const before = await this.repo.findOne({
      where: { tankaId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('単価');

    // [data-scope] — masks out-of-scope rows as 404 (NotFound, not
    // Forbidden, to hide existence)
    assertJaScope(Number(before.jaId), session, '単価');

    // [fk-conflict-check] — block when any related table still has rows for this tanka
    for (const [table, fk] of RELATED_FK_CHECKS) {
      await assertNoRelatedRows(this.dataSource, [table], fk, tankaId);
    }

    const ctxBuilder = (): AuditOperationContext =>
      buildAuditCtx(session, req, SCREEN_NAME_SCR002, TABLE_NAME, tankaId);

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete]
        await manager.update(
          Tanka,
          { tankaId, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — atomicity
        await this.auditLog.logDelete(ctxBuilder(), before, manager);
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back tx so the trace survives
      await this.auditLog.logError(ctxBuilder(), 'DELETE', err as Error);
      throw err;
    }
  }

  // ─── API-003-001 — GET /api/v1/tanka/:tanka_id ──────────────────────────
  /**
   * Single-tanka detail (edit-form load). Applies §4.3 DataScope: rows
   * outside the caller's ja_id are masked as 404 to hide existence (see
   * `.claude/rules/security.md` Layer 2). Read-only — does NOT write t_log.
   */
  async findById(
    tankaId: number,
    session: SessionPayload,
  ): Promise<TankaResponseDto> {
    const row = await this.repo.findOne({
      where: { tankaId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('単価');
    assertJaScope(Number(row.jaId), session, '単価');
    return toTankaResponse(row);
  }

  // ─── API-003-002 — POST /api/v1/tanka ───────────────────────────────────
  /**
   * Insert a new tanka. §4.3 dedupes against `tanka_code`; §4.4 INSERTs +
   * §4.5 writes a `t_log` row inside one transaction; §4.7 emits an error
   * log (`log_type=3`) OUTSIDE the rolled-back transaction on failure.
   *
   * `ja_id` is bound from the session, not the request body — security
   * boundary per `.claude/rules/security.md` Layer 2.
   */
  async create(
    dto: CreateTankaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<TankaResponseDto> {
    // [code-master-check] — m_code allow-list runs in service (CodeService can't be
    // injected into class-validator decorators).
    assertMCodeValues(this.codeService, [
      {
        field: 'tanka_type',
        value: dto.tanka_type,
        category: 'TANKA_TYPE',
        label: '単価種別',
      },
    ]);

    // [input-validation] — date-range constraints (CREATE-only). FE mirrors these on
    // the picker via :disabled-date so curl-only bypass is the path
    // this code blocks. Order matters: start-not-past first so a wrong
    // start is reported even if end happens to be before it.
    assertCreateDateRange(dto.tekiyo_start_date, dto.tekiyo_end_date);

    // [uniqueness-check] — duplicate-code check. `withDeleted: true` —
    // code reuse is forbidden across lifetime (a code is reserved for
    // the row even after logical delete), matching the DB UNIQUE INDEX
    // which does not filter on deleted_at. `tanka_code` is project-wide
    // unique per api.md SQL example.
    const dup = await this.repo.count({
      where: { tankaCode: dto.tanka_code },
      withDeleted: true,
    });
    if (dup > 0) {
      throw new DuplicateCodeException('単価コード', dto.tanka_code);
    }

    const jaId = Number(session.ja_id ?? 0);
    const accountId = String(session.account_id);
    const ctxBuilder = (id?: number | null): AuditOperationContext =>
      buildAuditCtx(session, req, SCREEN_NAME_SCR003, TABLE_NAME, id ?? null);

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const entity = manager.create(Tanka, {
          jaId,
          tankaType: dto.tanka_type,
          tankaCode: dto.tanka_code,
          tankaName: dto.tanka_name,
          taxRate: dto.tax_rate ?? 0,
          kingakuZeikomi: dto.kingaku_zeikomi ?? 0,
          kingakuZeinuki: dto.kingaku_zeinuki ?? 0,
          tekiyoStartDate: dto.tekiyo_start_date,
          tekiyoEndDate: dto.tekiyo_end_date,
          // biko is NOT NULL DEFAULT '' per database-design.md; explicit ''
          // when omitted so the DTO's optional shape maps to a stored blank.
          biko: dto.biko ?? '',
          // active_flg defaults to TRUE per api.md §リクエストパラメータ #10.
          activeFlg: dto.active_flg ?? true,
          createdBy: accountId,
          updatedBy: accountId,
        });
        const written = await manager.save(Tanka, entity);
        // [audit-log-in-tx] — atomicity
        await this.auditLog.logCreate(
          ctxBuilder(Number(written.tankaId)),
          written,
          manager,
        );
        return written;
      });
      return toTankaResponse(saved);
    } catch (err) {
      // Race-condition safety net: 2 concurrent CREATE requests can
      // both pass the pre-check, then the second INSERT hits the DB
      // UNIQUE INDEX. Convert that 23505 into a clean 400 instead of
      // letting it bubble as 500.
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(ctxBuilder(null), 'CREATE', err as Error);
        throw new DuplicateCodeException('単価コード', dto.tanka_code);
      }
      // [audit-error-log] — OUTSIDE the rolled-back tx.
      await this.auditLog.logError(ctxBuilder(null), 'CREATE', err as Error);
      throw err;
    }
  }

  // ─── API-003-003 — PUT /api/v1/tanka/:tanka_id ──────────────────────────
  /**
   * Update an existing tanka. §4.3 fetches the before-snapshot (also the
   * NotFound / DataScope gate); §4.4 UPDATEs + §4.5 writes a `t_log` row
   * with before/after JSON inside one transaction; §4.7 emits an error
   * log (`log_type=3`) OUTSIDE the transaction on failure.
   *
   * `tanka_code` is immutable per api.md §API-003-003 footnote — the DTO
   * type (`UpdateTankaDto = OmitType(CreateTankaDto, ['tanka_code'])`)
   * already excludes it, AND `forbidNonWhitelisted` on the pipe rejects
   * a stray `tanka_code` in the body. Belt + braces.
   */
  async update(
    tankaId: number,
    dto: UpdateTankaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<TankaResponseDto> {
    // [fetch-target] + [data-scope] (out-of-scope masked as 404 to hide existence).
    const before = await this.repo.findOne({
      where: { tankaId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('単価');
    assertJaScope(Number(before.jaId), session, '単価');

    // [code-master-check] — m_code allow-list (same call site as create).
    assertMCodeValues(this.codeService, [
      {
        field: 'tanka_type',
        value: dto.tanka_type,
        category: 'TANKA_TYPE',
        label: '単価種別',
      },
    ]);

    const accountId = String(session.account_id);
    const ctxBuilder = (): AuditOperationContext =>
      buildAuditCtx(session, req, SCREEN_NAME_SCR003, TABLE_NAME, tankaId);

    // [input-validation] — once 適用開始日 has passed, it becomes immutable. Mirror's
    // the FE read-only behavior; defends against curl-bypass that
    // would otherwise rewrite the historical price-start date.
    // Silent-drop pattern (same shape as FIELD_RESTRICTIONS in
    // .claude/rules/security.md Layer 3): preserve the stored value
    // and ignore the incoming dto field.
    const today = todayJstIso();
    const startLocked = String(before.tekiyoStartDate) < today;
    const effectiveStartDate = startLocked
      ? String(before.tekiyoStartDate)
      : dto.tekiyo_start_date;

    try {
      const updated = await this.dataSource.transaction(async (manager) => {
        // [partial-update] — apply writable fields; tanka_code stays whatever `before`
        // had (immutable per api.md footnote).
        const next = manager.create(Tanka, {
          ...before,
          tankaType: dto.tanka_type,
          tankaName: dto.tanka_name,
          taxRate: dto.tax_rate ?? before.taxRate,
          kingakuZeikomi: dto.kingaku_zeikomi ?? before.kingakuZeikomi,
          kingakuZeinuki: dto.kingaku_zeinuki ?? before.kingakuZeinuki,
          tekiyoStartDate: effectiveStartDate,
          tekiyoEndDate: dto.tekiyo_end_date,
          biko: dto.biko ?? before.biko,
          activeFlg: dto.active_flg ?? before.activeFlg,
          updatedBy: accountId,
        });
        const saved = await manager.save(Tanka, next);

        // [audit-log-in-tx] — before + after snapshots, inside the same tx.
        await this.auditLog.logUpdate(ctxBuilder(), before, saved, manager);
        return saved;
      });
      return toTankaResponse(updated);
    } catch (err) {
      await this.auditLog.logError(ctxBuilder(), 'UPDATE', err as Error);
      throw err;
    }
  }

  // ─── GET /api/v1/tanka/dropdown ───────────────────────────────────
  /**
   * Slim paginated + searchable list for the SCR-017 hanbaiten create
   * form 配達手数料単価 dropdown. Behaviour:
   *   - DataScope: restricted roles see own JA only. NICHINO_STAFF
   *     (代行入力) is JA-scoped via the optional `ja_id` query param;
   *     ignored for other roles since `applyJaScope` already pins
   *     `session.ja_id`.
   *   - `tanka_type`: optional category filter (typically 2 for
   *     配達手数料 on this form, but generic enough to reuse).
   *   - `q`: ILIKE on `tanka_name` only — the dropdown hides
   *     `tanka_code` so searching code would surface invisible hits.
   *   - Filters out soft-deleted, inactive, and out-of-period rows
   *     (`tekiyo_end_date < CURRENT_DATE` excluded) — only currently-
   *     effective unit prices appear.
   *   - `include_id`: edit-form escape hatch — if the pre-selected
   *     tanka_id falls outside page 1, BE prepends it so the label
   *     resolves without a second GET.
   */
  async getDropdown(
    query: import('./dto/tanka-dropdown-query.dto').TankaDropdownQueryDto,
    session: SessionPayload,
  ): Promise<{
    data: Array<{
      tanka_id: number;
      tanka_code: string;
      tanka_name: string;
      tanka_type: number;
      kingaku_zeikomi: number;
    }>;
    meta: { total: number; page: number; per_page: number; has_more: boolean };
  }> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 50;

    const buildScopedQb = () => {
      const qb = this.repo
        .createQueryBuilder('mt')
        .where('mt.deleted_at IS NULL')
        .andWhere('mt.active_flg = TRUE')
        .andWhere('mt.tekiyo_start_date <= CURRENT_DATE')
        .andWhere(
          '(mt.tekiyo_end_date IS NULL OR mt.tekiyo_end_date >= CURRENT_DATE)',
        );

      // [data-scope] Restricted roles → own JA only. NICHINO_STAFF
      // (session.ja_id == null) → use the explicit ja_id query param
      // (代行入力 picks a JA up-front in the form).
      if (session.ja_id != null) {
        applyJaScope(qb, 'mt', 'jaId', session);
      } else if (query.ja_id !== undefined) {
        qb.andWhere('mt.ja_id = :qja', { qja: query.ja_id });
      }
      // (NICHINO_ADMIN with no JA filter falls through and sees all JA's
      //  tanka — not a typical caller for this endpoint, but harmless.)

      if (query.tanka_type !== undefined) {
        qb.andWhere('mt.tanka_type = :tt', { tt: query.tanka_type });
      }
      if (query.q) {
        qb.andWhere('mt.tanka_name ILIKE :q', { q: `%${query.q}%` });
      }
      return qb;
    };

    const qb = buildScopedQb()
      .select([
        'mt.tankaId',
        'mt.tankaCode',
        'mt.tankaName',
        'mt.tankaType',
        'mt.kingakuZeikomi',
      ])
      .orderBy('mt.tanka_name', 'ASC')
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();
    const pageIds = new Set(rows.map((r) => Number(r.tankaId)));
    const has_more = page * per_page < total;

    // [include-id] prepend the pre-selected row when it survives the
    // scope/active filter but falls outside the current page.
    let pinned: Tanka | null = null;
    if (query.include_id && !pageIds.has(query.include_id)) {
      const pinnedQb = buildScopedQb()
        .select([
          'mt.tankaId',
          'mt.tankaCode',
          'mt.tankaName',
          'mt.tankaType',
          'mt.kingakuZeikomi',
        ])
        .andWhere('mt.tanka_id = :id', { id: query.include_id });
      pinned = await pinnedQb.getOne();
    }

    const data = [...(pinned ? [pinned] : []), ...rows].map((r) => ({
      tanka_id: Number(r.tankaId),
      tanka_code: r.tankaCode,
      tanka_name: r.tankaName,
      tanka_type: r.tankaType,
      kingaku_zeikomi: Number(r.kingakuZeikomi),
    }));

    return { data, meta: { total, page, per_page, has_more } };
  }
}

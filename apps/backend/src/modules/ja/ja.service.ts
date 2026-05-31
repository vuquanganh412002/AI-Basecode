import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Ja } from '@/database/entities/ja.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { CreateJaDto } from './dto/create-ja.dto';
import { UpdateJaDto } from './dto/update-ja.dto';
import { JaResponseDto } from './dto/ja-response.dto';
import { SearchJaDto, type JaSearchSortBy } from './dto/search-ja.dto';
import { JaDropdownQueryDto } from './dto/ja-dropdown-query.dto';
import { toJaResponse } from './ja.mapper';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import {
  AuditLogService,
  type AuditOperationContext,
} from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import {
  BadRequestException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import {
  filterAllowedFields,
  type FieldRestrictionTable,
} from '@/common/utils/field-restrictions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { assertJaScope, applyJaScope } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import { assertNoRelatedRows } from '@/common/utils/fk-conflict';
import { pickBool, pickNumber, pickString } from '@/common/utils/pick';
import type { SessionPayload } from '@/modules/auth/session.service';

/** Per-screen audit-context label for SCR-004 (list / delete). */
const SCREEN_NAME_SCR004 = 'JAマスタ明細検索画面 (ACSMS-SCR-004)';

/**
 * Whitelist mapping `sort_by` → fully-qualified QueryBuilder column.
 * `@IsIn(JA_SEARCH_SORT_BY)` already rejects keys outside this map, but
 * keeping the lookup dynamic prevents SQL injection if the DTO drifts.
 * `todofuken_name` is mapped to `mj.todofuken_code` because we don't
 * carry the m_todofuken JOIN in the QB — sorting by code groups same-
 * prefecture rows reasonably.
 */
const SORT_COLUMN_MAP: Record<JaSearchSortBy, string> = {
  ja_code: 'mj.ja_code',
  ja_name: 'mj.ja_name',
  yubin_no: 'mj.yubin_no',
  todofuken_name: 'mj.todofuken_code',
  tel: 'mj.tel',
  address: 'mj.address',
  fax: 'mj.fax',
  // Default sort key — newest write (CREATE or UPDATE auto-stamps
  // updated_at) bubbles to row 1 so users see what they just changed.
  updated_at: 'mj.updated_at',
};

/**
 * Role-id values used by the COMMON-003 dropdown's `role_id`
 * cascade. Mirrors `m_roles.role_id` per `docs/database/seeder.md
 * §1`. Kept local to this service because the only consumer is the
 * `dropdown()` method below; promote to a project-wide Group A enum
 * (with FE mirror + enum-sync test) when a second call site
 * appears.
 */
const ROLE_ID_CHUOKAI = 3;
const ROLE_IDS_SINGLE_JA = [4, 5] as const; // JA_HONTEN, JA_KANRI_SHITEN

/**
 * Tables whose existence of a row referencing the JA blocks a delete.
 * Mirrors `docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md §4.4`.
 *
 * Some of these tables aren't yet TypeORM entities (later screens own
 * them); the generic `assertNoRelatedRows()` helper at
 * `@/common/utils/fk-conflict` takes this readonly list + the FK column
 * name and runs a parameterised `SELECT COUNT(*) FROM ${table} WHERE
 * ${fk} = $1 AND deleted_at IS NULL` against each. Table list MUST stay
 * hardcoded (no user input) — the helper interpolates it into the SQL.
 */
const RELATED_TABLES: readonly string[] = [
  'm_kanri_shiten',
  'm_shiten',
  'm_hanbaiten',
  'm_tanka',
  't_dokusya',
  'm_account',
];

/**
 * Field-level restriction table per `.claude/rules/security.md` §Layer 3.
 * Only roles that CAN edit a given column are listed with the allowed field set.
 * `*` means "all fields allowed". The generic filter implementation lives in
 * `common/utils/field-restrictions.ts`.
 */
const FIELD_RESTRICTIONS: FieldRestrictionTable = {
  ja: {
    NICHINO_ADMIN: ['*'],
    CHUOKAI: [
      'yubin_no',
      'address',
      'tel',
      'fax',
      'email',
      'tanto_busho',
      'tanto_name',
      'zei_kubun',
      'jastem_itakusha_code',
      'jastem_itakusha_name',
      'jastem_ja_code',
      'jastem_ja_name',
      'biko',
    ],
    JA_HONTEN: [
      'yubin_no',
      'address',
      'tel',
      'fax',
      'email',
      'tanto_busho',
      'tanto_name',
      'zei_kubun',
      'jastem_itakusha_code',
      'jastem_itakusha_name',
      'jastem_ja_code',
      'jastem_ja_name',
      'biko',
    ],
  },
};

const SCREEN_NAME = 'JAマスタ登録画面 (ACSMS-SCR-005)';
const TABLE_NAME = 'm_ja';

@Injectable()
export class JaService {
  private readonly logger = new Logger(JaService.name);

  constructor(
    @InjectRepository(Ja)
    private readonly repo: Repository<Ja>,
    @InjectRepository(Todofuken)
    private readonly todofukenRepo: Repository<Todofuken>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  // ─── API-005-001 — GET /api/v1/ja/:ja_id ─────────────────────────────
  async findById(jaId: number, session: SessionPayload): Promise<JaResponseDto> {
    const ja = await this.repo.findOne({ where: { jaId, deletedAt: IsNull() } });
    if (!ja) throw new NotFoundException('JA');

    // [data-scope] — masks out-of-scope rows as 404.
    assertJaScope(ja.jaId, session, 'JA');

    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: ja.todofukenCode },
    });

    return toJaResponse(ja, td?.todofukenName ?? '');
  }

  // ─── API-005-002 — POST /api/v1/ja ────────────────────────────────────
  async create(
    dto: CreateJaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<JaResponseDto & { message?: string }> {
    assertMCodeValues(this.codeService, [
      { field: 'zei_kubun', value: dto.zei_kubun, category: 'ZEI_KUBUN', label: '税区分' },
    ]);

    // [code-master-check] — 都道府県コード 存在検証
    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: dto.todofuken_code },
    });
    if (!td) {
      throw new BadRequestException('都道府県コードが存在しません。');
    }

    // [uniqueness-check] — JAコード 一意性チェック. `withDeleted: true` —
    // code reuse is forbidden across lifetime (a code is reserved for
    // the row even after logical delete), matching the DB UNIQUE INDEX
    // which does not filter on deleted_at.
    const existing = await this.repo.findOne({
      where: { jaCode: dto.ja_code },
      withDeleted: true,
    });
    if (existing) {
      throw new DuplicateCodeException('JAコード', dto.ja_code);
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const entity = manager.create(Ja, {
          jaCode: dto.ja_code,
          jaName: dto.ja_name,
          jaNameKana: dto.ja_name_kana ?? '',
          todofukenCode: dto.todofuken_code,
          chuokaiFlg: dto.chuokai_flg,
          yubinNo: dto.yubin_no ?? '',
          address: dto.address ?? '',
          tel: dto.tel ?? '',
          fax: dto.fax ?? '',
          email: dto.email ?? '',
          tantoBusho: dto.tanto_busho ?? '',
          tantoName: dto.tanto_name ?? '',
          zeiKubun: dto.zei_kubun,
          jastemItakushaCode: dto.jastem_itakusha_code ?? '',
          jastemItakushaName: dto.jastem_itakusha_name ?? '',
          jastemJaCode: dto.jastem_ja_code ?? '',
          jastemJaName: dto.jastem_ja_name ?? '',
          biko: dto.biko ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = (await manager.save(entity)) as Ja;

        await this.auditLog.logCreate(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, created.jaId),
          created,
          manager,
        );

        return created;
      });

      // `td` (above) was fetched to validate todofuken_code existence;
      // `saved.todofukenCode === dto.todofuken_code` since the entity
      // carries it through unchanged, so reuse instead of re-querying.
      return {
        ...toJaResponse(saved, td.todofukenName),
        message: '登録しました。',
      };
    } catch (err) {
      // Race-condition safety net: 2 concurrent CREATE requests can
      // both pass the pre-check, then the second INSERT hits the DB
      // UNIQUE INDEX. Convert that 23505 into a clean 400 instead of
      // letting it bubble as 500.
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
          'CREATE',
          err as Error,
        );
        throw new DuplicateCodeException('JAコード', dto.ja_code);
      }
      // [audit-error-log] — OUTSIDE the (rolled-back) transaction.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        'CREATE',
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-005-003 — PUT /api/v1/ja/:ja_id ──────────────────────────────
  async update(
    jaId: number,
    dto: UpdateJaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<JaResponseDto & { message?: string }> {
    assertMCodeValues(this.codeService, [
      { field: 'zei_kubun', value: dto.zei_kubun, category: 'ZEI_KUBUN', label: '税区分' },
    ]);

    // [fetch-target] — existence + [data-scope] check
    const before = await this.repo.findOne({
      where: { jaId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('JA');
    assertJaScope(before.jaId, session, 'JA');

    // [role-allow-list] — per-role allow-list
    const filtered = filterAllowedFields(
      dto as unknown as Record<string, unknown>,
      'ja',
      session.role_code,
      FIELD_RESTRICTIONS,
    );

    // [code-master-check] — todofuken_code 存在検証 (NICHINO_ADMIN only; the allow-list
    // above drops this field for CHUOKAI/JA_HONTEN). When the role can
    // change todofuken_code, cache the validated row so the response
    // hydration below doesn't need to re-query m_todofuken.
    let validatedTodofuken: Todofuken | null = null;
    if ('todofuken_code' in filtered) {
      validatedTodofuken = await this.todofukenRepo.findOne({
        where: { todofukenCode: filtered.todofuken_code as string },
      });
      if (!validatedTodofuken) {
        throw new BadRequestException('都道府県コードが存在しません。');
      }
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const next = manager.create(Ja, {
          ...before,
          jaName: pickString(filtered, 'ja_name', before.jaName),
          jaNameKana: pickString(filtered, 'ja_name_kana', before.jaNameKana),
          todofukenCode: pickString(filtered, 'todofuken_code', before.todofukenCode),
          chuokaiFlg: pickBool(filtered, 'chuokai_flg', before.chuokaiFlg),
          yubinNo: pickString(filtered, 'yubin_no', before.yubinNo),
          address: pickString(filtered, 'address', before.address),
          tel: pickString(filtered, 'tel', before.tel),
          fax: pickString(filtered, 'fax', before.fax),
          email: pickString(filtered, 'email', before.email),
          tantoBusho: pickString(filtered, 'tanto_busho', before.tantoBusho),
          tantoName: pickString(filtered, 'tanto_name', before.tantoName),
          zeiKubun: pickNumber(filtered, 'zei_kubun', before.zeiKubun),
          jastemItakushaCode: pickString(filtered, 'jastem_itakusha_code', before.jastemItakushaCode),
          jastemItakushaName: pickString(filtered, 'jastem_itakusha_name', before.jastemItakushaName),
          jastemJaCode: pickString(filtered, 'jastem_ja_code', before.jastemJaCode),
          jastemJaName: pickString(filtered, 'jastem_ja_name', before.jastemJaName),
          biko: pickString(filtered, 'biko', before.biko),
          updatedBy: String(session.account_id),
        });
        const updated = (await manager.save(next)) as Ja;

        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, updated.jaId),
          before,
          updated,
          manager,
        );

        return updated;
      });

      // Reuse the validated row if the role just updated todofuken_code;
      // otherwise the column is unchanged (allow-list dropped the key) and
      // we need to look up the existing value to hydrate todofuken_name.
      const tdForResponse =
        validatedTodofuken ??
        (await this.todofukenRepo.findOne({
          where: { todofukenCode: saved.todofukenCode },
        }));
      return {
        ...toJaResponse(saved, tdForResponse?.todofukenName ?? ''),
        message: '更新しました。',
      };
    } catch (err) {
      // [audit-error-log] — OUTSIDE the (rolled-back) transaction.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, jaId),
        'UPDATE',
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-004-001 — GET /api/v1/ja ─────────────────────────────────────
  /**
   * Paginated search across `m_ja`. Applies §4.3 DataScope (NICHINO_*
   * unrestricted, CHUOKAI / JA_HONTEN see only own ja_id). `todofuken_name`
   * is hydrated from `m_todofuken` after the query rather than via JOIN to
   * keep the QueryBuilder simple — see comment on `SORT_COLUMN_MAP`.
   *
   * Read-only: does NOT write to t_log.
   */
  async findAll(
    query: SearchJaDto,
    session: SessionPayload,
  ): Promise<
    PaginatedResponse<
      Pick<
        JaResponseDto,
        | 'ja_id' | 'ja_code' | 'ja_name' | 'yubin_no' | 'todofuken_code'
        | 'todofuken_name' | 'tel' | 'address' | 'fax' | 'chuokai_flg'
      >
    >
  > {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by: JaSearchSortBy =
      (query.sort_by as JaSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.repo.createQueryBuilder('mj');

    // [soft-delete-filter]
    qb.where('mj.deleted_at IS NULL');

    // [data-scope] — restricted roles see only their own JA.
    applyJaScope(qb, 'mj', 'jaId', session);

    // [filter-conditions] — partial-match filters.
    if (query.ja_code) {
      qb.andWhere('mj.ja_code ILIKE :ja_code', { ja_code: `%${query.ja_code}%` });
    }
    if (query.ja_name) {
      qb.andWhere('mj.ja_name ILIKE :ja_name', { ja_name: `%${query.ja_name}%` });
    }
    // [filter-conditions] todofuken filter — exact match. Source: dropdown
    // (ACSMS-API-COMMON-001), values are the 2-char m_todofuken codes
    // so partial match wouldn't make sense ("13" vs "1" overlap).
    if (query.todofuken_code) {
      qb.andWhere('mj.todofuken_code = :todofuken_code', {
        todofuken_code: query.todofuken_code,
      });
    }

    // [sort-paginate]
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // Hydrate todofuken_name in one batch lookup. m_todofuken is a small
    // reference table (47 rows) so a single find() is cheaper than a JOIN.
    const codes = Array.from(new Set(rows.map((r) => r.todofukenCode).filter(Boolean)));
    const tdRows = codes.length > 0 ? await this.todofukenRepo.find() : [];
    const tdMap = new Map(tdRows.map((t) => [t.todofukenCode, t.todofukenName]));

    const data = rows.map((mj) => ({
      ja_id: Number(mj.jaId),
      ja_code: mj.jaCode,
      ja_name: mj.jaName,
      yubin_no: mj.yubinNo,
      todofuken_code: mj.todofukenCode,
      todofuken_name: tdMap.get(mj.todofukenCode) ?? '',
      tel: mj.tel,
      address: mj.address,
      fax: mj.fax,
      chuokai_flg: mj.chuokaiFlg,
      jastem_itakusha_code: mj.jastemItakushaCode,
      jastem_itakusha_name: mj.jastemItakushaName,
      jastem_ja_code: mj.jastemJaCode,
      jastem_ja_name: mj.jastemJaName,
    }));

    return paginate(data, total, page, per_page);
  }

  // ─── API-004-002 — DELETE /api/v1/ja/:ja_id ───────────────────────────
  /**
   * Logical delete. §4.4 enforces a 6-table conflict check before
   * committing; §4.5 sets `deleted_at = NOW()`; §4.6 writes a t_log row
   * (operation='DELETE') in the same transaction; §4.8 emits an error
   * log (log_type=3) OUTSIDE the rolled-back transaction on failure.
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — also serves as before_value snapshot in the audit log.
    const before = await this.repo.findOne({
      where: { jaId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('JA');

    // [fk-conflict-check] — block when any related table still has rows for this JA.
    await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'ja_id', id);

    const ctxBuilder = (): AuditOperationContext =>
      buildAuditCtx(session, req, SCREEN_NAME_SCR004, TABLE_NAME, id);

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete] — UPDATE m_ja SET deleted_at=NOW(), updated_by=:account_id
        await manager.update(
          Ja,
          { jaId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — inside the same tx so atomicity holds.
        await this.auditLog.logDelete(ctxBuilder(), before, manager);
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back tx so the trace
      // survives even when the business write was discarded.
      await this.auditLog.logError(ctxBuilder(), 'DELETE', err as Error);
      throw err;
    }
  }

  // ─── ACSMS-API-COMMON-003 — GET /api/v1/ja/dropdown ─────────────────
  /**
   * Server-side-paginated + searchable JA list for form dropdowns.
   * Unifies two use cases that share the path:
   *
   *   1. Free-text + infinite scroll (SCR-009 管理支店 create form
   *      and friends) — pass `q`, `page`, `per_page`, optional
   *      `include_id`.
   *   2. Cascading filter (SCR-024 account search / SCR-025 register)
   *      — pass `todofuken_code`, `role_id` for narrow JA pickers
   *      driven by sibling dropdowns.
   *
   * Both contracts return the SAME paginated shape; cascade-callers
   * just ignore the `meta` and use `data`. The pre-cascade
   * `role_id → chuokai_flg` mapping is documented on the DTO:
   *   role_id=3 → chuokai_flg=TRUE  (central association)
   *   role_id=4 or 5 → chuokai_flg=FALSE (single JA)
   *
   * DataScope: applied via `applyJaScope` so non-NICHINO roles only
   * see JAs in their organizational hierarchy. `include_id` does NOT
   * bypass DataScope — an out-of-scope id is silently dropped.
   */
  async dropdown(
    query: JaDropdownQueryDto,
    session: SessionPayload,
  ): Promise<{
    data: Array<{
      ja_id: number;
      ja_code: string;
      ja_name: string;
      todofuken_code: string;
      chuokai_flg: boolean;
    }>;
    meta: { total: number; page: number; per_page: number; has_more: boolean };
  }> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 50;

    const qb = this.repo
      .createQueryBuilder('mj')
      .select([
        'mj.jaId',
        'mj.jaCode',
        'mj.jaName',
        'mj.todofukenCode',
        'mj.chuokaiFlg',
      ])
      .where('mj.deleted_at IS NULL');

    applyJaScope(qb, 'mj', 'jaId', session);

    if (query.q) {
      // [match-field] 'name' = ja_name only (SCR-024 account list hides
      // ja_code so searching by code would be invisible to the user).
      // Default 'both' preserves legacy behavior for every other caller.
      if (query.match_field === 'name') {
        qb.andWhere('mj.ja_name ILIKE :q', { q: `%${query.q}%` });
      } else {
        qb.andWhere('(mj.ja_code ILIKE :q OR mj.ja_name ILIKE :q)', {
          q: `%${query.q}%`,
        });
      }
    }

    if (query.todofuken_code) {
      qb.andWhere('mj.todofuken_code = :tdcode', {
        tdcode: query.todofuken_code,
      });
    }

    // role_id → chuokai_flg cascade. Unknown role_ids fall through
    // (no filter) rather than 400, matching the SCR-024 spec.
    if (query.role_id === ROLE_ID_CHUOKAI) {
      qb.andWhere('mj.chuokai_flg = :chuokaiFlg', { chuokaiFlg: true });
    } else if (
      query.role_id !== undefined &&
      ROLE_IDS_SINGLE_JA.includes(query.role_id as 4 | 5)
    ) {
      qb.andWhere('mj.chuokai_flg = :chuokaiFlg', { chuokaiFlg: false });
    }

    qb.orderBy('mj.ja_code', 'ASC')
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();
    const pageIds = new Set(rows.map((r) => r.jaId));
    const has_more = page * per_page < total;

    // include_id: if specified and the row is in scope BUT not in the
    // current page slice, prepend it so the FE can render the
    // already-selected option without a second GET /api/v1/ja/:id round trip.
    let pinned: Ja | null = null;
    if (query.include_id && !pageIds.has(query.include_id)) {
      const pinnedQb = this.repo
        .createQueryBuilder('mj')
        .select([
          'mj.jaId',
          'mj.jaCode',
          'mj.jaName',
          'mj.todofukenCode',
          'mj.chuokaiFlg',
        ])
        .where('mj.deleted_at IS NULL')
        .andWhere('mj.ja_id = :id', { id: query.include_id });
      applyJaScope(pinnedQb, 'mj', 'jaId', session);
      pinned = await pinnedQb.getOne();
    }

    // Coerce BIGINT-as-string back to number for `ja_id` (TypeORM + pg
     // returns BIGINT as string even though the entity typed it as number).
     // Without this, FE <a-select> strict-equal match fails (option.value
     // is "60" while v-model is 60) → option doesn't resolve → antd renders
     // the raw id instead of the `${ja_code} ${ja_name}` label.
    const data = [...(pinned ? [pinned] : []), ...rows].map((r) => ({
      ja_id: Number(r.jaId),
      ja_code: r.jaCode,
      ja_name: r.jaName,
      todofuken_code: r.todofukenCode,
      chuokai_flg: r.chuokaiFlg,
    }));

    return {
      data,
      meta: { total, page, per_page, has_more },
    };
  }
}

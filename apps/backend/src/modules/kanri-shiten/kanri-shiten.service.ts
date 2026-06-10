import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Ja } from '@/database/entities/ja.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import {
  BadRequestException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { applyBranchScope, assertBranchScope } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import {
  filterAllowedFields,
  type FieldRestrictionTable,
} from '@/common/utils/field-restrictions';
import { assertNoRelatedRows } from '@/common/utils/fk-conflict';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { pickString, pickBool } from '@/common/utils/pick';
import type { SessionPayload } from '@/modules/auth/session.service';

import { SearchKanriShitenDto, type KanriShitenSearchSortBy } from './dto/search-kanri-shiten.dto';
import { KanriShitenListItemDto } from './dto/kanri-shiten-list-item.dto';
import { KanriShitenDropdownItemDto } from './dto/kanri-shiten-dropdown-query.dto';
import { CreateKanriShitenDto } from './dto/create-kanri-shiten.dto';
import { UpdateKanriShitenDto } from './dto/update-kanri-shiten.dto';
import { KanriShitenDetailDto } from './dto/kanri-shiten-detail.dto';
import { toKanriShitenDetail, toKanriShitenListItem } from './kanri-shiten.mapper';

/** Per-screen audit-context labels. */
const SCREEN_NAME = '管理支店マスタ明細検索画面 (ACSMS-SCR-008)';
/** Form endpoints (find/create/update) live under SCR-009. */
const SCREEN_NAME_SCR009 = '管理支店マスタ登録画面 (ACSMS-SCR-009)';
const TABLE_NAME = 'm_kanri_shiten';

/**
 * Field-level allow-list per ACSMS-SCR-009 api.md §4.5 (also reflected
 * in `.claude/rules/security.md §Layer 3`). NICHINO_ADMIN can update
 * every column; CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN can only touch
 * the 5 contact fields. Unauthorized fields are silently dropped from
 * the UPDATE — the request still 200s but those columns stay at their
 * BEFORE values.
 */
const FIELD_RESTRICTIONS: FieldRestrictionTable = {
  kanri_shiten: {
    NICHINO_ADMIN: ['*'],
    CHUOKAI: ['yubin_no', 'address', 'tel', 'fax', 'biko'],
    JA_HONTEN: ['yubin_no', 'address', 'tel', 'fax', 'biko'],
    JA_KANRI_SHITEN: ['yubin_no', 'address', 'tel', 'fax', 'biko'],
  },
};

/**
 * Sort-by allow-list. The 3 columns from 画面定義§8.1 are user-clickable
 * headers; `updated_at` is the implicit default so a freshly created or
 * updated row appears at the top on the next list render. `@IsIn` on the
 * DTO already rejects unknown keys; this map adds a static-typing guard.
 */
const SORT_COLUMN_MAP: Record<KanriShitenSearchSortBy, string> = {
  kanri_shiten_code: 'mks.kanri_shiten_code',
  kanri_shiten_name: 'mks.kanri_shiten_name',
  todofuken_code: 'mks.todofuken_code',
  updated_at: 'mks.updated_at',
};

/**
 * Tables whose presence of a non-soft-deleted row referencing the
 * kanri_shiten blocks DELETE (ACSMS-SCR-008-api.md §4.4). Some of these
 * tables aren't yet TypeORM entities — `assertNoRelatedRows` uses raw
 * parameterised `dataSource.query` to handle that uniformly.
 */
const RELATED_TABLES: readonly string[] = ['m_shiten', 't_dokusya', 'm_account'];

@Injectable()
export class KanriShitenService {
  private readonly logger = new Logger(KanriShitenService.name);

  constructor(
    @InjectRepository(KanriShiten)
    private readonly repo: Repository<KanriShiten>,
    @InjectRepository(Todofuken)
    private readonly todofukenRepo: Repository<Todofuken>,
    @InjectRepository(Ja)
    private readonly jaRepo: Repository<Ja>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── API-008-001 — GET /api/v1/kanri-shiten ──────────────────────────
  /**
   * Paginated search across `m_kanri_shiten`. Applies §4.3 DataScope
   * (NICHINO_ADMIN unrestricted, CHUOKAI / JA_HONTEN scoped by ja_id,
   * JA_KANRI_SHITEN scoped by ja_id + kanri_shiten_id).
   *
   * `todofuken_name` is hydrated via a single batch lookup against
   * `m_todofuken` (47 rows) — cheaper than a JOIN per row.
   */
  async findAll(
    query: SearchKanriShitenDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<KanriShitenListItemDto>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    // Default sort puts the most-recently-updated rows first so the row
    // a user just created / edited appears at the top of the list. The
    // 3 §8.1 columns remain available via clicking a header.
    const sort_by: KanriShitenSearchSortBy =
      (query.sort_by as KanriShitenSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.repo.createQueryBuilder('mks');

    // [soft-delete-filter]
    qb.where('mks.deleted_at IS NULL');

    // [data-scope] per role:
    //   NICHINO_*         → no filter (helper no-ops)
    //   CHUOKAI / JA_HONTEN → ja_id = session.ja_id (helper picks jaIdField)
    //   JA_KANRI_SHITEN   → kanri_shiten_id = session.kanri_shiten_id
    applyBranchScope(
      qb,
      'mks',
      { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
      session,
    );

    // [filter-conditions] — partial-match filters (all 5 are ILIKE per spec).
    if (query.kanri_shiten_code) {
      qb.andWhere('mks.kanri_shiten_code ILIKE :kanri_shiten_code', {
        kanri_shiten_code: `%${query.kanri_shiten_code}%`,
      });
    }
    if (query.kanri_shiten_name) {
      qb.andWhere('mks.kanri_shiten_name ILIKE :kanri_shiten_name', {
        kanri_shiten_name: `%${query.kanri_shiten_name}%`,
      });
    }
    if (query.todofuken_code) {
      // Exact match — UI is a 都道府県 dropdown (single selection), so
      // partial match doesn't help and a `=` predicate uses the
      // m_todofuken FK index. See screen-design v1.3 §2.1 +
      // api.md §処理手順.
      qb.andWhere('mks.todofuken_code = :todofuken_code', {
        todofuken_code: query.todofuken_code,
      });
    }
    if (query.tel) {
      qb.andWhere('mks.tel ILIKE :tel', { tel: `%${query.tel}%` });
    }
    if (query.fax) {
      qb.andWhere('mks.fax ILIKE :fax', { fax: `%${query.fax}%` });
    }

    // [sort-paginate] — append kanri_shiten_id as a stable tiebreaker
    // so rows with identical sort-key values (e.g. the same updated_at
    // timestamp from a bulk import) are returned in a deterministic order.
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .addOrderBy('mks.kanri_shiten_id', 'DESC')
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // Hydrate todofuken_name in one batch lookup. m_todofuken is 47 rows
    // — single `find()` is cheaper than a per-row JOIN.
    const tdRows = rows.length > 0 ? await this.todofukenRepo.find() : [];
    const tdMap = new Map(tdRows.map((t) => [t.todofukenCode, t.todofukenName]));

    // Hydrate ja_name with a single IN-list lookup over the page's ja_ids.
    // The 列「JA名」 was added per customer request to surface the parent
    // tenant on the SCR-008 list grid (per_page typically 20–50 rows so
    // the IN list stays small).
    const jaIds = Array.from(new Set(rows.map((r) => Number(r.jaId))));
    const jaRows =
      jaIds.length > 0
        ? await this.jaRepo
            .createQueryBuilder('mj')
            .select(['mj.jaId', 'mj.jaName'])
            .whereInIds(jaIds)
            .getMany()
        : [];
    const jaMap = new Map(jaRows.map((j) => [Number(j.jaId), j.jaName]));

    const data = rows.map((mks) =>
      toKanriShitenListItem(
        mks,
        tdMap.get(mks.todofukenCode) ?? '',
        jaMap.get(Number(mks.jaId)) ?? '',
      ),
    );

    return paginate(data, total, page, per_page);
  }

  // ─── ACSMS-API-COMMON-004 — GET /api/v1/kanri-shiten/dropdown ────────
  /**
   * Shared dropdown lookup used by SCR-007 / SCR-024 / SCR-025 forms.
   * Returns the minimal 3-column projection (`id / code / name`) filtered
   * by the caller-supplied `ja_id`. No permission gate (the caller's
   * screen-level guard already authorized the user); just authenticated
   * session is enough — per spec §4.2 "認証済みユーザーであればアクセス可能".
   *
   * Spec: docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md §ACSMS-API-COMMON-004.
   */
  async listDropdown(
    jaId: number,
    session: SessionPayload,
  ): Promise<KanriShitenDropdownItemDto[]> {
    const qb = this.repo
      .createQueryBuilder('mks')
      .where('mks.deleted_at IS NULL')
      .andWhere('mks.ja_id = :jaId', { jaId });

    // [data-scope] per role:
    //   NICHINO_*          → no extra filter (param ja_id bounds it)
    //   CHUOKAI / JA_HONTEN → ja_id = session.ja_id
    //   JA_KANRI_SHITEN    → kanri_shiten_id = session.kanri_shiten_id
    //                        (自分の管理支店のみ — 支店登録の親選択を限定)
    applyBranchScope(
      qb,
      'mks',
      { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
      session,
    );

    const rows = await qb.orderBy('mks.kanri_shiten_code', 'ASC').getMany();
    return rows.map((r) => ({
      kanri_shiten_id: Number(r.kanriShitenId),
      kanri_shiten_code: r.kanriShitenCode,
      kanri_shiten_name: r.kanriShitenName,
    }));
  }

  // ─── API-008-002 — DELETE /api/v1/kanri-shiten/:id ───────────────────
  /**
   * Logical delete. §4.4 enforces a 3-table conflict check before
   * committing (m_shiten / t_dokusya / m_account); §4.5 sets
   * `deleted_at = NOW()`; §4.6 writes a t_log row (operation='DELETE')
   * inside the same transaction; §4.8 emits an error log (log_type=3)
   * OUTSIDE the rolled-back transaction on failure.
   *
   * Permission `kanri_shiten.delete` is restricted to NICHINO_ADMIN per
   * 画面定義§1.3 — guard handles the role check; DataScope here is a
   * defence-in-depth NotFound mask for any non-admin that slips through.
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — also serves as before_value in audit log.
    const before = await this.repo.findOne({
      where: { kanriShitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('管理支店');

    // [fk-conflict-check] — block when any related table still has rows for this kanri_shiten.
    await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'kanri_shiten_id', id);

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete]
        await manager.update(
          KanriShiten,
          { kanriShitenId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — inside the same tx so atomicity holds.
        await this.auditLog.logDelete(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
          before,
          manager,
        );
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back tx so the trace
      // survives even when the business write was discarded.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
        'DELETE',
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-009-001 — GET /api/v1/kanri-shiten/:id ──────────────────────
  /**
   * Detail view for the edit form. Applies §4.3 DataScope (combined
   * existence + scope SELECT — out-of-scope rows return null which the
   * caller masks as NotFound, preventing existence leaks).
   *
   * `todofuken_name` is hydrated via a single Todofuken lookup.
   */
  async findById(
    id: number,
    session: SessionPayload,
  ): Promise<KanriShitenDetailDto> {
    const ks = await this.repo.findOne({
      where: { kanriShitenId: id, deletedAt: IsNull() },
    });
    if (!ks) throw new NotFoundException('管理支店');
    // [data-scope] — masks out-of-scope hits as 404 so existence
    // doesn't leak to a curl probe.
    assertBranchScope(Number(ks.jaId), Number(ks.kanriShitenId), session, '管理支店');

    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: ks.todofukenCode },
    });
    // [ja-name-lookup] — fetch ja_name so the FE form can display it
    // when the caller is JA_KANRI_SHITEN (no ja.view → no dropdown).
    const ja = await this.jaRepo.findOne({ where: { jaId: ks.jaId } });
    return toKanriShitenDetail(ks, td?.todofukenName ?? '', ja?.jaName ?? '');
  }

  // ─── API-009-002 — POST /api/v1/kanri-shiten ─────────────────────────
  /**
   * Create a new kanri_shiten. §4.3 validates todofuken existence;
   * §4.4 validates ja_id existence (via raw SQL — Ja entity is in a
   * different module and we don't want to drag the repo into this
   * module just for an existence check); §4.5 enforces uniqueness on
   * kanri_shiten_code. INSERT + audit log share one transaction; on
   * failure an error log is emitted OUTSIDE the rolled-back tx.
   */
  async create(
    dto: CreateKanriShitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<KanriShitenDetailDto & { message: string }> {
    // [code-master-check] — todofuken_code existence
    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: dto.todofuken_code },
    });
    if (!td) throw new BadRequestException('都道府県コードが存在しません。');

    // [code-master-check] — ja_id existence (m_ja in a different module; raw query
    // avoids cross-module repo wiring). Also fetch ja_name for the
    // response DTO so the FE form can render it without a separate
    // dropdown call (JA_KANRI_SHITEN has no ja.view permission).
    const jaRows: Array<{ ja_name: string }> = await this.dataSource.query(
      `SELECT ja_name FROM m_ja WHERE ja_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [dto.ja_id],
    );
    if (!jaRows?.length) {
      throw new BadRequestException('JA IDが存在しません。');
    }
    const jaName = jaRows[0].ja_name ?? '';

    // [uniqueness-check] — kanri_shiten_code. `withDeleted: true` — code
    // reuse is forbidden across lifetime (a code is reserved for the row
    // even after logical delete), matching the DB UNIQUE INDEX which
    // does not filter on deleted_at.
    const dup = await this.repo.findOne({
      where: { kanriShitenCode: dto.kanri_shiten_code },
      withDeleted: true,
    });
    if (dup) {
      throw new DuplicateCodeException('管理支店コード', dto.kanri_shiten_code);
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        // [business-insert]
        const entity = manager.create(KanriShiten, {
          jaId: dto.ja_id,
          kanriShitenCode: dto.kanri_shiten_code,
          kanriShitenName: dto.kanri_shiten_name,
          kanriShitenNameKana: dto.kanri_shiten_name_kana ?? '',
          todofukenCode: dto.todofuken_code,
          yubinNo: dto.yubin_no ?? '',
          address: dto.address ?? '',
          tel: dto.tel ?? '',
          fax: dto.fax ?? '',
          paperFlg: dto.paper_flg ?? false,
          denshiFlg: dto.denshi_flg ?? false,
          biko: dto.biko ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = await manager.save(entity);

        // [audit-log-in-tx] — same tx so atomicity holds.
        await this.auditLog.logCreate(
          buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, created.kanriShitenId),
          created,
          manager,
        );
        return created;
      });

      return {
        ...toKanriShitenDetail(saved, td.todofukenName ?? '', jaName),
        message: '登録しました。',
      };
    } catch (err) {
      // Race-condition safety net: 2 concurrent CREATE requests can
      // both pass the pre-check, then the second INSERT hits the DB
      // UNIQUE INDEX. Convert that 23505 into a clean 400 instead of
      // letting it bubble as 500.
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, null),
          'CREATE',
          err as Error,
        );
        throw new DuplicateCodeException('管理支店コード', dto.kanri_shiten_code);
      }
      // [audit-error-log] — OUTSIDE the rolled-back tx.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, null),
        'CREATE',
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-009-003 — PUT /api/v1/kanri-shiten/:id ──────────────────────
  /**
   * Update an existing row. §4.3 combined existence + DataScope SELECT
   * (out-of-scope rows mask as NotFound); §4.5 enforces field-level
   * allow-list per role (CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN can only
   * touch yubin_no/address/tel/fax/biko). UPDATE + audit log share one
   * transaction; error log emitted OUTSIDE the rolled-back tx.
   */
  async update(
    id: number,
    dto: UpdateKanriShitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<KanriShitenDetailDto & { message: string }> {
    // [fetch-target] — existence + [data-scope] (out-of-scope rows masked as 404).
    const before = await this.repo.findOne({
      where: { kanriShitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('管理支店');
    assertBranchScope(Number(before.jaId), Number(before.kanriShitenId), session, '管理支店');

    // [role-allow-list] — field-level allow-list. Drops fields the role can't update;
    // for non-admin roles, `todofuken_code` is silently filtered out
    // BEFORE the [code-master-check] below, so they bypass the todofuken
    // validation entirely (their request effectively didn't change that
    // column).
    const filtered = filterAllowedFields(
      dto as unknown as Record<string, unknown>,
      'kanri_shiten',
      session.role_code,
      FIELD_RESTRICTIONS,
    );

    // [code-master-check] — todofuken_code existence (only relevant when the
    // field survived the allow-list — i.e. NICHINO_ADMIN path).
    if ('todofuken_code' in filtered) {
      const td = await this.todofukenRepo.findOne({
        where: { todofukenCode: filtered.todofuken_code as string },
      });
      if (!td) throw new BadRequestException('都道府県コードが存在しません。');
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // [partial-update] — UPDATE with only the allowed fields applied. Each
        // unrestricted field falls back to the BEFORE value via
        // `pickX(filtered, key, before.x)` so the column stays put
        // when not in the allow-list.
        const updatePayload = {
          kanriShitenName: pickString(filtered, 'kanri_shiten_name', before.kanriShitenName),
          kanriShitenNameKana: pickString(filtered, 'kanri_shiten_name_kana', before.kanriShitenNameKana),
          todofukenCode: pickString(filtered, 'todofuken_code', before.todofukenCode),
          yubinNo: pickString(filtered, 'yubin_no', before.yubinNo),
          address: pickString(filtered, 'address', before.address),
          tel: pickString(filtered, 'tel', before.tel),
          fax: pickString(filtered, 'fax', before.fax),
          paperFlg: pickBool(filtered, 'paper_flg', before.paperFlg),
          denshiFlg: pickBool(filtered, 'denshi_flg', before.denshiFlg),
          biko: pickString(filtered, 'biko', before.biko),
          updatedBy: String(session.account_id),
          updatedAt: new Date(),
        };
        await manager.update(KanriShiten, { kanriShitenId: id }, updatePayload);

        const after = { ...before, ...updatePayload, kanriShitenId: id } as KanriShiten;

        // [audit-log-in-tx] — UPDATE with before/after JSON.
        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, id),
          before,
          after,
          manager,
        );
      });

      // Re-read for the response — the UPDATE above didn't return the
      // refreshed row, and TypeORM doesn't refresh entities in-place.
      const after = await this.repo.findOne({
        where: { kanriShitenId: id, deletedAt: IsNull() },
      });
      const td = await this.todofukenRepo.findOne({
        where: { todofukenCode: after?.todofukenCode ?? before.todofukenCode },
      });
      // ja_id is immutable on update, so before.jaId == after.jaId.
      const ja = await this.jaRepo.findOne({ where: { jaId: before.jaId } });
      return {
        ...toKanriShitenDetail(after ?? before, td?.todofukenName ?? '', ja?.jaName ?? ''),
        message: '更新しました。',
      };
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, id),
        'UPDATE',
        err as Error,
      );
      throw err;
    }
  }
}

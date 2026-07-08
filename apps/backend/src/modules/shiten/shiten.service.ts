import { Injectable, Logger } from '@nestjs/common';
import { AuditOperation } from '@/common/enums';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Shiten } from '@/database/entities/shiten.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import {
  BadRequestException,
  DuplicateCodeException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import {
  applyBranchScope,
  applyJaScope,
  assertJaScope,
  assertBranchScopeViolation,
  fetchFkInJa,
} from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import { assertNoRelatedRows } from '@/common/utils/fk-conflict';
import {
  filterAllowedFields,
  type FieldRestrictionTable,
} from '@/common/utils/field-restrictions';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { pickString, pickNumber } from '@/common/utils/pick';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateShitenDto } from './dto/create-shiten.dto';
import { UpdateShitenDto } from './dto/update-shiten.dto';
import { SearchShitenDto, type ShitenSearchSortBy } from './dto/search-shiten.dto';
import { ShitenDetailDto } from './dto/shiten-detail.dto';
import { ShitenListItemDto } from './dto/shiten-list-item.dto';
import { toShitenDetail, toShitenListItem } from './shiten.mapper';

/** Per-screen audit-context labels. */
const SCREEN_NAME_SCR006 = '支店マスタ明細検索画面 (ACSMS-SCR-006)';
const SCREEN_NAME_SCR007 = '支店マスタ登録画面 (ACSMS-SCR-007)';
const TABLE_NAME = 'm_shiten';

/**
 * Field-level restriction table per `.claude/rules/security.md` §Layer 3.
 *
 * Customer policy 2026-05: every role except JA_KANRI_SHITEN may freely
 * change any column on PUT — `['*']`. JA_KANRI_SHITEN can edit the same
 * shiten row but `kanri_shiten_id` is read-only (the row's "parent
 * kanri-shiten" assignment is owned by higher roles). The FE mirrors
 * this with `:disabled` on the 管理支店 select in ShitenFormView.vue
 * (`[role5-locked-fields]`); this BE table is the authoritative gate —
 * a curl bypass that smuggles `kanri_shiten_id` past the FE still has
 * the key silently dropped here.
 *
 * Roles not listed (= NICHINO_ADMIN / NICHINO_STAFF in production today)
 * have no `shiten.update` permission and never reach this filter — the
 * controller guard rejects them first. Listing CHUOKAI / JA_HONTEN with
 * `['*']` makes the policy intent grep-able alongside JA_KANRI_SHITEN.
 */
const FIELD_RESTRICTIONS: FieldRestrictionTable = {
  shiten: {
    NICHINO_ADMIN: ['*'],
    NICHINO_STAFF: ['*'],
    CHUOKAI: ['*'],
    JA_HONTEN: ['*'],
    JA_KANRI_SHITEN: [
      'shiten_name',
      'shiten_name_kana',
      'kinyu_shiten_flg',
      'jastem_toriatsukai_tenpo_code',
      'jastem_tenpo_name',
      'jastem_tyokin_shubetsu',
      'jastem_koza_no',
      'biko',
      // `kanri_shiten_id` deliberately absent — read-only for role 5.
    ],
  },
};

/**
 * Sort-by allow-list. `shiten_code` / `shiten_name` are local columns
 * (alias `m`); `kanri_shiten_name` lives on `m_kanri_shiten` (alias
 * `ks`) and triggers a LEFT JOIN in `findAll`. `@IsIn` on the DTO
 * already rejects unknown keys; this map adds a static-typing guard
 * against `ORDER BY ${user_input}` injection.
 */
const SORT_COLUMN_MAP: Record<ShitenSearchSortBy, string> = {
  shiten_code: 'm.shiten_code',
  shiten_name: 'm.shiten_name',
  // Property name (camelCase) — the alias `ks` is the KanriShiten
  // entity, so TypeORM's metadata resolution needs the property name,
  // not the underlying snake_case DB column. The DISTINCT-subquery
  // wrapper that take()/skip() generates fails the metadata lookup
  // otherwise.
  kanri_shiten_name: 'ks.kanriShitenName',
  updated_at: 'm.updated_at',
};

/**
 * Tables whose presence of a non-soft-deleted row referencing the
 * shiten blocks DELETE (ACSMS-SCR-006-api.md §4.4 — currently only
 * t_dokusya.shiten_id). Add more here as new dependent tables ship.
 */
const RELATED_TABLES: readonly string[] = ['t_dokusya'];

@Injectable()
export class ShitenService {
  private readonly logger = new Logger(ShitenService.name);

  constructor(
    @InjectRepository(Shiten)
    private readonly repo: Repository<Shiten>,
    @InjectRepository(KanriShiten)
    private readonly kanriShitenRepo: Repository<KanriShiten>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── API-006-001 — GET /api/v1/shiten ────────────────────────────────
  /**
   * Paginated search across `m_shiten`. Applies §4.3 DataScope at JA
   * level for EVERY restricted role: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
   * all scoped by `ja_id = session.ja_id`; NICHINO_* unrestricted
   * (handled at guard layer in practice — not granted `shiten.view`).
   *
   * 顧客要件 2026-06: JA_KANRI_SHITEN は **閲覧のみ** 自管理支店配下に
   * 限定せず同一 JA の全支店を一覧できる（kanri_shiten_id で絞らない）。
   * 更新/削除は従来どおり自管理支店配下のみ（update/remove の
   * assertBranchScopeViolation で担保）。
   */
  async findAll(
    query: SearchShitenDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<ShitenListItemDto>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    // Default sort puts the most-recently-updated rows first so the row
    // a user just created / edited appears at the top of the list. The
    // 画面定義§8.1 columns (shiten_code / shiten_name / kanri_shiten_name)
    // remain available via clicking a header.
    const sort_by: ShitenSearchSortBy =
      (query.sort_by as ShitenSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.repo.createQueryBuilder('m');

    // [soft-delete-filter]
    qb.where('m.deleted_at IS NULL');

    // [data-scope] 閲覧スコープは全制限ロール JA レベル:
    //   NICHINO_*                          → no filter
    //   CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN → ja_id = session.ja_id
    // （JA_KANRI_SHITEN も kanri_shiten_id で絞らない — 顧客要件 2026-06。
    //   更新/削除の権限境界は update/remove 側で kanri_shiten_id 判定）。
    applyJaScope(qb, 'm', 'jaId', session);

    // [filter-conditions] — partial-match (ILIKE) for text inputs, exact
    // for kanri_shiten_id / kinyu_shiten_flg. kinyu_shiten_flg=undefined
    // means "全選択" (no filter) — only when explicitly true or false
    // should we constrain the result set.
    if (query.shiten_name) {
      qb.andWhere('m.shiten_name ILIKE :shiten_name', {
        shiten_name: `%${query.shiten_name}%`,
      });
    }
    if (query.shiten_code) {
      qb.andWhere('m.shiten_code ILIKE :shiten_code', {
        shiten_code: `%${query.shiten_code}%`,
      });
    }
    if (query.kanri_shiten_id !== undefined) {
      qb.andWhere('m.kanri_shiten_id = :kanri_shiten_id', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }
    if (query.jastem_toriatsukai_tenpo_code) {
      qb.andWhere(
        'm.jastem_toriatsukai_tenpo_code ILIKE :jastem_toriatsukai_tenpo_code',
        {
          jastem_toriatsukai_tenpo_code: `%${query.jastem_toriatsukai_tenpo_code}%`,
        },
      );
    }
    if (query.kinyu_shiten_flg !== undefined) {
      qb.andWhere('m.kinyu_shiten_flg = :kinyu_shiten_flg', {
        kinyu_shiten_flg: query.kinyu_shiten_flg,
      });
    }

    // Sorting by the joined column requires the JOINed column to live
    // in the SELECT — TypeORM's take()/skip() wraps the query in a
    // DISTINCT subquery, and the outer ORDER BY can only reference
    // columns that the subquery exposed. `leftJoinAndSelect` (rather
    // than `leftJoin`) populates `ks.*` in the SELECT, which lets
    // `ORDER BY ks.kanri_shiten_name` resolve cleanly.
    // Skip the JOIN when sorting by a local column to keep that path cheap.
    if (sort_by === 'kanri_shiten_name') {
      qb.leftJoinAndSelect('m.kanriShiten', 'ks');
    }

    // [sort-paginate]
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.shiten_code;
    qb.orderBy(orderColumn, sort_order)
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // Batch-fetch kanri_shiten_name in one round-trip — same pattern as
    // KanriShitenListView resolves todofuken_name. Cheaper than a JOIN
    // per row, and the parent rows are bounded by the page size.
    const ksIds = [...new Set(rows.map((r) => Number(r.kanriShitenId)))];
    const ksRows =
      ksIds.length > 0
        ? await this.kanriShitenRepo.find({
            where: { kanriShitenId: In(ksIds) },
          })
        : [];
    const ksNameMap = new Map(
      ksRows.map((k) => [Number(k.kanriShitenId), k.kanriShitenName]),
    );

    const data = rows.map((r) =>
      toShitenListItem(r, ksNameMap.get(Number(r.kanriShitenId)) ?? ''),
    );

    return paginate(data, total, page, per_page);
  }

  // ─── API-006-002 — DELETE /api/v1/shiten/:id ─────────────────────────
  /**
   * Logical delete. §4.3 combined existence + DataScope SELECT
   * (out-of-scope rows return null → masked as NotFound). §4.4 blocks
   * the delete when any related table (t_dokusya) still references the
   * shiten. §4.5 sets `deleted_at = NOW()` + writes audit log inside
   * the same transaction; §4.8 emits an error log (log_type=3) OUTSIDE
   * the rolled-back transaction on failure.
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — also serves as before_value in audit log.
    const before = await this.repo.findOne({
      where: { shitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('支店');
    // [data-scope] 顧客要件 2026-06 — 2段階:
    //   1) 別 JA は 404（存在を秘匿）。
    //   2) JA_KANRI_SHITEN が同一 JA でも自管理支店配下でない行を削除しよう
    //      とした場合は 403（一覧で閲覧可能な行なので 404 で隠さず明示拒否）。
    //      CHUOKAI / JA_HONTEN は ja_id 判定なので同一 JA 内は素通り。
    assertJaScope(before.jaId, session, '支店');
    assertBranchScopeViolation(before.jaId, before.kanriShitenId, session);

    // [fk-conflict-check] — conflict check on t_dokusya. Thrown ConflictException
    // bypasses the try/catch below by design — it's a user-fixable
    // 409, not an internal failure that warrants an error log.
    await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'shiten_id', id);

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete]
        await manager.update(
          Shiten,
          { shitenId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — inside the same tx so atomicity holds.
        await this.auditLog.logDelete(
          buildAuditCtx(session, req, SCREEN_NAME_SCR006, TABLE_NAME, id),
          before,
          manager,
        );
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back tx so the trace
      // survives even when the business write was discarded.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME_SCR006, TABLE_NAME, id),
        AuditOperation.DELETE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-COMMON — Shiten dropdown (SCR-011) ───────────────────
  /**
   * Minimal dropdown projection consumed by 購読者情報登録 (SCR-011)'s
   * 引落口座支店 picker. Optional `kinyu_shiten_flg` filter narrows to
   * 金融機関支店 only (machine-readable filter for the 口座引落 case).
   * Scoped by `applyBranchScope`; NICHINO_* see all JAs unless `ja_id`
   * is supplied, JA_KANRI_SHITEN is narrowed to its own kanri_shiten_id.
   * Soft-deleted rows excluded. `q` partial-matches shiten_name (ILIKE).
   */
  async listDropdown(
    query: { ja_id?: number; kinyu_shiten_flg?: boolean; q?: string },
    session: SessionPayload,
  ): Promise<
    Array<{
      shiten_id: number;
      shiten_code: string;
      shiten_name: string;
      kanri_shiten_id: number;
      kinyu_shiten_flg: boolean;
      jastem_toriatsukai_tenpo_code: string;
      jastem_tenpo_name: string;
    }>
  > {
    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.deleted_at IS NULL');
    applyBranchScope(
      qb,
      'm',
      { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
      session,
    );
    if (session.ja_id == null && query.ja_id !== undefined) {
      qb.andWhere('m.ja_id = :qja', { qja: query.ja_id });
    }
    if (query.kinyu_shiten_flg !== undefined) {
      qb.andWhere('m.kinyu_shiten_flg = :ksf', {
        ksf: query.kinyu_shiten_flg,
      });
    }
    if (query.q) {
      qb.andWhere('m.shiten_name ILIKE :q', { q: `%${query.q}%` });
    }
    qb.orderBy('m.shiten_code', 'ASC');
    const rows = await qb.getMany();
    return rows.map((r) => ({
      shiten_id: Number(r.shitenId),
      shiten_code: r.shitenCode,
      shiten_name: r.shitenName,
      kanri_shiten_id: Number(r.kanriShitenId),
      kinyu_shiten_flg: Boolean(r.kinyuShitenFlg),
      jastem_toriatsukai_tenpo_code: r.jastemToriatsukaiTenpoCode ?? '',
      jastem_tenpo_name: r.jastemTenpoName ?? '',
    }));
  }

  // ─── ACSMS-API-COMMON-008 — GET /api/v1/shiten/koza-dropdown ─────────
  /**
   * 口座支店（金融機関支店フラグ=TRUE）のプルダウン (定義元: ACSMS-SCR-020)。
   * DataScope: ja_id = user.ja_id（JA_KANRI_SHITEN は kanri_shiten_id も絞込）。
   * 任意の kanri_shiten_ids でさらに絞り込む。
   */
  async getKozaDropdown(
    query: { kanri_shiten_ids?: number[] },
    session: SessionPayload,
  ): Promise<{
    data: Array<{
      shiten_id: number;
      shiten_code: string;
      shiten_name: string;
      kanri_shiten_id: number;
      // SCR-020: 選択した口座支店ごとに JASTEM 金融機関支店情報を表で表示する。
      jastem_toriatsukai_tenpo_code: string;
      jastem_tenpo_name: string;
      jastem_tyokin_shubetsu: string;
      jastem_koza_no: string;
    }>;
  }> {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere('s.kinyu_shiten_flg = TRUE')
      .andWhere('s.ja_id = :jaId', { jaId: session.ja_id });
    // JA_KANRI_SHITEN は自管理支店のみ。
    if (session.kanri_shiten_id != null) {
      qb.andWhere('s.kanri_shiten_id = :userKsId', {
        userKsId: session.kanri_shiten_id,
      });
    }
    // 画面の絞込条件。
    if (query.kanri_shiten_ids && query.kanri_shiten_ids.length > 0) {
      qb.andWhere('s.kanri_shiten_id = ANY(:ksIds)', {
        ksIds: query.kanri_shiten_ids,
      });
    }
    qb.orderBy('s.shiten_code', 'ASC');
    const rows = await qb.getMany();
    return {
      data: rows.map((r) => ({
        shiten_id: Number(r.shitenId),
        shiten_code: r.shitenCode,
        shiten_name: r.shitenName,
        kanri_shiten_id: Number(r.kanriShitenId),
        jastem_toriatsukai_tenpo_code: r.jastemToriatsukaiTenpoCode ?? '',
        jastem_tenpo_name: r.jastemTenpoName ?? '',
        jastem_tyokin_shubetsu: r.jastemTyokinShubetsu || '1',
        jastem_koza_no: r.jastemKozaNo ?? '',
      })),
    };
  }

  // ─── API-007-001 — GET /api/v1/shiten/:id ────────────────────────────
  /**
   * Detail view for the edit form. Applies §4.3 DataScope (combined
   * existence + scope SELECT — out-of-scope rows return null which the
   * caller masks as NotFound, preventing existence leaks).
   *
   * §1.2 (screen-design) + 顧客要件 2026-06: JA_KANRI_SHITEN sees any
   * own-JA shiten (閲覧のみ — not narrowed to own-kanri-shiten). Scope is
   * ja_id only; out-of-JA masks as 404. The edit form opened from a
   * non-own branch is read-only on the FE, and update/remove reject it
   * with 403 server-side (assertBranchScopeViolation).
   */
  async findById(
    id: number,
    session: SessionPayload,
  ): Promise<ShitenDetailDto> {
    // [data-scope] (画面定義§1.2) — fetch unscoped, then assert by ja_id
    // (out-of-JA masks as 404). NICHINO_* bypass inside the helper.
    const row = await this.repo.findOne({
      where: { shitenId: id, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('支店');
    assertJaScope(row.jaId, session, '支店');

    return toShitenDetail(row);
  }

  // ─── API-007-002 — POST /api/v1/shiten ───────────────────────────────
  /**
   * Create a new shiten. §4.3 enforces uniqueness on (ja_id, shiten_code);
   * also validates `kanri_shiten_id` exists in m_kanri_shiten (FK guard).
   * INSERT + audit log share one transaction; on failure an error log
   * is emitted OUTSIDE the rolled-back tx.
   *
   * `ja_id` is sourced from the session — body has no ja_id field per
   * api.md §リクエストパラメータ. NICHINO_ADMIN / NICHINO_STAFF are
   * blocked at the permission layer; the JA-scoped roles always carry
   * a non-null session.ja_id.
   */
  async create(
    dto: CreateShitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ShitenDetailDto & { message: string }> {
    const sessionJaId = session.ja_id;
    if (sessionJaId === null) {
      throw new BadRequestException('JA IDが取得できません。');
    }

    // FK guard + Layer 4 DataScope — kanri_shiten must exist AND belong
    // to the caller's JA. Without the scope check, a CHUOKAI user could
    // forge kanri_shiten_id of a different JA's branch into the body,
    // creating cross-tenant data corruption.
    await fetchFkInJa(
      this.kanriShitenRepo,
      'kanriShitenId',
      dto.kanri_shiten_id,
      sessionJaId,
      '管理支店',
    );

    // [uniqueness-check] — (ja_id, shiten_code). Includes soft-deleted
    // rows: a code is reserved for the lifetime of the row, even after
    // logical delete. Matches the DB UNIQUE INDEX which also does not
    // filter on deleted_at, so Service intent + DB constraint agree
    // (commit history: previously the check filtered `deletedAt: IsNull`
    // which let a "delete then re-create" INSERT slip past Service and
    // hit the DB UNIQUE constraint → 500). Customer policy: code reuse
    // is forbidden across all master tables.
    const dup = await this.repo.findOne({
      where: { jaId: sessionJaId, shitenCode: dto.shiten_code },
      withDeleted: true,
    });
    if (dup) {
      throw new DuplicateCodeException('支店コード', dto.shiten_code);
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        // [business-insert]
        const entity = manager.create(Shiten, {
          jaId: sessionJaId,
          shitenCode: dto.shiten_code,
          shitenName: dto.shiten_name,
          shitenNameKana: dto.shiten_name_kana ?? '',
          kinyuShitenFlg: dto.kinyu_shiten_flg ?? false,
          // JASTEM 店舗単位 4 列 — DTO drops blank strings to undefined
          // via `@Transform(blankToUndef)` on optional fields without one;
          // here we keep `?? ''` so missing keys map to empty (NOT NULL).
          jastemToriatsukaiTenpoCode: dto.jastem_toriatsukai_tenpo_code ?? '',
          jastemTenpoName: dto.jastem_tenpo_name ?? '',
          jastemTyokinShubetsu: dto.jastem_tyokin_shubetsu ?? '',
          jastemKozaNo: dto.jastem_koza_no ?? '',
          kanriShitenId: dto.kanri_shiten_id,
          biko: dto.biko ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = await manager.save(entity);

        // [audit-log-in-tx] — same tx so atomicity holds.
        await this.auditLog.logCreate(
          buildAuditCtx(session, req, SCREEN_NAME_SCR007, TABLE_NAME, created.shitenId),
          created,
          manager,
        );
        return created;
      });

      return {
        ...toShitenDetail(saved),
        message: '登録しました。',
      };
    } catch (err) {
      // Race-condition safety net: 2 concurrent CREATE requests can
      // both pass the pre-check, then the second INSERT hits the DB
      // UNIQUE INDEX. Convert that 23505 into a clean 400 instead of
      // letting it bubble as 500.
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          buildAuditCtx(session, req, SCREEN_NAME_SCR007, TABLE_NAME, null),
          AuditOperation.CREATE,
          err as Error,
        );
        throw new DuplicateCodeException('支店コード', dto.shiten_code);
      }
      // [audit-error-log] — OUTSIDE the rolled-back tx.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME_SCR007, TABLE_NAME, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-007-003 — PUT /api/v1/shiten/:id ────────────────────────────
  /**
   * Update an existing row. §4.3 combined existence + DataScope SELECT
   * (out-of-scope rows mask as NotFound). `shiten_code` is immutable —
   * the UpdateShitenDto omits it and any smuggled value is rejected at
   * the ValidationPipe (forbidNonWhitelisted: true).
   *
   * UPDATE + audit log share one transaction; error log emitted OUTSIDE
   * the rolled-back tx.
   */
  async update(
    id: number,
    dto: UpdateShitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ShitenDetailDto & { message: string }> {
    // [fetch-target] existence + [data-scope] — fetch unscoped, then
    // assert. 顧客要件 2026-06 — 2段階:
    //   1) 別 JA は 404（存在を秘匿）。
    //   2) JA_KANRI_SHITEN が同一 JA でも自管理支店配下でない行を更新しよう
    //      とした場合は 403（一覧で閲覧可能な行なので明示拒否）。CHUOKAI /
    //      JA_HONTEN は ja_id 判定なので同一 JA 内は素通り。
    const before = await this.repo.findOne({
      where: { shitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('支店');
    assertJaScope(before.jaId, session, '支店');
    assertBranchScopeViolation(before.jaId, before.kanriShitenId, session);

    // [kinyu-immutable] 金融機関支店フラグは作成後に変更不可（顧客要件 2026-07）。
    // 引落口座支店として t_dokusya.bank_branch_code から参照される shiten の
    // 種別を後から変えると、既存購読者との紐付け（引落口座）が壊れるため固定する。
    // FE も編集画面で当該チェックボックスを disabled にする（二重防御）。DTO では
    // JASTEM 必須判定に kinyu_shiten_flg を使うため受け取りは残し、値の変更のみ拒否。
    if (
      dto.kinyu_shiten_flg !== undefined &&
      dto.kinyu_shiten_flg !== before.kinyuShitenFlg
    ) {
      throw new ValidationException([
        {
          field: 'kinyu_shiten_flg',
          message: '金融機関支店フラグは変更できません。',
        },
      ]);
    }

    // FK guard + Layer 4 DataScope — new kanri_shiten must exist AND
    // belong to the SAME JA as the existing shiten (before.jaId). For
    // restricted roles this equals session.ja_id; for NICHINO_*
    // operating on an arbitrary JA's row it stays bound to that JA.
    if (dto.kanri_shiten_id !== undefined) {
      await fetchFkInJa(
        this.kanriShitenRepo,
        'kanriShitenId',
        dto.kanri_shiten_id,
        Number(before.jaId),
        '管理支店',
      );
    }

    // [role-allow-list] — silent-drop disallowed columns per
    // FIELD_RESTRICTIONS. Today the only role with a narrower allow-list
    // is JA_KANRI_SHITEN, which cannot touch `kanri_shiten_id`; every
    // other role gets `['*']` (full passthrough). The `pickXxx(...)`
    // helpers below fall back to the existing `before.*` value when a
    // key is missing from `filtered`, so a dropped column simply
    // preserves its prior value instead of writing null.
    const filtered = filterAllowedFields(
      dto as unknown as Record<string, unknown>,
      'shiten',
      session.role_code,
      FIELD_RESTRICTIONS,
    ) as Record<string, unknown>;

    let after: Shiten = before;
    try {
      await this.dataSource.transaction(async (manager) => {
        const updatePayload = {
          shitenName: pickString(filtered, 'shiten_name', before.shitenName),
          shitenNameKana: pickString(filtered, 'shiten_name_kana', before.shitenNameKana),
          // [kinyu-immutable] 作成後は変更不可のため常に既存値を維持する
          // （上の guard で変更要求は 400 で弾かれる）。
          kinyuShitenFlg: before.kinyuShitenFlg,
          // JASTEM 店舗単位 4 列 — pickString falls back to the existing
          // value when DTO key is missing, so partial PATCH-style PUTs
          // keep prior JASTEM data intact.
          jastemToriatsukaiTenpoCode: pickString(
            filtered,
            'jastem_toriatsukai_tenpo_code',
            before.jastemToriatsukaiTenpoCode,
          ),
          jastemTenpoName: pickString(filtered, 'jastem_tenpo_name', before.jastemTenpoName),
          jastemTyokinShubetsu: pickString(
            filtered,
            'jastem_tyokin_shubetsu',
            before.jastemTyokinShubetsu,
          ),
          jastemKozaNo: pickString(filtered, 'jastem_koza_no', before.jastemKozaNo),
          kanriShitenId: pickNumber(filtered, 'kanri_shiten_id', before.kanriShitenId),
          biko: pickString(filtered, 'biko', before.biko),
          updatedBy: String(session.account_id),
          updatedAt: new Date(),
        };
        await manager.update(Shiten, { shitenId: id }, updatePayload);

        // Project the merged row in-memory; TypeORM's manager.update
        // doesn't refresh the entity, and a re-read would round-trip
        // for no benefit since we already know the payload that won.
        after = { ...before, ...updatePayload, shitenId: id };

        // [audit-log-in-tx] — UPDATE with before/after JSON.
        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, SCREEN_NAME_SCR007, TABLE_NAME, id),
          before,
          after,
          manager,
        );
      });

      return {
        ...toShitenDetail(after),
        message: '更新しました。',
      };
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME_SCR007, TABLE_NAME, id),
        AuditOperation.UPDATE,
        err as Error,
      );
      throw err;
    }
  }
}

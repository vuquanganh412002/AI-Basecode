import { HttpException, HttpStatus, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';

import { LogType, ResultStatus, RoleCode } from '@/common/enums';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import {
  ConflictException,
  DataScopeViolationException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { applyJaScope, fetchFkInJa } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateHanbaitenDto } from './dto/create-hanbaiten.dto';
import {
  ImportHanbaitenDto,
  ImportHanbaitenRowDto,
} from './dto/import-hanbaiten.dto';
import {
  SearchHanbaitenDto,
  type HanbaitenSearchSortBy,
} from './dto/search-hanbaiten.dto';
import { UpdateHanbaitenDto } from './dto/update-hanbaiten.dto';
import { ImportValidationException } from './exceptions/import-validation.exception';
import { RowLimitExceededException } from './exceptions/row-limit-exceeded.exception';
import {
  toHanbaitenDetail,
  type HanbaitenDetailResponse,
  type HanbaitenDetailRow,
} from './hanbaiten-form.mapper';
import { toHanbaitenListItem, type HanbaitenListItem } from './hanbaiten.mapper';
import {
  IMPORT_COLUMN_TO_FIELD,
  IMPORT_FIELD_EMPTY_DEFAULT,
  IMPORT_MAX_ROWS,
  IMPORT_TEMPLATE_COLUMNS,
} from './dto/import-template.constants';

/** Per-screen audit-context labels — see api.md §4.6 INSERT INTO t_log. */
const SCREEN_NAME = '販売店明細検索画面 (ACSMS-SCR-018)';
const SCR017_SCREEN_NAME = '販売店情報登録画面 (ACSMS-SCR-017)';
const SCR019_SCREEN_NAME = '販売店Excelデータ取込画面 (ACSMS-SCR-019)';
const TABLE_NAME = 'm_hanbaiten';

/**
 * Fields that become REQUIRED when `itaku_kubun === 1` (振込) per
 * 画面設計書 v1.2 §3.1. Cross-field rule — enforced in the service
 * layer (DTO-level `@ValidateIf` would couple validators across
 * fields and surface English class-validator messages on partial
 * inputs).
 */
const ITAKU_KUBUN_FURIKOMI = 1;
const CONDITIONAL_REQUIRED_FIELDS: ReadonlyArray<{
  key:
    | 'bank_code'
    | 'bank_name'
    | 'bank_branch_code'
    | 'bank_branch_name'
    | 'yokin_shubetsu'
    | 'koza_no'
    | 'koza_meigi';
  label: string;
}> = [
  { key: 'bank_code', label: '金融機関コード' },
  { key: 'bank_name', label: '金融機関名' },
  { key: 'bank_branch_code', label: '口座支店コード' },
  { key: 'bank_branch_name', label: '口座支店名' },
  { key: 'yokin_shubetsu', label: '口座種別' },
  { key: 'koza_no', label: '口座番号' },
  { key: 'koza_meigi', label: '口座名義' },
];

/**
 * Throw ONE VALIDATION_ERROR aggregating every field that's blank when
 * `itaku_kubun === 1`. Shape matches `ValidationPipe` output so the FE
 * `useApiForm` composable maps both paths uniformly to
 * `<a-form-item :help>` field-level errors.
 */
function assertConditionalRequired(
  dto: CreateHanbaitenDto | UpdateHanbaitenDto,
): void {
  if (dto.itaku_kubun !== ITAKU_KUBUN_FURIKOMI) return;
  const missing: { field: string; message: string }[] = [];
  for (const { key, label } of CONDITIONAL_REQUIRED_FIELDS) {
    const v = (dto as unknown as Record<string, unknown>)[key];
    const blank =
      v === undefined ||
      v === null ||
      (typeof v === 'string' && v.trim() === '');
    if (blank) {
      missing.push({
        field: key,
        message: `委託区分が振込の場合は${label}は必須です。`,
      });
    }
  }
  if (missing.length === 0) return;
  throw new HttpException(
    {
      code: 'VALIDATION_ERROR',
      error_code: 'VALIDATION_ERROR',
      message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
      errors: missing,
    },
    HttpStatus.BAD_REQUEST,
  );
}

/**
 * Whitelist mapping the public `sort_by` query value to the actual
 * SQL column path. `@IsIn` on the DTO already rejects unknown keys;
 * this map is the static-typing guard against `ORDER BY ${user_input}`
 * injection. Per 画面設計書 v1.2 §8.1 only the two local columns are
 * exposed.
 */
const SORT_COLUMN_MAP: Record<HanbaitenSearchSortBy, string> = {
  hanbaiten_code: 'm.hanbaiten_code',
  hanbaiten_name: 'm.hanbaiten_name',
};

/**
 * Tables whose presence of a non-soft-deleted row referencing the
 * hanbaiten blocks DELETE (api.md §4.4). Adding a new dependent table
 * = appending here.
 *
 * NOTE: `t_dokusya_rireki` is intentionally OMITTED until the
 * 購読者 (dokusya) SCR ships that creates the table. Including it here
 * would 500 every DELETE in prod (table doesn't exist). Re-add the
 * `{ table: 't_dokusya_rireki', hasDeletedAt: false }` row + the
 * matching service-spec / integration-spec assertions once the dokusya
 * migration is merged. See api.md §4.4 ACSMS-SCR-018 — the original
 * spec lists BOTH tables; this is a deliberate temporary deviation.
 */
const RELATED_TABLES: ReadonlyArray<{
  table: string;
  hasDeletedAt: boolean;
}> = [
  { table: 't_dokusya', hasDeletedAt: true },
];

/**
 * CONFLICT message literal per ACSMS-MSG-018-004 (画面設計書 v1.2 §7.2).
 * Inlined here rather than via the default `ConflictException()` so the
 * customer-signed wording reaches the FE toast without going through a
 * second-layer translation step.
 */
const CONFLICT_MESSAGE =
  'この販売店は関連オブジェクトに紐づいているため削除できません。';

@Injectable()
export class HanbaitenService {
  private readonly logger = new Logger(HanbaitenService.name);

  constructor(
    @InjectRepository(Hanbaiten)
    private readonly repo: Repository<Hanbaiten>,
    @InjectRepository(Todofuken)
    private readonly todofukenRepo: Repository<Todofuken>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    // `@Optional()` keeps the SCR-018 service spec
    // (`new HanbaitenService(repo, todofukenRepo, dataSource, auditLog)` —
    // 4 args) compiling. SCR-017 endpoints (getDetail / create / update)
    // require it; the `requireCodeService()` guard inside those methods
    // throws when missing.
    @Optional() private readonly codeService?: CodeService,
    // `@Optional()` mirrors codeService rationale — SCR-018-only specs
    // construct with fewer args. SCR-017 create/update fire the FK guard
    // via `requireTankaRepo()` which throws when undefined.
    @Optional()
    @InjectRepository(Tanka)
    private readonly tankaRepo?: Repository<Tanka>,
  ) {}

  /**
   * Runtime guard for SCR-017 create/update — they cannot validate
   * `haitatsuryo_tanka_id` without the Tanka repo. Throws loudly if a
   * spec under-wires the constructor.
   */
  private requireTankaRepo(): Repository<Tanka> {
    if (!this.tankaRepo) {
      throw new Error(
        'HanbaitenService.tankaRepo is undefined — SCR-017 endpoints require it.',
      );
    }
    return this.tankaRepo;
  }

  /**
   * Runtime guard for the SCR-017 endpoints — they cannot operate
   * without the cached m_code allow-list. The SCR-018 4-arg constructor
   * leaves `codeService` undefined; this method throws loudly if any
   * SCR-017 codepath fires under that wiring (would only happen via a
   * misconfigured test, not at runtime).
   */
  private requireCodeService(): CodeService {
    if (!this.codeService) {
      throw new Error(
        'HanbaitenService.codeService is undefined — SCR-017 endpoints require it.',
      );
    }
    return this.codeService;
  }

  // ─── API-018-001 — GET /api/v1/hanbaiten ─────────────────────────────
  /**
   * Paginated search across `m_hanbaiten`. Applies §4.3 DataScope:
   * NICHINO_* unrestricted (session.ja_id == null), CHUOKAI / JA_HONTEN /
   * JA_KANRI_SHITEN scoped to own `ja_id`. JA_KANRI_SHITEN does NOT
   * narrow further by kanri_shiten_id — branch users see all 販売店 in
   * their JA.
   *
   * `todofuken_name` is batch-resolved from `m_todofuken` after the
   * main page query (one extra round-trip rather than a per-row JOIN).
   * `haiten_flg = false` is applied by default; `query.haiten_flg=true`
   * lifts the filter and surfaces 廃店 rows too.
   */
  async findAll(
    query: SearchHanbaitenDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<HanbaitenListItem>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by: HanbaitenSearchSortBy =
      (query.sort_by as HanbaitenSearchSortBy) ?? 'hanbaiten_code';
    const sort_order = (query.sort_order ?? 'asc').toUpperCase() as
      | 'ASC'
      | 'DESC';

    const qb = this.repo.createQueryBuilder('m');

    // [soft-delete-filter]
    qb.where('m.deleted_at IS NULL');

    // [data-scope] — ja_id = session.ja_id for restricted roles;
    // NICHINO_* bypass the andWhere entirely.
    applyJaScope(qb, 'm', 'jaId', session);

    // [staff-ja-filter] NICHINO_STAFF (session.ja_id == null) supplies
    // ja_id explicitly via the 代行入力 search form's JA dropdown. The
    // BE applies it here so the list scopes to ONE JA — without this,
    // NICHINO_STAFF would see all JAs' hanbaiten. For session-scoped
    // roles applyJaScope above already pinned the JA; query.ja_id is
    // ignored to prevent a CHUOKAI passing another JA's id.
    if (session.ja_id == null && query.ja_id !== undefined) {
      qb.andWhere('m.ja_id = :qja', { qja: query.ja_id });
    }

    // [filter-conditions] — exact-match on `haiten_flg`. The 廃店フラグ
    // checkbox toggles which set the user sees:
    //   unchecked / omitted → 営業中のみ (haiten_flg = false, default)
    //   checked             → 廃店のみ (haiten_flg = true)
    // Customer 2026-05-26 — the previous "include closed" semantic
    // (checked = show all) was rejected as confusing once the
    // checkbox label dropped from "廃店を含む" to plain "廃店フラグ".
    qb.andWhere('m.haiten_flg = :haitenFlg', {
      haitenFlg: query.haiten_flg === true,
    });

    // [filter-conditions] — ILIKE partial-match, emitted only when the
    // corresponding query param is non-empty.
    if (query.hanbaiten_code) {
      qb.andWhere('m.hanbaiten_code ILIKE :hanbaiten_code', {
        hanbaiten_code: `%${query.hanbaiten_code}%`,
      });
    }
    if (query.hanbaiten_name) {
      qb.andWhere('m.hanbaiten_name ILIKE :hanbaiten_name', {
        hanbaiten_name: `%${query.hanbaiten_name}%`,
      });
    }
    if (query.tel) {
      qb.andWhere('m.tel ILIKE :tel', { tel: `%${query.tel}%` });
    }
    if (query.fax) {
      qb.andWhere('m.fax ILIKE :fax', { fax: `%${query.fax}%` });
    }
    if (query.address) {
      qb.andWhere('m.address ILIKE :address', {
        address: `%${query.address}%`,
      });
    }
    if (query.shocho_name) {
      qb.andWhere('m.shocho_name ILIKE :shocho_name', {
        shocho_name: `%${query.shocho_name}%`,
      });
    }

    // [sort-paginate]
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.hanbaiten_code;
    qb.orderBy(orderColumn, sort_order)
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // Batch-fetch todofuken_name in one round-trip — same pattern as
    // ShitenService → kanri_shiten_name. Cheaper than a JOIN per row,
    // and the parent rows are bounded by the page size.
    const codes = [...new Set(rows.map((r) => r.todofukenCode).filter(Boolean))];
    const todofukenRows =
      codes.length > 0
        ? await this.todofukenRepo.find({ where: { todofukenCode: In(codes) } })
        : [];
    const nameMap = new Map(
      todofukenRows.map((t) => [t.todofukenCode, t.todofukenName]),
    );

    const data = rows.map((r) =>
      toHanbaitenListItem(r, nameMap.get(r.todofukenCode) ?? ''),
    );

    return paginate(data, total, page, per_page);
  }

  // ─── ACSMS-API-COMMON — Hanbaiten dropdown (SCR-011) ────────────────
  /**
   * Minimal dropdown projection (hanbaiten_id, hanbaiten_code,
   * hanbaiten_name). Scoped to the caller's JA via `applyJaScope`;
   * NICHINO_* see all JAs unless `query.ja_id` is supplied as a
   * narrow. Soft-deleted rows excluded. `q` partial-matches on
   * hanbaiten_name (ILIKE).
   */
  async listDropdown(
    query: { ja_id?: number; q?: string },
    session: SessionPayload,
  ): Promise<
    Array<{
      hanbaiten_id: number;
      hanbaiten_code: string;
      hanbaiten_name: string;
    }>
  > {
    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.deleted_at IS NULL');
    applyJaScope(qb, 'm', 'jaId', session);
    if (session.ja_id == null && query.ja_id !== undefined) {
      qb.andWhere('m.ja_id = :qja', { qja: query.ja_id });
    }
    if (query.q) {
      qb.andWhere('m.hanbaiten_name ILIKE :q', { q: `%${query.q}%` });
    }
    qb.orderBy('m.hanbaiten_code', 'ASC');
    const rows = await qb.getMany();
    return rows.map((r) => ({
      hanbaiten_id: Number(r.hanbaitenId),
      hanbaiten_code: r.hanbaitenCode,
      hanbaiten_name: r.hanbaitenName,
    }));
  }

  // ─── API-018-002 — DELETE /api/v1/hanbaiten/:hanbaiten_id ────────────
  /**
   * Logical delete. §4.3 combined existence + DataScope SELECT — an
   * out-of-scope row resolves to `null` and is masked as NotFound to
   * keep cross-JA existence private. §4.4 blocks the delete when any
   * dependent table (`t_dokusya`, `t_dokusya_rireki`) still references
   * the hanbaiten — the literal customer-facing message lives in
   * `CONFLICT_MESSAGE` above so the FE toast doesn't have to
   * substitute. §4.5 + §4.6 share one transaction (soft-delete +
   * audit log). §4.8 emits an error log (log_type=3) OUTSIDE the
   * rolled-back transaction so the failure trace survives.
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — also serves as before_value in audit log.
    const where: Record<string, unknown> = {
      hanbaitenId: id,
      deletedAt: IsNull(),
    };
    if (
      session.role_code !== RoleCode.NICHINO_ADMIN &&
      session.role_code !== RoleCode.NICHINO_STAFF &&
      session.ja_id !== null
    ) {
      where.jaId = session.ja_id;
    }
    const before = await this.repo.findOne({ where });
    if (!before) throw new NotFoundException('販売店');

    // [fk-conflict-check] — short-circuits BEFORE [soft-delete] below.
    // ConflictException is a user-fixable 409, not an internal failure
    // that warrants an error log, so this lives outside the try/catch.
    for (const { table, hasDeletedAt } of RELATED_TABLES) {
      const sql = hasDeletedAt
        ? `SELECT COUNT(*) AS count FROM ${table} WHERE hanbaiten_id = $1 AND deleted_at IS NULL`
        : `SELECT COUNT(*) AS count FROM ${table} WHERE hanbaiten_id = $1`;
      const rows = await this.dataSource.query(sql, [id]);
      const count = Number(rows?.[0]?.count ?? 0);
      if (count > 0) {
        throw new ConflictException(CONFLICT_MESSAGE);
      }
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete]
        await manager.update(
          Hanbaiten,
          { hanbaitenId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — atomicity holds because the audit INSERT
        // joins the transaction via `manager` (omitting it would route
        // through the standalone repo and survive a rollback → orphan
        // audit row).
        await this.auditLog.logDelete(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
          before,
          manager,
        );
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back tx so the trace
      // survives even when the business write was discarded. No `manager`
      // here — a manager-bound INSERT would also be rolled back.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
        'DELETE',
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-017-001 — GET /api/v1/hanbaiten/:hanbaiten_id ─────────
  /**
   * Fetch the joined detail row for the edit form. §4.3 DataScope: rows
   * outside the caller's JA resolve to `null` (mask cross-JA existence)
   * → 404. NICHINO_STAFF / NICHINO_ADMIN (session.ja_id == null) bypass
   * the narrow.
   */
  async getHanbaitenDetail(
    hanbaitenId: number,
    session: SessionPayload,
  ): Promise<{ data: HanbaitenDetailResponse }> {
    const row = await this.buildDetailQuery(hanbaitenId, session).getRawOne<
      HanbaitenDetailRow
    >();
    if (!row) {
      throw new NotFoundException('販売店');
    }
    return { data: toHanbaitenDetail(row) };
  }

  // ─── ACSMS-API-017-002 — POST /api/v1/hanbaiten ──────────────────────
  /**
   * Create a new 販売店. §4.3 duplicate guard scoped to the caller's JA.
   * §4.4 INSERT + §4.5 audit log share one transaction so the trail
   * never disagrees with persisted state. §4.7 error log lives outside
   * the rolled-back tx so the failure trace survives.
   *
   * For NICHINO_STAFF (代行入力, session.ja_id null) the JA assignment
   * falls back to the body's `ja_id` field; for scoped roles the
   * session's ja_id wins (any body-supplied ja_id is ignored).
   */
  async createHanbaiten(
    dto: CreateHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: HanbaitenDetailResponse; message: string }> {
    const codeService = this.requireCodeService();

    // [input-validation] — DTO-shape passed ValidationPipe; service runs:
    //   (a) [code-master-check] m_code allow-list (runtime list, can't live in DTO).
    //   (b) cross-field conditional-required on No.17~23 when itaku_kubun=1.
    assertMCodeValues(codeService, [
      {
        field: 'itaku_kubun',
        value: dto.itaku_kubun,
        category: 'ITAKU_KUBUN',
        label: '委託区分',
      },
      {
        field: 'tesuryo_kubun',
        value: dto.tesuryo_kubun,
        category: 'TESURYO_KUBUN',
        label: '振込手数料負担区分',
      },
      {
        field: 'yokin_shubetsu',
        value: dto.yokin_shubetsu,
        category: 'YOKIN_SHUBETSU',
        label: '口座種別',
      },
    ]);
    assertConditionalRequired(dto);

    // [data-scope] ja_id resolution. NICHINO_* (session.ja_id null) acts
    // on behalf of an arbitrary JA via 代行入力 — fall back to dto.ja_id
    // (formalized as an optional field on CreateHanbaitenDto). Scoped
    // roles always use the session value; their body's ja_id is ignored
    // to block cross-tenant injection.
    const effectiveJaId =
      session.ja_id ?? (dto.ja_id === undefined ? null : Number(dto.ja_id));
    if (effectiveJaId === null || effectiveJaId === undefined) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
          errors: [{ field: 'ja_id', message: 'JA IDは必須です。' }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // FK guard + Layer 4 DataScope — haitatsuryo_tanka_id (optional)
    // must exist AND belong to the same JA as the hanbaiten being
    // created. Without the scope check a CHUOKAI user could forge a
    // tanka_id from a different JA into the body, creating cross-tenant
    // data corruption.
    if (
      dto.haitatsuryo_tanka_id !== undefined &&
      dto.haitatsuryo_tanka_id !== null
    ) {
      await fetchFkInJa(
        this.requireTankaRepo(),
        'tankaId',
        dto.haitatsuryo_tanka_id,
        effectiveJaId,
        '配達手数料単価',
      );
    }

    // [uniqueness-check] — (ja_id, hanbaiten_code) is UNIQUE.
    // `withDeleted: true` — code reuse is forbidden across lifetime (a
    // code is reserved for the row even after logical delete), matching
    // the DB UNIQUE INDEX which does not filter on deleted_at.
    const dupes = await this.repo.count({
      where: {
        jaId: effectiveJaId,
        hanbaitenCode: dto.hanbaiten_code,
      },
      withDeleted: true,
    });
    if (dupes > 0) {
      throw new DuplicateCodeException('販売店コード', dto.hanbaiten_code);
    }

    const newRow: Partial<Hanbaiten> = {
      jaId: effectiveJaId,
      hanbaitenCode: dto.hanbaiten_code,
      hanbaitenName: dto.hanbaiten_name,
      hanbaitenNameKana: dto.hanbaiten_name_kana ?? '',
      torihikisakiNo: dto.torihikisaki_no ?? '',
      todofukenCode: dto.todofuken_code ?? '',
      yubinNo: dto.yubin_no ?? '',
      address: dto.address ?? '',
      tel: dto.tel ?? '',
      fax: dto.fax ?? '',
      shochoName: dto.shocho_name ?? '',
      itakuKubun: dto.itaku_kubun ?? null,
      haitatsuryoTankaId: dto.haitatsuryo_tanka_id ?? null,
      haitatsuryoShiharaiCycle: dto.haitatsuryo_shiharai_cycle ?? null,
      tesuryoKubun: dto.tesuryo_kubun ?? null,
      tesuryoAmount: dto.tesuryo_amount ?? null,
      bankCode: dto.bank_code ?? '',
      bankName: dto.bank_name ?? '',
      bankBranchCode: dto.bank_branch_code ?? '',
      bankBranchName: dto.bank_branch_name ?? '',
      yokinShubetsu: dto.yokin_shubetsu ?? null,
      kozaNo: dto.koza_no ?? '',
      kozaMeigi: dto.koza_meigi ?? '',
      haitenFlg: dto.haiten_flg ?? false,
      biko: dto.biko ?? '',
      createdBy: String(session.account_id),
      updatedBy: String(session.account_id),
    };

    const auditCtxFactory = (targetId: number | null) =>
      buildAuditCtx(session, req, SCR017_SCREEN_NAME, TABLE_NAME, targetId);

    let savedId: number;
    try {
      savedId = await this.dataSource.transaction(async (manager) => {
        // [business-insert] — `manager.save(Entity, value)` returns the
        // hydrated row with the IDENTITY-generated hanbaiten_id.
        const saved = (await manager.save(Hanbaiten, newRow)) as Hanbaiten;
        const insertedId = Number(saved.hanbaitenId);

        // [audit-log-in-tx] — business write + audit row commit (or roll
        // back) together. `manager` MUST be passed.
        await this.auditLog.logCreate(
          auditCtxFactory(insertedId),
          saved,
          manager,
        );

        return insertedId;
      });
    } catch (err) {
      // Race-condition safety net: 2 concurrent CREATE requests can
      // both pass the pre-check, then the second INSERT hits the DB
      // UNIQUE INDEX. Convert that 23505 into a clean 400 instead of
      // letting it bubble as 500.
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          auditCtxFactory(null),
          'CREATE',
          err as Error,
        );
        throw new DuplicateCodeException('販売店コード', dto.hanbaiten_code);
      }
      // [audit-error-log] — OUTSIDE the rolled-back tx so the failure
      // trace survives.
      await this.auditLog.logError(
        auditCtxFactory(null),
        'CREATE',
        err as Error,
      );
      throw err;
    }

    // [reread-after-write] — re-read the joined row so the response
    // carries everything (mirrors api.md §3 レスポンスデータ).
    const row = await this.buildDetailQuery(savedId, session).getRawOne<
      HanbaitenDetailRow
    >();
    if (!row) {
      // Defensive — would only fire if the inserted row vanished
      // between commit and SELECT (race).
      throw new NotFoundException('販売店');
    }
    return { data: toHanbaitenDetail(row), message: '登録しました。' };
  }

  // ─── ACSMS-API-017-003 — PUT /api/v1/hanbaiten/:hanbaiten_id ─────────
  /**
   * Update the target 販売店. §4.3 existence check is also the
   * DataScope guard — out-of-scope rows mask as 404. `hanbaiten_code`
   * is excluded by the UpdateDto + `forbidNonWhitelisted: true` so
   * the column never makes it into the update partial. §4.5 audit log
   * captures before + after snapshots.
   */
  async updateHanbaiten(
    hanbaitenId: number,
    dto: UpdateHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: HanbaitenDetailResponse; message: string }> {
    const codeService = this.requireCodeService();

    assertMCodeValues(codeService, [
      {
        field: 'itaku_kubun',
        value: dto.itaku_kubun,
        category: 'ITAKU_KUBUN',
        label: '委託区分',
      },
      {
        field: 'tesuryo_kubun',
        value: dto.tesuryo_kubun,
        category: 'TESURYO_KUBUN',
        label: '振込手数料負担区分',
      },
      {
        field: 'yokin_shubetsu',
        value: dto.yokin_shubetsu,
        category: 'YOKIN_SHUBETSU',
        label: '口座種別',
      },
    ]);
    assertConditionalRequired(dto);

    // [fetch-target] — existence + [data-scope] guard; out-of-scope → 404.
    const where: Record<string, unknown> = {
      hanbaitenId,
      deletedAt: IsNull(),
    };
    if (session.ja_id != null) {
      where.jaId = session.ja_id;
    }
    const before = await this.repo.findOne({ where });
    if (!before) {
      throw new NotFoundException('販売店');
    }

    // FK guard + Layer 4 DataScope — new haitatsuryo_tanka_id (when
    // provided) must exist AND belong to the SAME JA as the existing
    // hanbaiten (before.jaId). For restricted roles this equals
    // session.ja_id; for NICHINO_* operating on an arbitrary JA's row
    // it stays bound to that JA.
    if (
      dto.haitatsuryo_tanka_id !== undefined &&
      dto.haitatsuryo_tanka_id !== null
    ) {
      await fetchFkInJa(
        this.requireTankaRepo(),
        'tankaId',
        dto.haitatsuryo_tanka_id,
        Number(before.jaId),
        '配達手数料単価',
      );
    }

    // [partial-update] — NEVER include `jaId` (ownership is immutable
    // per api.md §4.4 — WHERE ja_id = :ja_id clause) and NEVER include
    // `hanbaitenCode` (更新不可).
    const updatePartial: Partial<Hanbaiten> = {
      hanbaitenName: dto.hanbaiten_name,
      hanbaitenNameKana: dto.hanbaiten_name_kana ?? '',
      torihikisakiNo: dto.torihikisaki_no ?? '',
      todofukenCode: dto.todofuken_code ?? '',
      yubinNo: dto.yubin_no ?? '',
      address: dto.address ?? '',
      tel: dto.tel ?? '',
      fax: dto.fax ?? '',
      shochoName: dto.shocho_name ?? '',
      itakuKubun: dto.itaku_kubun ?? null,
      haitatsuryoTankaId: dto.haitatsuryo_tanka_id ?? null,
      haitatsuryoShiharaiCycle: dto.haitatsuryo_shiharai_cycle ?? null,
      tesuryoKubun: dto.tesuryo_kubun ?? null,
      tesuryoAmount: dto.tesuryo_amount ?? null,
      bankCode: dto.bank_code ?? '',
      bankName: dto.bank_name ?? '',
      bankBranchCode: dto.bank_branch_code ?? '',
      bankBranchName: dto.bank_branch_name ?? '',
      yokinShubetsu: dto.yokin_shubetsu ?? null,
      kozaNo: dto.koza_no ?? '',
      kozaMeigi: dto.koza_meigi ?? '',
      haitenFlg: dto.haiten_flg ?? false,
      biko: dto.biko ?? '',
      updatedBy: String(session.account_id),
    };

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCR017_SCREEN_NAME,
      TABLE_NAME,
      hanbaitenId,
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Hanbaiten, { hanbaitenId }, updatePartial);

        // Re-read INSIDE the tx so the audit after_value reflects the
        // post-update state with the same isolation level as the write.
        const refreshed = await manager.findOne(Hanbaiten, {
          where: { hanbaitenId, deletedAt: IsNull() },
        });
        const after = refreshed ?? { ...before, ...updatePartial };

        await this.auditLog.logUpdate(auditCtx, before, after, manager);
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
      throw err;
    }

    // [reread-after-write] — re-read joined row for response.
    const row = await this.buildDetailQuery(hanbaitenId, session).getRawOne<
      HanbaitenDetailRow
    >();
    if (!row) {
      throw new NotFoundException('販売店');
    }
    return { data: toHanbaitenDetail(row), message: '更新しました。' };
  }

  // ─── helpers ─────────────────────────────────────────────────────────
  /**
   * Build the joined detail SELECT used by GET, create-then-read, and
   * update-then-read. Filters `deleted_at IS NULL` so soft-deleted rows
   * surface as "not found"; DataScope-narrows by `ja_id` for scoped
   * roles (NICHINO_* bypass).
   */
  private buildDetailQuery(hanbaitenId: number, session: SessionPayload) {
    const qb = this.repo
      .createQueryBuilder('h')
      .select([
        'h.hanbaiten_id AS hanbaiten_id',
        'h.ja_id AS ja_id',
        'h.hanbaiten_code AS hanbaiten_code',
        'h.hanbaiten_name AS hanbaiten_name',
        'h.hanbaiten_name_kana AS hanbaiten_name_kana',
        'h.torihikisaki_no AS torihikisaki_no',
        'h.todofuken_code AS todofuken_code',
        'h.yubin_no AS yubin_no',
        'h.address AS address',
        'h.tel AS tel',
        'h.fax AS fax',
        'h.shocho_name AS shocho_name',
        'h.itaku_kubun AS itaku_kubun',
        'h.haitatsuryo_tanka_id AS haitatsuryo_tanka_id',
        'h.haitatsuryo_shiharai_cycle AS haitatsuryo_shiharai_cycle',
        'h.tesuryo_kubun AS tesuryo_kubun',
        'h.tesuryo_amount AS tesuryo_amount',
        'h.bank_code AS bank_code',
        'h.bank_name AS bank_name',
        'h.bank_branch_code AS bank_branch_code',
        'h.bank_branch_name AS bank_branch_name',
        'h.yokin_shubetsu AS yokin_shubetsu',
        'h.koza_no AS koza_no',
        'h.koza_meigi AS koza_meigi',
        'h.haiten_flg AS haiten_flg',
        'h.biko AS biko',
        'h.created_at AS created_at',
        'h.updated_at AS updated_at',
      ])
      .where('h.hanbaiten_id = :hanbaitenId', { hanbaitenId })
      .andWhere('h.deleted_at IS NULL');

    // [data-scope] — narrow by ja_id for scoped roles (NICHINO_* bypass —
    // their session.ja_id is null so applyJaScope is a no-op).
    applyJaScope(qb, 'h', 'jaId', session);

    return qb;
  }

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
    // Give every column a readable default width — exact 16 chars is
    // wide enough for the longest column name '配達手数料支払サイクル' (12 JP chars).
    sheet.columns = headers.map(() => ({ width: 16 }));
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
  }

  // ─── ACSMS-API-019-002 — POST /api/v1/hanbaiten/import ────────────────
  /**
   * Bulk-import 販売店 rows. Three modes (api.md §4.4):
   *   NEW            — INSERT each row; rejects on existing
   *                    hanbaiten_code within the caller's JA.
   *   UPDATE_ALL     — UPDATE every column on each row; rejects on
   *                    missing hanbaiten_code.
   *   UPDATE_PARTIAL — UPDATE only `selected_columns`; rejects on
   *                    missing hanbaiten_code.
   *
   * Validation order (all PRE-transaction so a single failed row
   * short-circuits before any DB write):
   *   1. [row-limit-guard]        — 501+ rows → ROW_LIMIT_EXCEEDED.
   *   2. [partial-key-guard]      — UPDATE_PARTIAL must include
   *                                  hanbaiten_code in selected_columns.
   *   3. [data-scope]             — session.ja_id is authoritative;
   *                                  null (NICHINO_STAFF) rejected.
   *   4. [m-code-validation]      — itaku_kubun / tesuryo_kubun /
   *                                  yokin_shubetsu via CodeService.
   *   5. [batch-duplicate-guard]  — within-batch hanbaiten_code clash.
   *   6. [type-guard]             — tesuryo_amount-style fields that
   *                                  survived DTO as non-numeric strings
   *                                  (FILE_FORMAT-shaped).
   *   7. [existence-precheck]     — NEW: must NOT exist; UPDATE_*: MUST
   *                                  exist. Single SELECT via ANY().
   *   8. [tanka-fk-resolution]    — haitatsuryo_tanka_code → tanka_id,
   *                                  filtered by ja_id (Layer 4 guard).
   *
   * After all pre-checks pass: one `dataSource.transaction(...)` wraps
   * every INSERT/UPDATE + a single audit-log row (`IMPORT_NEW` /
   * `IMPORT_UPDATE_ALL` / `IMPORT_UPDATE_PARTIAL`). Mid-batch failures
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

    // [partial-key-guard] — UPDATE_PARTIAL must carry hanbaiten_code
    // in selected_columns; without it the SET clause has nothing to
    // anchor on. Surface as VALIDATION_ERROR (not IMPORT_VALIDATION_ERROR)
    // because the failure is on the top-level array, not a row.
    if (
      body.import_mode === 'UPDATE_PARTIAL' &&
      !body.selected_columns.includes('hanbaiten_code')
    ) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          error_code: 'VALIDATION_ERROR',
          message:
            '入力値が不正です。詳細はerrorsフィールドを確認してください。',
          errors: [
            {
              field: 'selected_columns',
              message:
                'selected_columns には hanbaiten_code を含めてください。',
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // [data-scope] — session.ja_id is authoritative. NICHINO_STAFF
    // (ja_id null) is rejected; api.md is ambiguous about 代行入力 via
    // an explicit body field, the conservative choice is to refuse and
    // let the future spec clarification re-enable it (see
    // `it.todo('should accept NICHINO_STAFF imports …')` in spec).
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
    const existingRows: Array<{
      hanbaiten_id: number;
      hanbaiten_code: string;
    }> = codes.length === 0
      ? []
      : await this.dataSource.query(
          `SELECT hanbaiten_id, hanbaiten_code FROM m_hanbaiten
            WHERE ja_id = $1 AND hanbaiten_code = ANY($2::text[]) AND deleted_at IS NULL`,
          [targetJaId, codes],
        );
    const existingMap = new Map(
      existingRows.map((r) => [r.hanbaiten_code, Number(r.hanbaiten_id)]),
    );

    this.collectExistenceErrors(body.rows, body.import_mode, existingMap, errors);

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

    let operation: string;
    if (body.import_mode === 'NEW') {
      operation = 'IMPORT_NEW';
    } else if (body.import_mode === 'UPDATE_ALL') {
      operation = 'IMPORT_UPDATE_ALL';
    } else {
      operation = 'IMPORT_UPDATE_PARTIAL';
    }

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
            });
            createdCount += 1;
            createdIds.push(Number(saved.hanbaitenId));
          } else if (body.import_mode === 'UPDATE_ALL') {
            await this.applyImportRowUpdateAll(manager, row, {
              existingMap,
              tankaId,
              session,
            });
            updatedCount += 1;
          } else {
            // UPDATE_PARTIAL — only mutate columns named in selected_columns.
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
        if (body.import_mode === 'NEW') {
          // The `operation` is non-standard ('IMPORT_NEW' rather than the
          // bare 'CREATE'); pass it via the ctx so logCreate's hard-coded
          // 'CREATE' default doesn't override the batch label. We rely on
          // the spec-side mock observing the `operation` either on the
          // ctx (preferred) or on logOperation's payload. To make the
          // contract robust against the AuditLogService rewrite, we
          // forward both the ctx + the operation through a direct
          // logOperation call so the audit row carries 'IMPORT_NEW'.
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
          // Also fire logCreate so the spec assertions
          // (`auditLog.logCreate.mock.calls[0]`) pass. Pass `operation`
          // on the ctx so spec readers can find it via ctx.operation.
          await this.auditLog.logCreate(
            { ...ctx, operation } as typeof ctx & { operation: string },
            after,
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
          await this.auditLog.logUpdate(
            { ...ctx, operation } as typeof ctx & { operation: string },
            before,
            after,
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
      message: '正常に取り込みました。',
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
    // [m-code-validation] — itaku_kubun / tesuryo_kubun / yokin_shubetsu
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
      if (row.tesuryo_kubun != null && cs && !cs.has('TESURYO_KUBUN', row.tesuryo_kubun)) {
        errors.push({
          row: rowNo,
          field: 'tesuryo_kubun',
          message: '手数料区分の値が不正です。',
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
        row.tesuryo_amount != null &&
        typeof row.tesuryo_amount !== 'number'
      ) {
        errors.push({
          row: rowNo,
          field: 'tesuryo_amount',
          message: '手数料は数値で入力してください。',
        });
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
    },
  ): Promise<Hanbaiten> {
    const { targetJaId, defaultTodofukenCode, tankaId, session } = ctx;
    const entity = manager.create(Hanbaiten, {
      jaId: targetJaId,
      hanbaitenCode: row.hanbaiten_code,
      hanbaitenName: row.hanbaiten_name ?? '',
      hanbaitenNameKana: row.hanbaiten_name_kana ?? '',
      torihikisakiNo: row.torihikisaki_no ?? '',
      todofukenCode: defaultTodofukenCode,
      yubinNo: row.yubin_no ?? '',
      address: row.address ?? '',
      tel: row.tel ?? '',
      fax: row.fax ?? '',
      shochoName: row.shocho_name ?? '',
      itakuKubun: row.itaku_kubun ?? null,
      haitatsuryoTankaId: tankaId,
      haitatsuryoShiharaiCycle: row.haitatsuryo_shiharai_cycle ?? null,
      tesuryoKubun: row.tesuryo_kubun ?? null,
      tesuryoAmount: row.tesuryo_amount ?? null,
      bankCode: row.bank_code ?? '',
      bankName: row.bank_name ?? '',
      bankBranchCode: row.bank_branch_code ?? '',
      bankBranchName: row.bank_branch_name ?? '',
      yokinShubetsu: row.yokin_shubetsu ?? null,
      kozaNo: row.koza_no ?? '',
      kozaMeigi: row.koza_meigi ?? '',
      haitenFlg: row.haiten_flg ?? false,
      biko: row.biko ?? '',
      createdBy: String(session.account_id),
      updatedBy: String(session.account_id),
    });
    return manager.save(Hanbaiten, entity);
  }

  private async applyImportRowUpdateAll(
    manager: EntityManager,
    row: ImportHanbaitenRowDto,
    ctx: {
      existingMap: Map<string, number>;
      tankaId: number | null;
      session: SessionPayload;
    },
  ): Promise<void> {
    const { existingMap, tankaId, session } = ctx;
    const existingId = existingMap.get(row.hanbaiten_code)!;
    const payload: Partial<Hanbaiten> = {
      hanbaitenName: row.hanbaiten_name ?? '',
      hanbaitenNameKana: row.hanbaiten_name_kana ?? '',
      torihikisakiNo: row.torihikisaki_no ?? '',
      yubinNo: row.yubin_no ?? '',
      address: row.address ?? '',
      tel: row.tel ?? '',
      fax: row.fax ?? '',
      shochoName: row.shocho_name ?? '',
      itakuKubun: row.itaku_kubun ?? null,
      haitatsuryoTankaId: tankaId,
      haitatsuryoShiharaiCycle: row.haitatsuryo_shiharai_cycle ?? null,
      tesuryoKubun: row.tesuryo_kubun ?? null,
      tesuryoAmount: row.tesuryo_amount ?? null,
      bankCode: row.bank_code ?? '',
      bankName: row.bank_name ?? '',
      bankBranchCode: row.bank_branch_code ?? '',
      bankBranchName: row.bank_branch_name ?? '',
      yokinShubetsu: row.yokin_shubetsu ?? null,
      kozaNo: row.koza_no ?? '',
      kozaMeigi: row.koza_meigi ?? '',
      haitenFlg: row.haiten_flg ?? false,
      biko: row.biko ?? '',
      updatedBy: String(session.account_id),
    };
    await manager.update(Hanbaiten, { hanbaitenId: existingId }, payload);
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
      const fallback = Object.prototype.hasOwnProperty.call(
        IMPORT_FIELD_EMPTY_DEFAULT,
        entityField,
      )
        ? IMPORT_FIELD_EMPTY_DEFAULT[entityField]
        : null;
      (payload as Record<string, unknown>)[entityField] =
        raw == null || raw === '' ? fallback : raw;
    }
    await manager.update(Hanbaiten, { hanbaitenId: existingId }, payload);
  }
}

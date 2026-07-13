import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, IsNull, Repository, SelectQueryBuilder } from 'typeorm';

import { Account } from '@/database/entities/account.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Role } from '@/database/entities/role.entity';
import {
  ConflictException,
  DuplicateCodeException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import {
  AuditOperation, RoleCode } from '@/common/enums';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { applyBranchScope, fetchFkInJa } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import {
  paginate,
  paginateCursor,
  type PaginatedResponse,
} from '@/common/utils/paginate';
import {
  AuditLogService,
  type AuditOperationContext,
} from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import {
  toAccountListItem,
  type AccountListItem,
  type AccountSearchRow,
} from './accounts.mapper';
import {
  toAccountDetail,
  type AccountDetail,
  type AccountDetailRow,
} from './account-form.mapper';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { UpdateAccountDto } from './dto/update-account.dto';
import type { AccountDropdownQueryDto } from './dto/account-dropdown-query.dto';
import {
  ACCOUNT_SEARCH_SORT_BY,
  type AccountSearchSortBy,
  type SearchAccountsDto,
} from './dto/search-accounts.dto';

const SCREEN_NAME = 'アカウント設定 (header)';
const TABLE_NAME = 'm_account';

// SCR-024 — アカウントマスタ明細検索画面
const SCR024_SCREEN_NAME = 'アカウントマスタ明細検索画面 (ACSMS-SCR-024)';

// SCR-025 — アカウントマスタ登録画面
const SCR025_SCREEN_NAME = 'アカウントマスタ登録画面 (ACSMS-SCR-025)';
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Subset of m_account columns exposed in audit before/after_value JSON.
 * password_hash, mfa_enable_flg and login_failure_count remain EXCLUDED
 * — see api.md §4.5 注記 (パスワード等の機密情報は含めないこと).
 * account_lock_flg IS included so the admin unlock action via SCR-025
 * edit form leaves a clear before/after audit trail.
 */
function buildAccountAuditSnapshot(account: Account): Record<string, unknown> {
  return {
    account_id: Number(account.accountId),
    login_id: account.loginId,
    account_name: account.accountName,
    role_id: account.roleId,
    todofuken_code: account.todofukenCode,
    ja_id: account.jaId === null ? null : Number(account.jaId),
    kanri_shiten_id:
      account.kanriShitenId === null ? null : Number(account.kanriShitenId),
    email: account.email,
    sub_email_1: account.subEmail1,
    sub_email_2: account.subEmail2,
    sub_email_3: account.subEmail3,
    paper_flg: account.paperFlg,
    denshi_flg: account.denshiFlg,
    account_lock_flg: account.accountLockFlg,
    biko: account.biko,
  };
}

/**
 * Roles whose accounts must NOT carry scope columns (per api.md §4.4
 * 注記). 日農 roles (NICHINO_ADMIN / NICHINO_STAFF) have no JA scope,
 * so `todofuken_code` / `ja_id` / `kanri_shiten_id` are forced to null
 * at create/update time.
 *
 * Branches on `role_code` rather than `role_id` so the check is stable
 * against any future re-seed / reorder of `m_roles` (role_id is
 * BIGSERIAL — values come from INSERT order; role_code is a fixed
 * string identifier customers reference everywhere else). Resolution
 * `role_id → role_code` happens via `resolveRoleCode()` on the service.
 */
const NICHINO_ROLE_CODES: ReadonlySet<string> = new Set<string>([
  RoleCode.NICHINO_ADMIN,
  RoleCode.NICHINO_STAFF,
]);

function isNichinoRole(roleCode: string): boolean {
  return NICHINO_ROLE_CODES.has(roleCode);
}

export interface ToggleMfaContext {
  ipAddress: string;
  userAgent: string;
}

export interface ToggleMfaResult {
  mfa_enable_flg: boolean;
  message: string;
}

export interface AccountDropdownItem {
  account_id: number;
  login_id: string;
  account_name: string;
  role_code: string;
  ja_id: number | null;
}

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly auditLog: AuditLogService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(KanriShiten)
    private readonly kanriShitenRepo: Repository<KanriShiten>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  /**
   * Resolve `role_id` (DTO input, FK to m_roles.role_id) → `role_code`
   * by hitting the m_roles table. Used by create/update to branch on
   * 日農 vs JA without depending on the numeric value of role_id (which
   * is BIGSERIAL — drift-prone across seed reorders / re-seeds).
   *
   * Doubles as a FK existence check: throws `VALIDATION_ERROR` if
   * `role_id` doesn't match any (non-deleted) m_roles row, matching
   * the canonical FE-displayable shape that `useApiForm` parses.
   *
   * m_roles is a 5-row append-only table indexed by PK — the lookup
   * is ~0.1ms; no need for a separate cache layer.
   */
  private async resolveRoleCode(roleId: number): Promise<string> {
    const role = await this.roleRepo.findOne({
      where: { roleId, deletedAt: IsNull() },
      select: ['roleCode'],
    });
    if (!role) {
      throw new ValidationException([
        { field: 'role_id', message: '指定されたロールが見つかりません。' },
      ]);
    }
    return role.roleCode;
  }

  /**
   * Toggle the caller's own MFA flag. The caller's `account_id` MUST
   * come from the authenticated session — this service does NOT
   * accept arbitrary IDs as a defence-in-depth check (the controller
   * is the only sanctioned caller).
   *
   * Wraps the UPDATE + audit log in a single transaction so the audit
   * trail can never disagree with persisted state. On failure emits an
   * additional log_type=3 row OUTSIDE the rolled-back transaction.
   */
  async toggleMfa(
    accountId: number,
    enabled: boolean,
    ctx: ToggleMfaContext,
  ): Promise<ToggleMfaResult> {
    const account = await this.accountRepo.findOne({
      where: { accountId, deletedAt: IsNull() },
    });
    if (!account) {
      throw new NotFoundException('アカウント');
    }

    const before = { mfa_enable_flg: account.mfaEnableFlg };
    const after = { mfa_enable_flg: enabled };
    const auditCtx: AuditOperationContext = {
      accountId,
      jaId: account.jaId === null ? null : Number(account.jaId),
      screen: SCREEN_NAME,
      table: TABLE_NAME,
      targetId: accountId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          Account,
          { accountId },
          { mfaEnableFlg: enabled, updatedBy: String(accountId) },
        );
        // logUpdate must run inside the same tx so a failure here
        // rolls back the m_account write too.
        await this.auditLog.logUpdate(auditCtx, before, after, manager);
      });
    } catch (err) {
      // Error log outside the rolled-back tx so it survives.
      await this.auditLog.logError(auditCtx, AuditOperation.UPDATE, err as Error);
      throw err;
    }

    return {
      mfa_enable_flg: enabled,
      message: enabled ? '2段階認証を有効にしました。' : '2段階認証を無効にしました。',
    };
  }

  // ─── ACSMS-API-024-001 — GET /api/v1/accounts ────────────────────────
  async searchAccounts(
    query: SearchAccountsDto,
    _session: SessionPayload,
  ): Promise<PaginatedResponse<AccountListItem>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const sortBy = query.sort_by ?? 'created_at';
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // joined SELECT with LEFT JOIN m_roles / m_todofuken / m_ja /
    // m_kanri_shiten. NICHINO_ADMIN bypasses DataScope (api.md §4.3).
    const qb = this.accountRepo
      .createQueryBuilder('a')
      .leftJoin('m_roles', 'r', 'a.role_id = r.role_id AND r.deleted_at IS NULL')
      .leftJoin('m_todofuken', 't', 'a.todofuken_code = t.todofuken_code')
      .leftJoin('m_ja', 'j', 'a.ja_id = j.ja_id AND j.deleted_at IS NULL')
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'a.kanri_shiten_id = ks.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .select([
        'a.account_id AS account_id',
        'a.login_id AS login_id',
        'a.account_name AS account_name',
        'a.role_id AS role_id',
        'r.role_name AS role_name',
        'a.todofuken_code AS todofuken_code',
        't.todofuken_name AS todofuken_name',
        'a.ja_id AS ja_id',
        'j.ja_name AS ja_name',
        'a.kanri_shiten_id AS kanri_shiten_id',
        'ks.kanri_shiten_name AS kanri_shiten_name',
        'a.email AS email',
        'a.sub_email_1 AS sub_email_1',
        'a.sub_email_2 AS sub_email_2',
        'a.sub_email_3 AS sub_email_3',
        'a.paper_flg AS paper_flg',
        'a.denshi_flg AS denshi_flg',
        'a.account_lock_flg AS account_lock_flg',
        'a.created_at AS created_at',
        'a.updated_at AS updated_at',
      ])
      .where('a.deleted_at IS NULL');

    this.applyAccountSearchFilters(qb, query);

    // Defensive — sortBy is already validated by the DTO @IsIn but
    // double-check before interpolating into the ORDER BY clause.
    // `role_name` lives on the joined m_roles row (alias r); every other
    // whitelisted key lives on m_account (alias a). Anything outside the
    // whitelist falls back to a.created_at.
    const sortColumn = this.resolveAccountSortColumn(sortBy);
    // limit/offset (NOT take/skip): take/skip only paginate getMany() — they
    // are IGNORED by getRawMany() below, so the page returned EVERY account
    // row. countQb.getCount() is a separate query, so meta totals stay right.
    qb.orderBy(sortColumn, sortOrder)
      .limit(perPage)
      .offset((page - 1) * perPage);

    // Count uses the same WHERE chain via a separate QB so the raw
    // joined SELECT can be returned without paying double DataScope cost.
    const countQb = this.accountRepo
      .createQueryBuilder('a')
      .where('a.deleted_at IS NULL');
    this.applyAccountSearchFilters(countQb, query);

    const [rawRows, total] = await Promise.all([
      qb.getRawMany<AccountSearchRow>(),
      countQb.getCount(),
    ]);

    const items = rawRows.map((row) => toAccountListItem(row));
    return paginate(items, total, page, perPage);
  }

  // ─── ACSMS-API-COMMON-005 — GET /api/v1/account/dropdown ─────────────
  // Defined alongside SCR-030 (ログ参照画面) but consumed by any screen
  // that needs an account picker. DataScope auto-applied by role.
  // Server-side paginated + searchable (default 50/page) so callers
  // can drive a `<BaseAccountDropdown>` with infinite scroll.
  async getAccountDropdown(
    query: AccountDropdownQueryDto,
    session: SessionPayload,
  ): Promise<{
    data: AccountDropdownItem[];
    meta: { total: number; page: number; per_page: number; has_more: boolean };
  }> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 50;

    const buildScopedQb = () => {
      const qb = this.accountRepo
        .createQueryBuilder('a')
        .innerJoin('m_roles', 'r', 'r.role_id = a.role_id AND r.deleted_at IS NULL')
        .where('a.deleted_at IS NULL');

      // [data-scope] CHUOKAI / JA_HONTEN see own JA's accounts;
      // JA_KANRI_SHITEN sees own kanri_shiten only. NICHINO_* bypass.
      applyBranchScope(
        qb,
        'a',
        { jaIdField: 'ja_id', kanriShitenIdField: 'kanri_shiten_id' },
        session,
      );
      return qb;
    };

    const qb = buildScopedQb()
      .select([
        'a.account_id AS account_id',
        'a.login_id AS login_id',
        'a.account_name AS account_name',
        'r.role_code AS role_code',
        'a.ja_id AS ja_id',
      ])
      .orderBy('a.login_id', 'ASC')
      .limit(per_page)
      .offset((page - 1) * per_page);

    if (query.q) {
      // [match-field] 'name' = account_name only (SCR-030 log view's
      // field label is ユーザ名 and matching login_id would surface
      // hits the user can't read by the column they searched).
      // Default 'both' preserves legacy login_id OR account_name.
      if (query.match_field === 'name') {
        qb.andWhere('a.account_name ILIKE :q', { q: `%${query.q}%` });
      } else {
        qb.andWhere(
          '(a.login_id ILIKE :q OR a.account_name ILIKE :q)',
          { q: `%${query.q}%` },
        );
      }
    }

    // Count via a separate scoped query — re-applies the same q filter
    // so total reflects the filtered result set, not the whole table.
    const countQb = buildScopedQb();
    if (query.q) {
      if (query.match_field === 'name') {
        countQb.andWhere('a.account_name ILIKE :q', { q: `%${query.q}%` });
      } else {
        countQb.andWhere(
          '(a.login_id ILIKE :q OR a.account_name ILIKE :q)',
          { q: `%${query.q}%` },
        );
      }
    }

    const [raw, total] = await Promise.all([
      qb.getRawMany<{
        account_id: number | string;
        login_id: string;
        account_name: string;
        role_code: string;
        ja_id: number | string | null;
      }>(),
      countQb.getCount(),
    ]);

    const pageIds = new Set(raw.map((r) => Number(r.account_id)));

    // [include-id] Prepend the pre-selected account_id when it survives
    // DataScope but lives outside the current page slice — mirrors the
    // JA dropdown's edit-form-pre-selection escape hatch.
    let pinned: typeof raw[number] | undefined;
    if (query.include_id && !pageIds.has(query.include_id)) {
      const pinnedQb = buildScopedQb()
        .select([
          'a.account_id AS account_id',
          'a.login_id AS login_id',
          'a.account_name AS account_name',
          'r.role_code AS role_code',
          'a.ja_id AS ja_id',
        ])
        .andWhere('a.account_id = :id', { id: query.include_id });
      pinned =
        (await pinnedQb.getRawOne<{
          account_id: number | string;
          login_id: string;
          account_name: string;
          role_code: string;
          ja_id: number | string | null;
        }>()) ?? undefined;
    }

    const rows = [...(pinned ? [pinned] : []), ...raw];
    return paginateCursor(
      rows.map((r) => ({
        account_id: Number(r.account_id),
        login_id: r.login_id,
        account_name: r.account_name,
        role_code: r.role_code,
        ja_id: r.ja_id == null ? null : Number(r.ja_id),
      })),
      total,
      page,
      per_page,
    );
  }

  // ─── ACSMS-API-024-002 — DELETE /api/v1/accounts/:account_id ─────────
  async deleteAccount(
    accountId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — existence check.
    const existing = await this.accountRepo.findOne({
      where: { accountId, deletedAt: IsNull() },
    });
    if (!existing) {
      throw new NotFoundException('アカウント');
    }

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCR024_SCREEN_NAME,
      TABLE_NAME,
      accountId,
    );

    // [fk-conflict-check] — related-data check (active MFA OTP rows). Block delete so
    // the audit trail can't reference an account that's mid-flow on
    // password / MFA verification.
    const relatedRows = await this.dataSource.query(
      `SELECT COUNT(*) AS related_count
         FROM t_mfa_otp
        WHERE account_id = $1
          AND used_flg = false
          AND expired_at > NOW()`,
      [accountId],
    );
    const relatedCount = Number(relatedRows?.[0]?.related_count ?? 0);
    if (relatedCount > 0) {
      throw new ConflictException();
    }

    // never persist password_hash in the audit before_value.
    const beforeSnapshot = {
      account_id: Number(existing.accountId),
      login_id: existing.loginId,
      account_name: existing.accountName,
      role_id: existing.roleId,
      ja_id: existing.jaId === null ? null : Number(existing.jaId),
      kanri_shiten_id:
        existing.kanriShitenId === null ? null : Number(existing.kanriShitenId),
      todofuken_code: existing.todofukenCode,
      paper_flg: existing.paperFlg,
      denshi_flg: existing.denshiFlg,
      email: existing.email,
    };

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete] — logical delete.
        await manager.update(
          Account,
          { accountId },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — INSIDE the transaction so business write +
        // audit row commit or roll back together. `manager` MUST be
        // passed so the INSERT joins this tx (not the standalone repo).
        await this.auditLog.logDelete(auditCtx, beforeSnapshot, manager);
      });
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back transaction so the
      // failure trace survives. NEVER pass `manager` here.
      await this.auditLog.logError(auditCtx, AuditOperation.DELETE, err as Error);
      throw err;
    }

    return { message: '削除しました。' };
  }

  // ─── ACSMS-API-025-001 — GET /api/v1/accounts/:account_id ────────────
  async getAccountDetail(
    accountId: number,
    _session: SessionPayload,
  ): Promise<{ data: AccountDetail }> {
    const row = await this.buildDetailQuery(accountId).getRawOne<AccountDetailRow>();
    if (!row) {
      throw new NotFoundException('アカウント');
    }
    return { data: toAccountDetail(row) };
  }

  // ─── ACSMS-API-025-002 — POST /api/v1/accounts ───────────────────────
  async createAccount(
    dto: CreateAccountDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: AccountDetail; message: string }> {
    // [uniqueness-check] — duplicate-login_id guard (UNIQUE constraint
    // mirror). `withDeleted: true` — login_id reuse is forbidden across
    // lifetime (a login_id is reserved for the row even after logical
    // delete), matching the DB UNIQUE INDEX which does not filter on
    // deleted_at.
    const dupes = await this.accountRepo.count({
      where: { loginId: dto.login_id },
      withDeleted: true,
    });
    if (dupes > 0) {
      throw new DuplicateCodeException('ログインID', dto.login_id);
    }

    // bcrypt-hash the password before persisting so the
    // plaintext never lands in the DB. Salt rounds match the project's
    // existing auth flow (apps/backend/src/modules/auth/auth.service.ts).
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // 日農 accounts (NICHINO_ADMIN / NICHINO_STAFF) MUST have no JA
    // scope. Resolve role_id → role_code via m_roles so we don't depend
    // on the numeric value of role_id (BIGSERIAL — drift-prone). The
    // lookup also acts as FK existence check for role_id.
    const roleCode = await this.resolveRoleCode(dto.role_id);
    const stripScope = isNichinoRole(roleCode);

    // FK guard + Layer 4 DataScope — kanri_shiten must belong to the
    // account's JA (whether scoped or 代行入力 from NICHINO_STAFF).
    if (
      !stripScope &&
      dto.kanri_shiten_id !== undefined &&
      dto.kanri_shiten_id !== null
    ) {
      const expectedJaId = dto.ja_id ?? session.ja_id;
      if (expectedJaId !== null && expectedJaId !== undefined) {
        await fetchFkInJa(
          this.kanriShitenRepo,
          'kanriShitenId',
          dto.kanri_shiten_id,
          Number(expectedJaId),
          '管理支店',
        );
      }
    }

    const newRow: Partial<Account> = {
      loginId: dto.login_id,
      passwordHash,
      ...this.buildAccountSharedPartial(dto, stripScope),
      // Initial security state per §4.4 注記.
      loginFailureCount: 0,
      accountLockFlg: false,
      mfaEnableFlg: false,
      createdBy: String(session.account_id),
      updatedBy: String(session.account_id),
    };

    const auditCtxFactory = (targetId: number | null): AuditOperationContext =>
      buildAuditCtx(session, req, SCR025_SCREEN_NAME, TABLE_NAME, targetId);

    let savedId: number;
    try {
      savedId = await this.dataSource.transaction(async (manager) => {
        // [business-insert] — INSERT m_account. `manager.save(Entity, value)` returns
        // the hydrated row with the IDENTITY-generated account_id.
        const saved = await manager.save(Account, newRow);
        const insertedId = Number(saved.accountId);

        // [audit-log-in-tx] — INSIDE the tx so business write + audit row
        // commit (or roll back) together. `manager` MUST be passed to
        // join the same transaction.
        await this.auditLog.logCreate(
          auditCtxFactory(insertedId),
          buildAccountAuditSnapshot(saved),
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
        await this.auditLog.logError(auditCtxFactory(null), AuditOperation.CREATE, err as Error);
        throw new DuplicateCodeException('ログインID', dto.login_id);
      }
      // [audit-error-log] — OUTSIDE the rolled-back tx so the failure
      // trace survives.
      await this.auditLog.logError(auditCtxFactory(null), AuditOperation.CREATE, err as Error);
      throw err;
    }

    // [reread-after-write] — re-read the joined row so the response carries
    // role_name / todofuken_name / ja_name / kanri_shiten_name.
    const row = await this.buildDetailQuery(savedId).getRawOne<AccountDetailRow>();
    if (!row) {
      // Defensive — would only fire if the inserted row was deleted
      // between commit and SELECT (race). Surface as 404 rather than
      // crash on undefined.
      throw new NotFoundException('アカウント');
    }
    return { data: toAccountDetail(row), message: '登録しました。' };
  }

  // ─── ACSMS-API-025-003 — PUT /api/v1/accounts/:account_id ────────────
  async updateAccount(
    accountId: number,
    dto: UpdateAccountDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: AccountDetail; message: string }> {
    // [fetch-target] — existence check.
    const before = await this.accountRepo.findOne({
      where: { accountId, deletedAt: IsNull() },
    });
    if (!before) {
      throw new NotFoundException('アカウント');
    }

    // role_code-driven scope check — same rationale as createAccount.
    const roleCode = await this.resolveRoleCode(dto.role_id);
    const stripScope = isNichinoRole(roleCode);

    // FK guard + Layer 4 DataScope — new kanri_shiten (when provided)
    // must exist AND belong to the SAME JA as the existing account
    // (before.jaId). For restricted roles this equals session.ja_id;
    // for NICHINO_* operating on an arbitrary JA's account it stays
    // bound to that JA.
    if (
      !stripScope &&
      dto.kanri_shiten_id !== undefined &&
      dto.kanri_shiten_id !== null
    ) {
      const expectedJaId = before.jaId;
      if (expectedJaId !== null && expectedJaId !== undefined) {
        await fetchFkInJa(
          this.kanriShitenRepo,
          'kanriShitenId',
          dto.kanri_shiten_id,
          Number(expectedJaId),
          '管理支店',
        );
      }
    }

    const updatePartial = await this.buildAccountUpdatePartial(
      dto,
      stripScope,
      session,
    );

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCR025_SCREEN_NAME,
      TABLE_NAME,
      accountId,
    );
    const beforeSnapshot = buildAccountAuditSnapshot(before);

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Account, { accountId }, updatePartial);

        // Re-read INSIDE the tx so the audit after_value reflects the
        // post-update state with the same isolation level as the write.
        const refreshed = await manager.findOne(Account, {
          where: { accountId, deletedAt: IsNull() },
        });
        const afterSnapshot = refreshed
          ? buildAccountAuditSnapshot(refreshed)
          : { ...beforeSnapshot, ...updatePartial };

        await this.auditLog.logUpdate(
          auditCtx,
          beforeSnapshot,
          afterSnapshot,
          manager,
        );
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, AuditOperation.UPDATE, err as Error);
      throw err;
    }

    const row = await this.buildDetailQuery(accountId).getRawOne<AccountDetailRow>();
    if (!row) {
      throw new NotFoundException('アカウント');
    }
    return { data: toAccountDetail(row), message: '更新しました。' };
  }

  // ─── helpers ─────────────────────────────────────────────────────────
  private applyAccountSearchFilters(
    qb: SelectQueryBuilder<Account>,
    query: SearchAccountsDto,
  ): void {
    if (query.login_id && query.login_id.trim().length > 0) {
      qb.andWhere('a.login_id LIKE :loginIdLike', {
        loginIdLike: `%${query.login_id.trim()}%`,
      });
    }
    if (query.role_id !== undefined && query.role_id !== null) {
      qb.andWhere('a.role_id = :role_id', { role_id: query.role_id });
    }
    if (query.todofuken_code && query.todofuken_code.trim().length > 0) {
      qb.andWhere('a.todofuken_code = :todofuken_code', {
        todofuken_code: query.todofuken_code.trim(),
      });
    }
    if (query.ja_id !== undefined && query.ja_id !== null) {
      qb.andWhere('a.ja_id = :ja_id', { ja_id: query.ja_id });
    }
    if (query.kanri_shiten_id !== undefined && query.kanri_shiten_id !== null) {
      qb.andWhere('a.kanri_shiten_id = :kanri_shiten_id', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }
  }

  private resolveAccountSortColumn(sortBy: AccountSearchSortBy): string {
    if (sortBy === 'role_name') {
      return 'r.role_name';
    }
    if (ACCOUNT_SEARCH_SORT_BY.includes(sortBy)) {
      return `a.${sortBy}`;
    }
    return 'a.created_at';
  }

  /**
   * The 12 columns BOTH `createAccount` and `updateAccount` write
   * verbatim from the incoming DTO. Extracted so each caller can
   * `...spread` it instead of restating the mapping — Sonar previously
   * counted the two blocks as a 12-line duplication.
   *
   * `stripScope=true` zeroes the JA / kanri-shiten / 都道府県 tuple for
   * NICHINO_* accounts (役職 1, 2) per api.md §4.4 — scope is implicit
   * "all" for those roles, so storing values would lie about reality.
   *
   * Input type is the structural intersection of the relevant fields
   * on `CreateAccountDto` / `UpdateAccountDto` so both DTOs are
   * assignable without an explicit cast. Email defaults to '' rather
   * than null because the entity column is NOT NULL.
   */
  private buildAccountSharedPartial(
    dto: {
      account_name: string;
      role_id: number;
      todofuken_code?: string | null;
      ja_id?: number | null;
      kanri_shiten_id?: number | null;
      email?: string;
      sub_email_1?: string;
      sub_email_2?: string;
      sub_email_3?: string;
      paper_flg?: boolean;
      denshi_flg?: boolean;
      biko?: string;
    },
    stripScope: boolean,
  ): Partial<Account> {
    return {
      accountName: dto.account_name,
      roleId: dto.role_id,
      todofukenCode: stripScope ? null : (dto.todofuken_code ?? null),
      jaId: stripScope ? null : (dto.ja_id ?? null),
      kanriShitenId: stripScope ? null : (dto.kanri_shiten_id ?? null),
      email: dto.email ?? '',
      subEmail1: dto.sub_email_1 ?? '',
      subEmail2: dto.sub_email_2 ?? '',
      subEmail3: dto.sub_email_3 ?? '',
      paperFlg: dto.paper_flg ?? false,
      denshiFlg: dto.denshi_flg ?? false,
      biko: dto.biko ?? '',
    };
  }

  private async buildAccountUpdatePartial(
    dto: UpdateAccountDto,
    stripScope: boolean,
    session: SessionPayload,
  ): Promise<Partial<Account>> {
    const updatePartial: Partial<Account> = {
      ...this.buildAccountSharedPartial(dto, stripScope),
      updatedBy: String(session.account_id),
    };

    // account_lock_flg is admin-only — present only when the caller
    // explicitly toggles it from the SCR-025 edit form. Setting it to
    // false (unlock) MUST also reset:
    //   - login_failure_count to 0 (otherwise the next failed attempt
    //     re-trips the threshold — auth.service.ts increments + re-locks
    //     at LOGIN_FAILURE_LOCK_THRESHOLD).
    //   - account_lock_at to null (auth.service.ts stamped it with NOW()
    //     at lock time; leaving the stale timestamp would falsely tell
    //     ops "this account is still under the 2026-05-25 lock"; the
    //     column is the canonical "currently-locked-since" pointer).
    if (dto.account_lock_flg !== undefined) {
      updatePartial.accountLockFlg = dto.account_lock_flg;
      if (dto.account_lock_flg === false) {
        updatePartial.loginFailureCount = 0;
        updatePartial.accountLockAt = null;
      }
    }

    // password is OPTIONAL on update. Only hash + persist when
    // the caller actually submitted a new value; an empty / undefined
    // input means "leave password alone".
    if (dto.password !== undefined && dto.password !== '') {
      updatePartial.passwordHash = await bcrypt.hash(
        dto.password,
        BCRYPT_SALT_ROUNDS,
      );
      updatePartial.passwordUpdatedAt = new Date();
    }

    return updatePartial;
  }

  private buildDetailQuery(accountId: number) {
    // joined SELECT used by GET detail, create-then-read,
    // and update-then-read. Filters deleted_at IS NULL so soft-deleted
    // rows surface as "not found".
    return this.accountRepo
      .createQueryBuilder('a')
      .leftJoin('m_roles', 'r', 'a.role_id = r.role_id AND r.deleted_at IS NULL')
      .leftJoin('m_todofuken', 't', 'a.todofuken_code = t.todofuken_code')
      .leftJoin('m_ja', 'j', 'a.ja_id = j.ja_id AND j.deleted_at IS NULL')
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'a.kanri_shiten_id = ks.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .select([
        'a.account_id AS account_id',
        'a.login_id AS login_id',
        'a.account_name AS account_name',
        'a.role_id AS role_id',
        'r.role_name AS role_name',
        'a.todofuken_code AS todofuken_code',
        't.todofuken_name AS todofuken_name',
        'a.ja_id AS ja_id',
        'j.ja_name AS ja_name',
        'a.kanri_shiten_id AS kanri_shiten_id',
        'ks.kanri_shiten_name AS kanri_shiten_name',
        'a.email AS email',
        'a.sub_email_1 AS sub_email_1',
        'a.sub_email_2 AS sub_email_2',
        'a.sub_email_3 AS sub_email_3',
        'a.paper_flg AS paper_flg',
        'a.denshi_flg AS denshi_flg',
        'a.account_lock_flg AS account_lock_flg',
        'a.biko AS biko',
        'a.created_at AS created_at',
        'a.updated_at AS updated_at',
      ])
      .where('a.account_id = :accountId', { accountId })
      .andWhere('a.deleted_at IS NULL');
  }
}

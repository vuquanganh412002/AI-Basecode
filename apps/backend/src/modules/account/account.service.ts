import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Account } from '@/database/entities/account.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import {
  ConflictException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { fetchFkInJa } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
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
import {
  ACCOUNT_SEARCH_SORT_BY,
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
 * 注記). role_id 1/2 = 日農 (no JA scope), so todofuken_code / ja_id /
 * kanri_shiten_id are forced to null at create/update time.
 */
const NICHINO_ROLE_IDS = new Set<number>([1, 2]);

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
  ) {}

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
      jaId: account.jaId !== null ? Number(account.jaId) : null,
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
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
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

    if (query.login_id && query.login_id.trim().length > 0) {
      qb.andWhere('a.login_id LIKE :loginIdLike', {
        loginIdLike: `%${query.login_id.trim()}%`,
      });
    }
    if (query.role_id !== undefined && query.role_id !== null) {
      qb.andWhere('a.role_id = :role_id', { role_id: query.role_id });
    }
    if (query.ja_id !== undefined && query.ja_id !== null) {
      qb.andWhere('a.ja_id = :ja_id', { ja_id: query.ja_id });
    }
    if (query.kanri_shiten_id !== undefined && query.kanri_shiten_id !== null) {
      qb.andWhere('a.kanri_shiten_id = :kanri_shiten_id', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }

    // Defensive — sortBy is already validated by the DTO @IsIn but
    // double-check before interpolating into the ORDER BY clause.
    // `role_name` lives on the joined m_roles row (alias r); every other
    // whitelisted key lives on m_account (alias a). Anything outside the
    // whitelist falls back to a.created_at.
    let sortColumn: string;
    if (sortBy === 'role_name') {
      sortColumn = 'r.role_name';
    } else if (ACCOUNT_SEARCH_SORT_BY.includes(sortBy)) {
      sortColumn = `a.${sortBy}`;
    } else {
      sortColumn = 'a.created_at';
    }
    qb.orderBy(sortColumn, sortOrder)
      .take(perPage)
      .skip((page - 1) * perPage);

    // Count uses the same WHERE chain via a separate QB so the raw
    // joined SELECT can be returned without paying double DataScope cost.
    const countQb = this.accountRepo
      .createQueryBuilder('a')
      .where('a.deleted_at IS NULL');
    if (query.login_id && query.login_id.trim().length > 0) {
      countQb.andWhere('a.login_id LIKE :loginIdLike', {
        loginIdLike: `%${query.login_id.trim()}%`,
      });
    }
    if (query.role_id !== undefined && query.role_id !== null) {
      countQb.andWhere('a.role_id = :role_id', { role_id: query.role_id });
    }
    if (query.ja_id !== undefined && query.ja_id !== null) {
      countQb.andWhere('a.ja_id = :ja_id', { ja_id: query.ja_id });
    }
    if (query.kanri_shiten_id !== undefined && query.kanri_shiten_id !== null) {
      countQb.andWhere('a.kanri_shiten_id = :kanri_shiten_id', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }

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
  async getAccountDropdown(
    session: SessionPayload,
  ): Promise<{ data: AccountDropdownItem[] }> {
    const qb = this.accountRepo
      .createQueryBuilder('a')
      .innerJoin('m_roles', 'r', 'r.role_id = a.role_id AND r.deleted_at IS NULL')
      .select([
        'a.account_id AS account_id',
        'a.login_id AS login_id',
        'a.account_name AS account_name',
        'r.role_code AS role_code',
        'a.ja_id AS ja_id',
      ])
      .where('a.deleted_at IS NULL');

    if (
      session.role_code !== 'NICHINO_ADMIN' &&
      session.role_code !== 'NICHINO_STAFF'
    ) {
      if (
        session.role_code === 'JA_KANRI_SHITEN' &&
        session.kanri_shiten_id != null
      ) {
        qb.andWhere('a.kanri_shiten_id = :scopeKanriShitenId', {
          scopeKanriShitenId: session.kanri_shiten_id,
        });
      } else if (session.ja_id != null) {
        // CHUOKAI / JA_HONTEN — own JA only
        qb.andWhere('a.ja_id = :scopeJaId', { scopeJaId: session.ja_id });
      }
    }

    qb.orderBy('a.login_id', 'ASC');

    const raw = await qb.getRawMany<{
      account_id: number | string;
      login_id: string;
      account_name: string;
      role_code: string;
      ja_id: number | string | null;
    }>();

    return {
      data: raw.map((r) => ({
        account_id: Number(r.account_id),
        login_id: r.login_id,
        account_name: r.account_name,
        role_code: r.role_code,
        ja_id: r.ja_id == null ? null : Number(r.ja_id),
      })),
    };
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
      await this.auditLog.logError(auditCtx, 'DELETE', err as Error);
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

    // role_id 1/2 (日農) accounts MUST have no JA scope.
    const stripScope = NICHINO_ROLE_IDS.has(dto.role_id);

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
          buildAccountAuditSnapshot(saved as Account),
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
        await this.auditLog.logError(auditCtxFactory(null), 'CREATE', err as Error);
        throw new DuplicateCodeException('ログインID', dto.login_id);
      }
      // [audit-error-log] — OUTSIDE the rolled-back tx so the failure
      // trace survives.
      await this.auditLog.logError(auditCtxFactory(null), 'CREATE', err as Error);
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

    const stripScope = NICHINO_ROLE_IDS.has(dto.role_id);

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

    const updatePartial: Partial<Account> = {
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
      updatedBy: String(session.account_id),
    };

    // account_lock_flg is admin-only — present only when the caller
    // explicitly toggles it from the SCR-025 edit form. Setting it to
    // false (unlock) MUST also reset login_failure_count to 0; otherwise
    // the next failed attempt re-trips the threshold (auth.service.ts
    // increments + re-locks at LOGIN_FAILURE_LOCK_THRESHOLD).
    if (dto.account_lock_flg !== undefined) {
      updatePartial.accountLockFlg = dto.account_lock_flg;
      if (dto.account_lock_flg === false) {
        updatePartial.loginFailureCount = 0;
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
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
      throw err;
    }

    const row = await this.buildDetailQuery(accountId).getRawOne<AccountDetailRow>();
    if (!row) {
      throw new NotFoundException('アカウント');
    }
    return { data: toAccountDetail(row), message: '更新しました。' };
  }

  // ─── helpers ─────────────────────────────────────────────────────────
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

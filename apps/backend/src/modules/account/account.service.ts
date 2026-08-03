import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, IsNull, Repository, SelectQueryBuilder } from 'typeorm';

import { Account } from '@/database/entities/account.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Shiten } from '@/database/entities/shiten.entity';
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
import {
  SessionService,
  type SessionPayload,
} from '@/modules/auth/session.service';

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
 * audit before/after_value JSON に載せる m_account 列のサブセット。
 * password_hash / mfa_enable_flg / login_failure_count は除外（api.md §4.5 注記:
 * パスワード等の機密情報は含めないこと）。account_lock_flg は SCR-025 の admin 解除で
 * 明確な before/after 監査証跡を残すため含める。
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
    shiten_id: account.shitenId === null ? null : Number(account.shitenId),
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
 * スコープ列を持ってはいけない役職（api.md §4.4 注記）。日農役職(NICHINO_ADMIN /
 * NICHINO_STAFF)は JA スコープを持たないので create/update 時に todofuken_code /
 * ja_id / kanri_shiten_id を null に強制。
 * role_id ではなく role_code で分岐 — m_roles の再seed/並替に対し安定（role_id は
 * BIGSERIAL で INSERT 順依存、role_code は固定文字列識別子）。role_id→role_code は
 * service の resolveRoleCode() で解決。
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
    @InjectRepository(Shiten)
    private readonly shitenRepo: Repository<Shiten>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * 所属支店(shiten_id)の整合性を検証する（顧客要件 2026-07）。JA管理支店アカウント
   * のみ設定可で、支店はそのアカウントの管理支店(kanri_shiten_id)配下でなければ
   * ならない。存在しなければ 400、管理支店/JA が一致しなければ検証エラー。
   */
  private async assertShitenBelongsToKanriShiten(
    shitenId: number,
    expectedKanriShitenId: number | null | undefined,
    expectedJaId: number | null | undefined,
  ): Promise<void> {
    const shiten = await this.shitenRepo.findOne({
      where: { shitenId, deletedAt: IsNull() },
    });
    if (!shiten) {
      throw new ValidationException([
        { field: 'shiten_id', message: '支店IDが存在しません。' },
      ]);
    }
    if (
      expectedKanriShitenId != null &&
      Number(shiten.kanriShitenId) !== Number(expectedKanriShitenId)
    ) {
      throw new ValidationException([
        {
          field: 'shiten_id',
          message: '支店はアカウントの管理支店に属している必要があります。',
        },
      ]);
    }
    if (expectedJaId != null && Number(shiten.jaId) !== Number(expectedJaId)) {
      throw new ValidationException([
        {
          field: 'shiten_id',
          message: '支店はアカウントのJAに属している必要があります。',
        },
      ]);
    }
  }

  /**
   * role_id(DTO入力, FK to m_roles.role_id) → role_code を m_roles 参照で解決。
   * create/update が role_id の数値に依存せず 日農 vs JA 分岐するため（role_id は
   * BIGSERIAL で drift しやすい）。
   * FK 存在チェックも兼ねる: 非削除 m_roles に一致なしなら VALIDATION_ERROR
   * （useApiForm がパースする FE 表示形状）。m_roles は PK indexed の5行 append-only で
   * ~0.1ms、キャッシュ層は不要。
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
   * 呼出者自身の MFA フラグを切替。account_id は認証済セッション由来必須 —
   * 任意 ID は受けない（多層防御、controller が唯一の正規呼出者）。
   * UPDATE + audit log を単一 transaction で包み監査証跡が状態と乖離しないようにする。
   * 失敗時は rolled-back tx 外に log_type=3 行を emit。
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
        // logUpdate は同一 tx 内で実行（失敗時に m_account 書込もロールバック）。
        await this.auditLog.logUpdate(auditCtx, before, after, manager);
      });
    } catch (err) {
      // Error log は rolled-back tx 外で存続させる。
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

    // LEFT JOIN m_roles / m_todofuken / m_ja / m_kanri_shiten の join SELECT。
    // NICHINO_ADMIN は DataScope をバイパス（api.md §4.3）。
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
      .leftJoin(
        'm_shiten',
        's',
        'a.shiten_id = s.shiten_id AND s.deleted_at IS NULL',
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
        'a.shiten_id AS shiten_id',
        's.shiten_name AS shiten_name',
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

    // 防御的 — sortBy は DTO @IsIn で検証済みだが ORDER BY 補間前に再確認。
    // role_name は join した m_roles(alias r)、他の許可キーは m_account(alias a)。
    // 許可外は a.created_at に fallback。
    const sortColumn = this.resolveAccountSortColumn(sortBy);
    // limit/offset(take/skip ではない): take/skip は getMany() のみページング — 下の
    // getRawMany() では無視され全行返してしまう。countQb.getCount() は別クエリなので
    // meta 合計は正しいまま。
    qb.orderBy(sortColumn, sortOrder)
      .limit(perPage)
      .offset((page - 1) * perPage);

    // Count は別 QB で同一 WHERE を再利用 — DataScope コストを二重払いせず raw join
    // SELECT を返せる。
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
  // SCR-030(ログ参照画面)と併設だがアカウント picker が要る全画面で使用。DataScope は
  // 役職ごとに自動適用。サーバ側ページング+検索(既定50/page)で `<BaseAccountDropdown>`
  // の無限スクロールを駆動可能。
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

      // [data-scope] CHUOKAI / JA_HONTEN は自 JA、JA_KANRI_SHITEN は自 kanri_shiten
      // のみ。NICHINO_* はバイパス。
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
      // [match-field] 'name' = account_name のみ（SCR-030 ログ画面の項目は ユーザ名 で、
      // login_id 一致だと検索列と読めない列でヒットする）。既定 'both' は従来の
      // login_id OR account_name を維持。
      if (query.match_field === 'name') {
        qb.andWhere('a.account_name ILIKE :q', { q: `%${query.q}%` });
      } else {
        qb.andWhere(
          '(a.login_id ILIKE :q OR a.account_name ILIKE :q)',
          { q: `%${query.q}%` },
        );
      }
    }

    // Count は別 scoped クエリで同一 q filter を再適用 — total が全テーブルでなく
    // 絞込結果を反映する。
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

    // [include-id] 選択済み account_id が DataScope は通るが現ページ外にある場合に
    // 先頭付加 — JA dropdown の編集フォーム事前選択 escape hatch と同様。
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
    // [fetch-target] — 存在チェック。
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

    // [fk-conflict-check] — 関連データ(有効 MFA OTP 行)チェック。パスワード/MFA 検証
    // 途中のアカウントを監査証跡が参照しないよう削除をブロック。
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

    // audit before_value に password_hash を残さない。
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
        // [soft-delete] — 論理削除。
        await manager.update(
          Account,
          { accountId },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — tx 内なので業務書込 + 監査行が一括 commit/rollback。
        // INSERT をこの tx に載せるため `manager` 必須（standalone repo でなく）。
        await this.auditLog.logDelete(auditCtx, beforeSnapshot, manager);
      });
    } catch (err) {
      // [audit-error-log] — rolled-back tx 外で失敗トレースを存続。ここで `manager`
      // は絶対渡さない。
      await this.auditLog.logError(auditCtx, AuditOperation.DELETE, err as Error);
      throw err;
    }

    // [session-revoke] — 削除アカウントの有効セッションを全破棄（セキュリティ:
    // de-provisioning）。cookie 保持のまま退職者/無効化アカウントが権限を持ち続けるのを
    // 防ぐ。削除は commit 済みなので Redis 障害でも応答成功のまま（失敗は warn のみ）。
    await this.revokeSessionsSafely(accountId, 'account_deleted');

    return { message: '削除しました。' };
  }

  /**
   * account の全 Redis セッションを best-effort 破棄。de-provisioning 書込
   * (delete/lock/password/role/scope 変更)の commit 後に呼び、古い session_id cookie が
   * 変更より長生きしないようにする。Redis 障害は commit 済み業務書込を失敗させてはならず
   * warn ログのみ（セッションは 24h TTL 内に失効し、変更は永続化済み）。
   */
  private async revokeSessionsSafely(
    accountId: number,
    reason: string,
  ): Promise<void> {
    try {
      const count = await this.sessionService.destroyAllForAccount(accountId);
      this.logger.log({
        event: 'account.sessions_revoked',
        accountId,
        reason,
        revokedCount: count,
      });
    } catch (err) {
      this.logger.warn({
        event: 'account.sessions_revoke_failed',
        accountId,
        reason,
        error: (err as Error).message,
      });
    }
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
    // [uniqueness-check] — login_id 重複ガード(UNIQUE 制約ミラー)。`withDeleted: true` —
    // login_id は論理削除後も行に予約され再利用禁止。deleted_at で絞らない DB UNIQUE
    // INDEX に一致。
    const dupes = await this.accountRepo.count({
      where: { loginId: dto.login_id },
      withDeleted: true,
    });
    if (dupes > 0) {
      throw new DuplicateCodeException('ログインID', dto.login_id);
    }

    // 永続化前に bcrypt-hash し平文を DB に落とさない。salt rounds は既存 auth flow
    // (apps/backend/src/modules/auth/auth.service.ts)と一致。
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // 日農アカウント(NICHINO_ADMIN / NICHINO_STAFF)は JA スコープを持ってはならない。
    // role_id→role_code を m_roles で解決し role_id の数値(BIGSERIAL, drift)に依存しない。
    // この lookup は role_id の FK 存在チェックも兼ねる。
    const roleCode = await this.resolveRoleCode(dto.role_id);
    const stripScope = isNichinoRole(roleCode);
    const isKanriShitenRole = roleCode === RoleCode.JA_KANRI_SHITEN;

    // FK guard + Layer 4 DataScope — kanri_shiten はアカウントの JA に属す必要あり
    // (scoped でも NICHINO_STAFF の代行入力でも)。
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

    // 所属支店(shiten_id)は JA管理支店アカウントのみ設定可・管理支店配下必須（顧客要件
    // 2026-07）。
    if (isKanriShitenRole && dto.shiten_id != null) {
      await this.assertShitenBelongsToKanriShiten(
        dto.shiten_id,
        dto.kanri_shiten_id,
        dto.ja_id ?? session.ja_id,
      );
    }

    const newRow: Partial<Account> = {
      loginId: dto.login_id,
      passwordHash,
      ...this.buildAccountSharedPartial(dto, stripScope, isKanriShitenRole),
      // 初期セキュリティ状態（§4.4 注記）。
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
        // [business-insert] — INSERT m_account。`manager.save(Entity, value)` は
        // IDENTITY 生成の account_id を持つ hydrated 行を返す。
        const saved = await manager.save(Account, newRow);
        const insertedId = Number(saved.accountId);

        // [audit-log-in-tx] — tx 内で業務書込 + 監査行を一括 commit/rollback。同一 tx に
        // 載せるため `manager` 必須。
        await this.auditLog.logCreate(
          auditCtxFactory(insertedId),
          buildAccountAuditSnapshot(saved),
          manager,
        );

        return insertedId;
      });
    } catch (err) {
      // 競合セーフティネット: 同時 CREATE 2件が pre-check を通過し2件目の INSERT が DB
      // UNIQUE INDEX に当たる。その 23505 を 500 に流さず clean 400 に変換。
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(auditCtxFactory(null), AuditOperation.CREATE, err as Error);
        throw new DuplicateCodeException('ログインID', dto.login_id);
      }
      // [audit-error-log] — rolled-back tx 外で失敗トレースを存続。
      await this.auditLog.logError(auditCtxFactory(null), AuditOperation.CREATE, err as Error);
      throw err;
    }

    // [reread-after-write] — join 行を再読込し応答に role_name / todofuken_name /
    // ja_name / kanri_shiten_name を載せる。
    const row = await this.buildDetailQuery(savedId).getRawOne<AccountDetailRow>();
    if (!row) {
      // 防御的 — commit と SELECT の間で挿入行が削除された競合時のみ発火。undefined で
      // クラッシュせず 404 として返す。
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
    // [fetch-target] — 存在チェック。
    const before = await this.accountRepo.findOne({
      where: { accountId, deletedAt: IsNull() },
    });
    if (!before) {
      throw new NotFoundException('アカウント');
    }

    // role_code 駆動の scope チェック — createAccount と同じ根拠。
    const roleCode = await this.resolveRoleCode(dto.role_id);
    const stripScope = isNichinoRole(roleCode);
    const isKanriShitenRole = roleCode === RoleCode.JA_KANRI_SHITEN;

    // [effective-ja] — 更新後に実際に保存される JA。DTO は ja_id を差し替え可能なので
    // 「JA と 管理支店 を同時に別 JA へ付け替える」正常フロー（SCR-025 で都道府県を
    // 変更すると FE が JA/管理支店をリセットし新 JA 配下から選び直す）では before.jaId
    // で検証すると必ず DATA_SCOPE_VIOLATION になる。buildAccountSharedPartial が
    // `jaId: dto.ja_id ?? null` を書くのと同じ実効値で検証する。
    const effectiveJaId = stripScope ? null : (dto.ja_id ?? before.jaId ?? null);

    // FK guard + Layer 4 DataScope — 新 kanri_shiten(指定時)は存在し、かつ更新後の
    // JA(effectiveJaId)に属す必要あり。NICHINO_* が任意 JA のアカウントを操作する
    // 場合もその JA に束縛される。
    if (
      !stripScope &&
      dto.kanri_shiten_id !== undefined &&
      dto.kanri_shiten_id !== null
    ) {
      if (effectiveJaId !== null && effectiveJaId !== undefined) {
        await fetchFkInJa(
          this.kanriShitenRepo,
          'kanriShitenId',
          dto.kanri_shiten_id,
          Number(effectiveJaId),
          '管理支店',
        );
      }
    }

    // 所属支店(shiten_id)は JA管理支店アカウントのみ・実効管理支店配下（顧客要件
    // 2026-07）。実効管理支店 = dto.kanri_shiten_id ?? before.kanriShitenId。
    if (isKanriShitenRole && dto.shiten_id != null) {
      // (以下同一) — JA も上と同じ実効値で判定。
      await this.assertShitenBelongsToKanriShiten(
        dto.shiten_id,
        dto.kanri_shiten_id ?? before.kanriShitenId,
        effectiveJaId,
      );
    }

    const updatePartial = await this.buildAccountUpdatePartial(
      dto,
      stripScope,
      isKanriShitenRole,
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

        // tx 内で再読込 — audit after_value を書込と同一分離レベルの更新後状態にする。
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

    // [session-revoke] — セキュリティ上重要な変更（パスワード変更・アカウント
    // ロック・ロール変更・所属スコープ変更）があった場合、対象アカウントの
    // 有効セッションを全破棄する。session ペイロードは permissions/role_code/
    // ja_id 等をログイン時に固定するため、破棄しないと降格/ロックが現在の
    // cookie 保持者に反映されず権限が残り続ける（de-provisioning bypass）。
    // ロック解除(false)・メール等の非機密変更では破棄しない。
    if (this.isSecuritySensitiveUpdate(before, updatePartial)) {
      await this.revokeSessionsSafely(accountId, 'account_updated');
    }

    const row = await this.buildDetailQuery(accountId).getRawOne<AccountDetailRow>();
    if (!row) {
      throw new NotFoundException('アカウント');
    }
    return { data: toAccountDetail(row), message: '更新しました。' };
  }

  /**
   * セッションがログイン時に固定する項目（パスワード / ロック(→true) / ロール /
   * 所属スコープ ja・kanri_shiten・shiten）を変更する更新なら true。該当時は既存
   * セッションを破棄し ≤24h TTL を待たず即時反映させる。ロック解除
   * (account_lock_flg=false)・email・biko・名称等は非機密で破棄対象外。
   */
  private isSecuritySensitiveUpdate(
    before: Account,
    updatePartial: Partial<Account>,
  ): boolean {
    // パスワード変更（admin 強制リセット）。
    if (updatePartial.passwordHash !== undefined) return true;
    // ロック（true のみ — 解除は admin 自身のセッションを切ってはならない）。
    if (updatePartial.accountLockFlg === true) return true;
    // ロール（権限セット）変更。
    if (
      updatePartial.roleId !== undefined &&
      Number(updatePartial.roleId) !== Number(before.roleId)
    ) {
      return true;
    }
    // 所属スコープ変更 — session の ja_id/kanri_shiten_id は固定されている。
    // 両辺で undefined↔null を正規化: undefined は「この更新に含まれない」で
    // null（スコープなし）と等価。実際の値遷移のみを変更とみなす。
    const scopeChanged = (
      next: number | null | undefined,
      prev: bigint | number | null | undefined,
    ): boolean => {
      if (next === undefined) return false; // 更新 partial に含まれない
      const n = next === null ? null : Number(next);
      const p = prev === null || prev === undefined ? null : Number(prev);
      return n !== p;
    };
    if (scopeChanged(updatePartial.jaId as number | null | undefined, before.jaId)) {
      return true;
    }
    if (
      scopeChanged(
        updatePartial.kanriShitenId as number | null | undefined,
        before.kanriShitenId,
      )
    ) {
      return true;
    }
    if (
      scopeChanged(
        updatePartial.shitenId as number | null | undefined,
        before.shitenId,
      )
    ) {
      return true;
    }
    return false;
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
    if (query.shiten_id !== undefined && query.shiten_id !== null) {
      qb.andWhere('a.shiten_id = :shiten_id', { shiten_id: query.shiten_id });
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
   * createAccount / updateAccount が DTO からそのまま書く12列。両者で `...spread`
   * して重複記述を避ける（Sonar が12行重複と検出していた）。
   *
   * stripScope=true は NICHINO_*(役職 1,2)の JA/kanri_shiten/都道府県 を null 化
   * （api.md §4.4 — これらの役職はスコープが暗黙「全件」で値保存は実態と矛盾）。
   *
   * 入力型は Create/Update 両 DTO の該当フィールドの構造的積集合でキャスト不要。
   * email は entity 列が NOT NULL のため null でなく '' を既定にする。
   */
  private buildAccountSharedPartial(
    dto: {
      account_name: string;
      role_id: number;
      todofuken_code?: string | null;
      ja_id?: number | null;
      kanri_shiten_id?: number | null;
      shiten_id?: number | null;
      email?: string;
      sub_email_1?: string;
      sub_email_2?: string;
      sub_email_3?: string;
      paper_flg?: boolean;
      denshi_flg?: boolean;
      biko?: string;
    },
    stripScope: boolean,
    // 所属支店は JA管理支店アカウントのみ設定可（顧客要件 2026-07）。それ以外の
    // role では常に NULL に固定する。
    isKanriShitenRole: boolean,
  ): Partial<Account> {
    return {
      accountName: dto.account_name,
      roleId: dto.role_id,
      todofukenCode: stripScope ? null : (dto.todofuken_code ?? null),
      jaId: stripScope ? null : (dto.ja_id ?? null),
      kanriShitenId: stripScope ? null : (dto.kanri_shiten_id ?? null),
      shitenId: isKanriShitenRole ? (dto.shiten_id ?? null) : null,
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
    isKanriShitenRole: boolean,
    session: SessionPayload,
  ): Promise<Partial<Account>> {
    const updatePartial: Partial<Account> = {
      ...this.buildAccountSharedPartial(dto, stripScope, isKanriShitenRole),
      updatedBy: String(session.account_id),
    };

    // account_lock_flg は admin 専用 — SCR-025 編集フォームで明示切替時のみ存在。
    // false(解除)時は次も必ずリセット:
    //   - login_failure_count=0（残すと次の失敗で auth.service.ts が
    //     LOGIN_FAILURE_LOCK_THRESHOLD で再ロック）。
    //   - account_lock_at=null（ロック時 auth.service.ts が NOW() を刻む。残すと
    //     「まだロック中」と誤認。この列が「ロック開始時刻」の正）。
    if (dto.account_lock_flg !== undefined) {
      updatePartial.accountLockFlg = dto.account_lock_flg;
      if (dto.account_lock_flg === false) {
        updatePartial.loginFailureCount = 0;
        updatePartial.accountLockAt = null;
      }
    }

    // password は更新時 任意。新しい値が送られた時のみ hash+保存。空/undefined は
    // 「パスワード変更なし」。
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
    // GET 詳細 / 登録後読込 / 更新後読込 で使う join SELECT。deleted_at IS NULL で
    // 絞り論理削除行は「not found」扱い。
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
      .leftJoin(
        'm_shiten',
        's',
        'a.shiten_id = s.shiten_id AND s.deleted_at IS NULL',
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
        'a.shiten_id AS shiten_id',
        's.shiten_name AS shiten_name',
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

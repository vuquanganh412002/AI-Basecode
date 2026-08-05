// AccountService unit specs — covers all surfaces of the single
// AccountService class:
//   - header self-service     — MFA toggle (this file's original scope)
//   - ACSMS-SCR-024            — アカウントマスタ明細検索画面 (search + delete)
//   - ACSMS-SCR-025            — アカウントマスタ登録画面 (detail + create + update)
//   - ACSMS-SCR-030 / COMMON-005 — getAccountDropdown
//
// Tests are organised as sibling top-level describe blocks so each
// surface has its own mock scope (the QB shape and the audit-log
// helper signatures differ across SCRs). Spec count + assertions
// remain 1:1 with the originals; only the location changed (merged
// from __tests__/ into this file so the module follows "1 source =
// 1 spec file").

import {
  ConflictException,
  DuplicateCodeException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { AccountService } from '@/modules/account/account.service';
import {
  buildAccountEntity as buildAccountFormEntity,
  buildCreateAccountBody,
  buildUpdateAccountBody,
} from '@test/fixtures/account-form.factory';
import {
  buildAccountEntity,
  buildAccountListRows,
} from '@test/fixtures/accounts.factory';
import { buildAccount } from '@test/fixtures/auth.factory';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';

describe('AccountService', () => {
  let service: AccountService;
  let accountRepo: any;
  let auditLog: any;
  let dataSource: any;
  let txManager: any;
  const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

  beforeEach(() => {
    accountRepo = {
      findOne: jest.fn(),
    };
    auditLog = {
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };

    txManager = {
      // Service uses `manager.update(Account, where, partial)` — keep
      // save/create stubs for general transaction patterns just in case.
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) =>
        maybeValue ?? entityOrValue,
      ),
      create: jest.fn((_cls: any, payload: any) => payload),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };

    // FK-guard repo for the kanri_shiten Layer 4 check. Default returns
    // a row with jaId matching whatever the spec passes — tests that
    // want to verify the FK failure path can override via mockResolvedValue(null).
    const kanriShitenRepo: any = {
      findOne: jest.fn().mockResolvedValue({ kanriShitenId: 1, jaId: 1 }),
    };
    // role_id → role_code resolver. Default mirrors the seed migration
    // (1=NICHINO_ADMIN, 2=NICHINO_STAFF, 3=CHUOKAI, 4=JA_HONTEN,
    // 5=JA_KANRI_SHITEN). Specs that want a "role not found" 400 path
    // can override with `.mockResolvedValueOnce(null)`.
    const ROLE_CODE_BY_ID: Record<number, string> = {
      1: 'NICHINO_ADMIN',
      2: 'NICHINO_STAFF',
      3: 'CHUOKAI',
      4: 'JA_HONTEN',
      5: 'JA_KANRI_SHITEN',
    };
    const roleRepo: any = {
      findOne: jest.fn(({ where }: any) => {
        const code = ROLE_CODE_BY_ID[where?.roleId as number];
        return Promise.resolve(code ? { roleCode: code } : null);
      }),
    };
    const shitenRepo: any = { findOne: jest.fn().mockResolvedValue({ shitenId: 1, kanriShitenId: 1, jaId: 1 }) };
    const sessionService: any = {
      destroyAllForAccount: jest.fn().mockResolvedValue(0),
    };
    service = new AccountService(accountRepo, auditLog, dataSource, kanriShitenRepo, shitenRepo, roleRepo, sessionService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('toggleMfa', () => {
    it('should update mfaEnableFlg and return new state when enabling MFA', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: false }));

      const result = await service.toggleMfa(1, true, ctx);

      expect(result).toEqual({
        mfa_enable_flg: true,
        message: '2段階認証を有効にしました。',
      });
      // DML inside the transaction with the new flag.
      expect(txManager.update).toHaveBeenCalledWith(
        expect.anything(), // Account class
        { accountId: 1 },
        expect.objectContaining({ mfaEnableFlg: true }),
      );
    });

    it('should update mfaEnableFlg and return new state when disabling MFA', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: true }));

      const result = await service.toggleMfa(1, false, ctx);

      expect(result).toEqual({
        mfa_enable_flg: false,
        message: '2段階認証を無効にしました。',
      });
    });

    it('should throw NotFoundException when account does not exist', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleMfa(999, true, ctx)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should call auditLog.logUpdate with operation UPDATE and before/after states inside transaction', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: false }));

      await service.toggleMfa(1, true, ctx);

      // Audit log must run inside the same transaction (only one tx call total).
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          targetId: 1,
          table: 'm_account',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }),
        expect.objectContaining({ mfa_enable_flg: false }),
        expect.objectContaining({ mfa_enable_flg: true }),
        // EntityManager — service threads the tx manager through so the
        // audit INSERT joins the same transaction as the m_account write.
        txManager,
      );
    });

    it('should rollback and emit error log outside transaction when audit log fails', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: false }));
      auditLog.logUpdate.mockRejectedValueOnce(new Error('audit-down'));

      await expect(service.toggleMfa(1, true, ctx)).rejects.toBeDefined();

      // Error log emitted OUTSIDE the rolled-back tx.
      expect(auditLog.logError).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 1, table: 'm_account' }),
        'UPDATE',
        expect.any(Error),
      );
    });

    it('should be idempotent and still write audit log when toggle target equals current state', async () => {
      // Per spec: even a no-op write produces an audit row so admins can
      // see "user X explicitly toggled MFA at HH:MM" in t_log.
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: true }));

      const result = await service.toggleMfa(1, true, ctx);

      expect(result.mfa_enable_flg).toBe(true);
      expect(auditLog.logUpdate).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-024 — アカウントマスタ明細検索画面 (search + delete). Sibling
// top-level describe so its QueryBuilder-heavy mocks and audit-log
// helper signatures don't leak into the header MFA block above.
// ═══════════════════════════════════════════════════════════════════════

describe('AccountService — SCR-024 (search + delete)', () => {
  let service: any;
  let accountRepo: any;
  let qbMock: any;
  let auditLog: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  const adminSession = () =>
    buildSession({
      account_id: 100,
      login_id: 'admin01',
      role_id: 1,
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      kanri_shiten_id: null,
      permissions: ['account.view', 'account.delete'],
    });

  beforeEach(() => {
    // Singleton QB — spec-side `.mockResolvedValue(...)` and service-side
    // `repo.createQueryBuilder(...)` see the same instance.
    qbMock = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    accountRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock),
    };

    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      async logDelete(ctx: any, before: unknown, _mgr?: unknown) {
        return this.logOperation({
          logType: 1,
          accountId: ctx.accountId,
          jaId: ctx.jaId,
          gamenName: ctx.screen,
          operation: 'DELETE',
          resultStatus: 1,
          targetId: ctx.targetId,
          targetTable: ctx.table,
          beforeValue: JSON.stringify(before),
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      },
      async logError(ctx: any, operation: string, err: Error) {
        return this.logOperation({
          logType: 3,
          accountId: ctx.accountId,
          jaId: ctx.jaId,
          gamenName: ctx.screen,
          operation,
          resultStatus: 2,
          targetId: ctx.targetId,
          targetTable: ctx.table,
          errorMessage: err.message,
          stackTrace: err.stack ?? '',
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      },
    };

    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        return { ...value };
      }),
      softRemove: jest.fn(async (entity: any) => entity),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn(async () => []),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => [{ count: '0' }]),
    };

    // Constructor MUST match the existing AccountService signature plus
    // any new positional args /gen-code-backend adds. Order:
    //   (accountRepo, auditLog, dataSource, kanriShitenRepo)
    const kanriShitenRepo: any = {
      findOne: jest.fn().mockResolvedValue({ kanriShitenId: 1, jaId: 1 }),
    };
    // role_id → role_code resolver. Default mirrors the seed migration
    // (1=NICHINO_ADMIN, 2=NICHINO_STAFF, 3=CHUOKAI, 4=JA_HONTEN,
    // 5=JA_KANRI_SHITEN). Specs that want a "role not found" 400 path
    // can override with `.mockResolvedValueOnce(null)`.
    const ROLE_CODE_BY_ID: Record<number, string> = {
      1: 'NICHINO_ADMIN',
      2: 'NICHINO_STAFF',
      3: 'CHUOKAI',
      4: 'JA_HONTEN',
      5: 'JA_KANRI_SHITEN',
    };
    const roleRepo: any = {
      findOne: jest.fn(({ where }: any) => {
        const code = ROLE_CODE_BY_ID[where?.roleId as number];
        return Promise.resolve(code ? { roleCode: code } : null);
      }),
    };
    const shitenRepo: any = { findOne: jest.fn().mockResolvedValue({ shitenId: 1, kanriShitenId: 1, jaId: 1 }) };
    const sessionService: any = {
      destroyAllForAccount: jest.fn().mockResolvedValue(0),
    };
    service = new AccountService(accountRepo, auditLog, dataSource, kanriShitenRepo, shitenRepo, roleRepo, sessionService);
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-024-001 — GET /api/v1/accounts (searchAccounts)
  // ───────────────────────────────────────────────────────────────────
  describe('searchAccounts', () => {
    it('should return paginated rows with data + meta shape when NICHINO_ADMIN calls', async () => {
      // COVERS: §4.6 レスポンス生成 — { data: [...], meta: {...} }
      const rows = buildAccountListRows();
      qbMock.getRawMany.mockResolvedValue(rows);
      qbMock.getMany.mockResolvedValue(rows);
      qbMock.getRawOne.mockResolvedValue({ total: '50' });
      qbMock.getManyAndCount.mockResolvedValue([rows, 50]);
      qbMock.getCount.mockResolvedValue(50);

      const result = await service.searchAccounts(
        { page: 1, per_page: 20 },
        adminSession(),
      );

      expect(result).toMatchObject({
        data: expect.any(Array),
        meta: expect.objectContaining({
          total: 50,
          page: 1,
          per_page: 20,
          total_pages: 3,
        }),
      });
      expect(result.data).toHaveLength(2);
    });

    it('should filter login_id with LIKE partial match when login_id is provided', async () => {
      // COVERS: §4.5 — login_id LIKE '%' || :login_id || '%'
      qbMock.getRawMany.mockResolvedValue([]);
      qbMock.getMany.mockResolvedValue([]);
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchAccounts(
        { login_id: 'admin', page: 1, per_page: 20 },
        adminSession(),
      );

      const loginCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /login_?id/i.test(sql),
      );
      expect(loginCall).toBeDefined();
    });

    it('should filter role_id with exact match when role_id is provided', async () => {
      // COVERS: §4.5 — a.role_id = :role_id
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchAccounts(
        { role_id: 3, page: 1, per_page: 20 },
        adminSession(),
      );

      const roleCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /role_?id/i.test(sql),
      );
      expect(roleCall).toBeDefined();
    });

    it('should filter ja_id with exact match when ja_id is provided', async () => {
      // COVERS: §4.5 — a.ja_id = :ja_id
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchAccounts(
        { ja_id: 10, page: 1, per_page: 20 },
        adminSession(),
      );

      const jaCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?id\b/i.test(sql),
      );
      expect(jaCall).toBeDefined();
    });

    it('should filter kanri_shiten_id with exact match when kanri_shiten_id is provided', async () => {
      // COVERS: §4.5 — a.kanri_shiten_id = :kanri_shiten_id
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchAccounts(
        { kanri_shiten_id: 20, page: 1, per_page: 20 },
        adminSession(),
      );

      const ksCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_?shiten_?id/i.test(sql),
      );
      expect(ksCall).toBeDefined();
    });

    it('should always filter deleted_at IS NULL when querying accounts', async () => {
      // COVERS: §4.5 — a.deleted_at IS NULL
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchAccounts({ page: 1, per_page: 20 }, adminSession());

      const allSql = [
        ...qbMock.where.mock.calls,
        ...qbMock.andWhere.mock.calls,
      ]
        .map(([sql]: any[]) => (typeof sql === 'string' ? sql : ''))
        .join(' ');
      expect(allSql).toMatch(/deleted_?at\s+IS\s+NULL/i);
    });

    it('should apply pagination LIMIT + OFFSET when page and per_page are provided', async () => {
      // COVERS: §4.5 — LIMIT :per_page OFFSET (page-1)*per_page.
      // limit/offset (NOT take/skip) — take/skip are ignored by getRawMany().
      qbMock.getRawMany.mockResolvedValue([]);
      qbMock.getCount.mockResolvedValue(0);

      await service.searchAccounts(
        { page: 3, per_page: 25 },
        adminSession(),
      );

      expect(qbMock.limit).toHaveBeenCalledWith(25);
      expect(qbMock.offset).toHaveBeenCalledWith(50); // (3-1) * 25
    });

    it('should use default page=1 and per_page=20 when not provided', async () => {
      // COVERS: §4.1 デフォルト値
      qbMock.getRawMany.mockResolvedValue([]);
      qbMock.getCount.mockResolvedValue(0);

      await service.searchAccounts({}, adminSession());

      expect(qbMock.limit).toHaveBeenCalledWith(20);
      expect(qbMock.offset).toHaveBeenCalledWith(0);
    });

    it('should default sort_by=created_at and sort_order=desc when not provided', async () => {
      // COVERS: §4.1 デフォルト
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchAccounts({}, adminSession());

      const orderCall = qbMock.orderBy.mock.calls.find(
        ([col]: any[]) => typeof col === 'string' && /created_?at/i.test(col),
      );
      expect(orderCall).toBeDefined();
      // Second arg is DESC | 'DESC' | 'desc' depending on TypeORM signature.
      const arg2 = String(orderCall[1] ?? '').toLowerCase();
      expect(arg2).toBe('desc');
    });

    it('should LEFT JOIN m_roles to surface role_name when assembling the result row', async () => {
      // COVERS: §4.5 — LEFT JOIN m_roles r ON a.role_id = r.role_id
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchAccounts({}, adminSession());

      const joinCalls = [
        ...qbMock.leftJoin.mock.calls,
        ...qbMock.leftJoinAndSelect.mock.calls,
      ];
      const rolesJoin = joinCalls.find(
        ([target]: any[]) => typeof target === 'string' && /m_?roles\b|\bRole\b/i.test(target),
      );
      expect(rolesJoin).toBeDefined();
    });

    it('should return data shape matching api.md レスポンス成功例 (snake_case + joined names) when rows resolve', async () => {
      // COVERS: §レスポンスデータ — account_id / login_id / role_name / ja_name / kanri_shiten_name / todofuken_name
      const rows = buildAccountListRows();
      qbMock.getRawMany.mockResolvedValue(rows);
      qbMock.getMany.mockResolvedValue(rows);
      qbMock.getManyAndCount.mockResolvedValue([rows, rows.length]);

      const result = await service.searchAccounts(
        { page: 1, per_page: 20 },
        adminSession(),
      );

      const first = result.data[0];
      expect(first).toMatchObject({
        account_id: 1,
        login_id: 'admin001',
        account_name: '管理者 太郎',
        role_id: 1,
        role_name: '日農（管理者）',
        paper_flg: true,
        denshi_flg: false,
      });
    });

    it('should return data:[] and meta.total=0 when no rows match', async () => {
      // COVERS: §4.6 — 検索結果が0件の場合
      qbMock.getRawMany.mockResolvedValue([]);
      qbMock.getMany.mockResolvedValue([]);
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.searchAccounts(
        { login_id: 'no-match' },
        adminSession(),
      );

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });

    it('should preserve null joined-field values when the account has no JA/管理支店/都道府県', async () => {
      // COVERS: §レスポンスデータ — Nullable=〇 for ja_name / kanri_shiten_name / todofuken_name
      const adminRow = buildAccountListRows()[0];
      qbMock.getRawMany.mockResolvedValue([adminRow]);
      qbMock.getMany.mockResolvedValue([adminRow]);
      qbMock.getManyAndCount.mockResolvedValue([[adminRow], 1]);

      const result = await service.searchAccounts(
        { page: 1, per_page: 20 },
        adminSession(),
      );

      expect(result.data[0].ja_id).toBeNull();
      expect(result.data[0].ja_name).toBeNull();
      expect(result.data[0].kanri_shiten_id).toBeNull();
      expect(result.data[0].kanri_shiten_name).toBeNull();
      expect(result.data[0].todofuken_code).toBeNull();
      expect(result.data[0].todofuken_name).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-024-002 — DELETE /api/v1/accounts/{account_id} (deleteAccount)
  // ───────────────────────────────────────────────────────────────────
  describe('deleteAccount', () => {
    beforeEach(() => {
      // Default: target row exists, no related rows.
      const before = buildAccountEntity({ accountId: 5 });
      accountRepo.findOne.mockResolvedValue(before);
      txManager.findOne.mockResolvedValue(before);
      dataSource.query = jest.fn().mockResolvedValue([{ related_count: '0' }]);
      txManager.update.mockResolvedValue({ affected: 1 });
    });

    it('should soft-delete and return success message when NICHINO_ADMIN deletes account with no related data', async () => {
      // COVERS: §4.4 UPDATE deleted_at + §4.6 message
      const result = await service.deleteAccount(5, adminSession(), baseReq);

      expect(result).toMatchObject({ message: '削除しました。' });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should revoke ALL Redis sessions of the deleted account (de-provisioning) when delete succeeds', async () => {
      // COVERS: security — 削除アカウントの cookie セッションを即時無効化
      await service.deleteAccount(5, adminSession(), baseReq);

      expect(
        (service as any).sessionService.destroyAllForAccount,
      ).toHaveBeenCalledWith(5);
    });

    it('should still return success when session revocation (Redis) fails after commit', async () => {
      // COVERS: revocation is best-effort — a Redis error MUST NOT fail the
      // already-committed delete.
      (service as any).sessionService.destroyAllForAccount.mockRejectedValueOnce(
        new Error('redis down'),
      );

      const result = await service.deleteAccount(5, adminSession(), baseReq);
      expect(result).toMatchObject({ message: '削除しました。' });
    });

    it('should throw NotFoundException when target account_id does not exist', async () => {
      // COVERS: §4.3 レコード存在しない場合 → 404
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteAccount(999, adminSession(), baseReq),
      ).rejects.toThrow(NotFoundException);

      // No sessions destroyed when the target doesn't exist.
      expect(
        (service as any).sessionService.destroyAllForAccount,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when target account_id is already soft-deleted', async () => {
      // COVERS: §4.3 deleted_at IS NULL filter — already-deleted row returns null
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteAccount(5, adminSession(), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when t_mfa_otp has unused, unexpired related rows', async () => {
      // COVERS: §4.3 related-data check — active MFA OTP exists
      dataSource.query = jest.fn(async (sql: string) => {
        if (/t_mfa_otp/i.test(sql)) return [{ related_count: '1' }];
        return [{ related_count: '0' }];
      });

      await expect(
        service.deleteAccount(5, adminSession(), baseReq),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'CONFLICT' }),
      });
    });

    it('should throw ConflictException with project-canonical message when related data exists', async () => {
      // COVERS: エラー一覧 row CONFLICT message wording
      dataSource.query = jest.fn().mockResolvedValue([{ related_count: '3' }]);

      await expect(
        service.deleteAccount(5, adminSession(), baseReq),
      ).rejects.toThrow(ConflictException);
    });

    it('should wrap soft-delete + audit log in a single transaction when delete succeeds', async () => {
      // COVERS: transaction boundary — §4.4 UPDATE + §4.5 audit log share one tx
      await service.deleteAccount(5, adminSession(), baseReq);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logOperation).toHaveBeenCalled();
    });

    it('should call AuditLogService.logOperation with bare DELETE operation when delete succeeds', async () => {
      // COVERS: §4.5 操作ログ — operation MUST be bare 'DELETE', NEVER 'ACCOUNT_DELETE'
      await service.deleteAccount(5, adminSession(), baseReq);

      const successLogCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'DELETE' && p.resultStatus === 1,
      );
      expect(successLogCall).toBeDefined();
      expect(successLogCall[0]).toMatchObject({
        logType: 1,
        accountId: 100, // caller account_id from adminSession()
        operation: 'DELETE',
        resultStatus: 1,
        targetTable: 'm_account',
        targetId: 5,
        beforeValue: expect.any(String),
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });
    });

    it('should populate before_value with pre-deletion snapshot when delete succeeds', async () => {
      // COVERS: §4.5 — before_value JSON contains the deleted row
      await service.deleteAccount(5, adminSession(), baseReq);

      const call = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'DELETE' && p.resultStatus === 1,
      );
      const beforeJson = call[0].beforeValue;
      expect(typeof beforeJson).toBe('string');
      const parsed = JSON.parse(beforeJson);
      const flat = JSON.stringify(parsed);
      expect(flat).toMatch(/ja_shiten001|JA管理支店/);
    });

    it('should NOT include password_hash in the audit before_value snapshot when delete succeeds', async () => {
      // COVERS: §4.5 注記 — password_hash 等の機密情報は含めないこと
      await service.deleteAccount(5, adminSession(), baseReq);

      const call = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'DELETE' && p.resultStatus === 1,
      );
      expect(call[0].beforeValue).not.toMatch(/password_?hash/i);
    });

    it('should rollback and NOT persist when audit log fails inside transaction', async () => {
      // COVERS: transaction rollback — audit failure rolls back the soft-delete
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit down'));
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          txManager.committed = false;
          throw err;
        }
      });

      await expect(
        service.deleteAccount(5, adminSession(), baseReq),
      ).rejects.toBeDefined();
      expect(txManager.committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when DELETE fails', async () => {
      // COVERS: §4.7 例外処理 — error log runs after rollback
      dataSource.transaction.mockImplementation(async () => {
        throw new Error('DB down');
      });

      await expect(
        service.deleteAccount(5, adminSession(), baseReq),
      ).rejects.toBeDefined();

      const errorCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.logType === 3 && p.resultStatus === 2,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0]).toMatchObject({
        logType: 3,
        resultStatus: 2,
        operation: 'DELETE',
        targetTable: 'm_account',
        targetId: 5,
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-025 — アカウントマスタ登録画面 (detail + create + update). Sibling
// top-level describe so its audit-log helper signatures (logCreate /
// logUpdate / logError) don't leak into the SCR-024 or header MFA
// blocks above.
// ═══════════════════════════════════════════════════════════════════════

describe('AccountService — SCR-025 (detail + create + update)', () => {
  let service: any;
  let accountRepo: any;
  let qbMock: any;
  let auditLog: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  const adminSession = () =>
    buildSession({
      account_id: 100,
      login_id: 'admin01',
      role_id: 1,
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      kanri_shiten_id: null,
      permissions: ['account.view', 'account.create', 'account.update'],
    });

  beforeEach(() => {
    qbMock = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    accountRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock),
    };

    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      async logCreate(ctx: any, after: unknown, _mgr?: unknown) {
        return this.logOperation({
          logType: 1,
          accountId: ctx.accountId,
          jaId: ctx.jaId,
          gamenName: ctx.screen,
          operation: 'CREATE',
          resultStatus: 1,
          targetId: ctx.targetId,
          targetTable: ctx.table,
          afterValue: JSON.stringify(after),
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      },
      async logUpdate(ctx: any, before: unknown, after: unknown, _mgr?: unknown) {
        return this.logOperation({
          logType: 1,
          accountId: ctx.accountId,
          jaId: ctx.jaId,
          gamenName: ctx.screen,
          operation: 'UPDATE',
          resultStatus: 1,
          targetId: ctx.targetId,
          targetTable: ctx.table,
          beforeValue: JSON.stringify(before),
          afterValue: JSON.stringify(after),
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      },
      async logError(ctx: any, operation: string, err: Error) {
        return this.logOperation({
          logType: 3,
          accountId: ctx.accountId,
          jaId: ctx.jaId,
          gamenName: ctx.screen,
          operation,
          resultStatus: 2,
          targetId: ctx.targetId,
          targetTable: ctx.table,
          errorMessage: err.message,
          stackTrace: err.stack ?? '',
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      },
    };

    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        return { ...value, accountId: value.accountId ?? 15 };
      }),
      softRemove: jest.fn(async (entity: any) => entity),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn(async () => []),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => []),
    };

    const kanriShitenRepo: any = {
      findOne: jest.fn().mockResolvedValue({ kanriShitenId: 1, jaId: 1 }),
    };
    // role_id → role_code resolver. Default mirrors the seed migration
    // (1=NICHINO_ADMIN, 2=NICHINO_STAFF, 3=CHUOKAI, 4=JA_HONTEN,
    // 5=JA_KANRI_SHITEN). Specs that want a "role not found" 400 path
    // can override with `.mockResolvedValueOnce(null)`.
    const ROLE_CODE_BY_ID: Record<number, string> = {
      1: 'NICHINO_ADMIN',
      2: 'NICHINO_STAFF',
      3: 'CHUOKAI',
      4: 'JA_HONTEN',
      5: 'JA_KANRI_SHITEN',
    };
    const roleRepo: any = {
      findOne: jest.fn(({ where }: any) => {
        const code = ROLE_CODE_BY_ID[where?.roleId as number];
        return Promise.resolve(code ? { roleCode: code } : null);
      }),
    };
    const shitenRepo: any = { findOne: jest.fn().mockResolvedValue({ shitenId: 1, kanriShitenId: 1, jaId: 1 }) };
    const sessionService: any = {
      destroyAllForAccount: jest.fn().mockResolvedValue(0),
    };
    service = new AccountService(accountRepo, auditLog, dataSource, kanriShitenRepo, shitenRepo, roleRepo, sessionService);
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-025-001 — GET /api/v1/accounts/:account_id (getAccountDetail)
  // ───────────────────────────────────────────────────────────────────
  describe('getAccountDetail', () => {
    it('should return joined detail row with all m_account columns when account exists', async () => {
      // COVERS: §4.3 SELECT a.* LEFT JOIN role/todofuken/ja/kanri_shiten
      qbMock.getRawOne.mockResolvedValue({
        account_id: 2,
        login_id: 'ja_honten001',
        account_name: 'JA本店 花子',
        role_id: 4,
        role_name: 'JA本店',
        todofuken_code: '13',
        todofuken_name: '東京都',
        ja_id: 10,
        ja_name: 'JA東京中央',
        kanri_shiten_id: null,
        kanri_shiten_name: null,
        email: 'honten001@example.com',
        sub_email_1: 'honten001.sub1@example.com',
        sub_email_2: '',
        sub_email_3: '',
        paper_flg: true,
        denshi_flg: true,
        biko: '',
        created_at: new Date('2026-02-01T09:00:00Z'),
        updated_at: new Date('2026-03-15T11:00:00Z'),
      });

      const result = await service.getAccountDetail(2, adminSession());

      expect(result.data).toMatchObject({
        account_id: 2,
        login_id: 'ja_honten001',
        account_name: 'JA本店 花子',
        role_id: 4,
        role_name: 'JA本店',
        todofuken_code: '13',
        todofuken_name: '東京都',
        ja_id: 10,
        ja_name: 'JA東京中央',
        email: 'honten001@example.com',
        sub_email_1: 'honten001.sub1@example.com',
        sub_email_2: '',
        sub_email_3: '',
        paper_flg: true,
        denshi_flg: true,
      });
    });

    it('should NOT include password_hash in the detail response when account exists', async () => {
      // SECURITY — password_hash must never leave the BE.
      qbMock.getRawOne.mockResolvedValue({
        account_id: 2,
        login_id: 'ja_honten001',
        account_name: 'JA本店 花子',
        role_id: 4,
        role_name: 'JA本店',
        email: 'x@y.com',
        sub_email_1: '',
        sub_email_2: '',
        sub_email_3: '',
        paper_flg: false,
        denshi_flg: false,
        biko: '',
        created_at: new Date(),
        updated_at: null,
      });

      const result = await service.getAccountDetail(2, adminSession());
      expect(JSON.stringify(result)).not.toMatch(/password_?hash/i);
    });

    it('should filter deleted_at IS NULL when querying for the detail row', async () => {
      // COVERS: §4.3 — a.deleted_at IS NULL
      qbMock.getRawOne.mockResolvedValue(null);

      try {
        await service.getAccountDetail(2, adminSession());
      } catch {
        /* expected — null result throws below */
      }

      const allSql = [
        ...qbMock.where.mock.calls,
        ...qbMock.andWhere.mock.calls,
      ]
        .map(([sql]: any[]) => (typeof sql === 'string' ? sql : ''))
        .join(' ');
      expect(allSql).toMatch(/deleted_?at\s+IS\s+NULL/i);
    });

    it('should throw NotFoundException when account_id does not exist (§4.3 → 404)', async () => {
      qbMock.getRawOne.mockResolvedValue(null);

      await expect(
        service.getAccountDetail(999, adminSession()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when account is already soft-deleted', async () => {
      // Same as missing — deleted_at IS NULL filter returns nothing.
      qbMock.getRawOne.mockResolvedValue(null);

      await expect(
        service.getAccountDetail(2, adminSession()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-025-002 — POST /api/v1/accounts (createAccount)
  // ───────────────────────────────────────────────────────────────────
  describe('createAccount', () => {
    beforeEach(() => {
      // Default: login_id is unique.
      accountRepo.count.mockResolvedValue(0);
      // The transaction's INSERT returns a hydrated row with a fresh id.
      txManager.save.mockImplementation(async (_e: any, v: any) => ({
        ...v,
        accountId: 15,
      }));
      // After-INSERT detail SELECT inside the same tx returns the joined row.
      txManager.findOne.mockResolvedValue(
        buildAccountFormEntity({ accountId: 15 }),
      );
      qbMock.getRawOne.mockResolvedValue({
        account_id: 15,
        login_id: 'ja_honten001',
        account_name: 'JA本店 花子',
        role_id: 4,
        role_name: 'JA本店',
        todofuken_code: '13',
        todofuken_name: '東京都',
        ja_id: 10,
        ja_name: 'JA東京中央',
        kanri_shiten_id: null,
        kanri_shiten_name: null,
        email: 'honten001@example.com',
        sub_email_1: 'honten001.sub1@example.com',
        sub_email_2: '',
        sub_email_3: '',
        paper_flg: true,
        denshi_flg: true,
        biko: '',
        created_at: new Date(),
        updated_at: null,
      });
    });

    it('should INSERT and return the new account when NICHINO_ADMIN submits valid input', async () => {
      // COVERS: §4.4 INSERT + §4.6 レスポンス生成
      const result = await service.createAccount(
        buildCreateAccountBody(),
        adminSession(),
        baseReq,
      );

      expect(result.data).toMatchObject({
        account_id: 15,
        login_id: 'ja_honten001',
        role_id: 4,
        sub_email_1: 'honten001.sub1@example.com',
      });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw DuplicateCodeException when login_id already exists', async () => {
      // COVERS: §4.3 重複チェック
      accountRepo.count.mockResolvedValue(1);

      await expect(
        service.createAccount(buildCreateAccountBody(), adminSession(), baseReq),
      ).rejects.toThrow(DuplicateCodeException);
    });

    it('should bcrypt-hash the password before persisting when CREATE is called', async () => {
      // COVERS: §4.4 — bcrypt(round=10) hashing
      await service.createAccount(
        buildCreateAccountBody({ password: 'Password123!' }),
        adminSession(),
        baseReq,
      );

      const insertCall = txManager.save.mock.calls[0];
      const savedRow = insertCall[insertCall.length - 1];
      expect(savedRow.passwordHash).toBeDefined();
      expect(savedRow.passwordHash).not.toBe('Password123!');
      // bcrypt hashes start with $2a / $2b — accept any version digit.
      expect(savedRow.passwordHash).toMatch(/^\$2[abxy]\$/);
    });

    it('should set initial values (login_failure_count=0, account_lock_flg=false, mfa_enable_flg=false) when creating', async () => {
      // COVERS: §4.4 注記 — 初期値
      await service.createAccount(
        buildCreateAccountBody(),
        adminSession(),
        baseReq,
      );

      const insertCall = txManager.save.mock.calls[0];
      const savedRow = insertCall[insertCall.length - 1];
      expect(savedRow.loginFailureCount).toBe(0);
      expect(savedRow.accountLockFlg).toBe(false);
      expect(savedRow.mfaEnableFlg).toBe(false);
    });

    it('should persist all 3 sub_email_* fields when CREATE body includes them', async () => {
      // COVERS: 新規追加されたカラム
      await service.createAccount(
        buildCreateAccountBody({
          sub_email_1: 'a@example.com',
          sub_email_2: 'b@example.com',
          sub_email_3: 'c@example.com',
        }),
        adminSession(),
        baseReq,
      );

      const insertCall = txManager.save.mock.calls[0];
      const savedRow = insertCall[insertCall.length - 1];
      expect(savedRow.subEmail1).toBe('a@example.com');
      expect(savedRow.subEmail2).toBe('b@example.com');
      expect(savedRow.subEmail3).toBe('c@example.com');
    });

    it('should set todofuken_code / ja_id / kanri_shiten_id to NULL when role_id=1 (日農管理者)', async () => {
      // COVERS: §4.4 注記 — role_id=1,2 の場合、scope columns を NULL
      await service.createAccount(
        buildCreateAccountBody({
          role_id: 1,
          todofuken_code: '13',
          ja_id: 10,
          kanri_shiten_id: 20,
        }),
        adminSession(),
        baseReq,
      );

      const insertCall = txManager.save.mock.calls[0];
      const savedRow = insertCall[insertCall.length - 1];
      expect(savedRow.todofukenCode).toBeNull();
      expect(savedRow.jaId).toBeNull();
      expect(savedRow.kanriShitenId).toBeNull();
    });

    it('should wrap INSERT + audit log in a single transaction when create succeeds', async () => {
      // COVERS: transaction boundary
      await service.createAccount(
        buildCreateAccountBody(),
        adminSession(),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logOperation).toHaveBeenCalled();
    });

    it('should call AuditLogService.logOperation with bare CREATE operation when create succeeds', async () => {
      // COVERS: §4.5 — operation MUST be bare 'CREATE'
      await service.createAccount(
        buildCreateAccountBody(),
        adminSession(),
        baseReq,
      );

      const successLogCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'CREATE' && p.resultStatus === 1,
      );
      expect(successLogCall).toBeDefined();
      expect(successLogCall[0]).toMatchObject({
        logType: 1,
        accountId: 100,
        operation: 'CREATE',
        resultStatus: 1,
        targetTable: 'm_account',
        afterValue: expect.any(String),
      });
    });

    it('should NOT include password_hash in the audit after_value when create succeeds', async () => {
      // COVERS: §4.5 注記 — パスワード等の機密情報は含めないこと
      await service.createAccount(
        buildCreateAccountBody(),
        adminSession(),
        baseReq,
      );

      const successLogCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'CREATE' && p.resultStatus === 1,
      );
      expect(successLogCall[0].afterValue).not.toMatch(/password_?hash/i);
    });

    it('should rollback and NOT persist when audit log fails inside transaction', async () => {
      // COVERS: rollback contract
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit down'));
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          (txManager as any).committed = false;
          throw err;
        }
      });

      await expect(
        service.createAccount(buildCreateAccountBody(), adminSession(), baseReq),
      ).rejects.toBeDefined();
      expect((txManager as any).committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when CREATE fails', async () => {
      // COVERS: §4.7 — error log runs after rollback
      dataSource.transaction.mockImplementation(async () => {
        throw new Error('DB down');
      });

      await expect(
        service.createAccount(buildCreateAccountBody(), adminSession(), baseReq),
      ).rejects.toBeDefined();

      const errorCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.logType === 3 && p.resultStatus === 2,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0]).toMatchObject({
        logType: 3,
        resultStatus: 2,
        operation: 'CREATE',
        targetTable: 'm_account',
      });
    });

    // ─── 所属支店(shiten_id) — 顧客要件2026-07 ───────────────────────
    it('should persist shiten_id when the created account is JA_KANRI_SHITEN and the 支店 is within its 管理支店', async () => {
      await service.createAccount(
        buildCreateAccountBody({
          role_id: 5,
          ja_id: 1,
          kanri_shiten_id: 1,
          shiten_id: 1,
        }),
        adminSession(),
        baseReq,
      );

      const insertCall = txManager.save.mock.calls[0];
      const savedRow = insertCall[insertCall.length - 1];
      expect(Number(savedRow.shitenId)).toBe(1);
    });

    it('should force shiten_id to null when the created account is NOT JA_KANRI_SHITEN even if a shiten_id is submitted', async () => {
      await service.createAccount(
        buildCreateAccountBody({ role_id: 4, ja_id: 1, shiten_id: 1 }),
        adminSession(),
        baseReq,
      );

      const insertCall = txManager.save.mock.calls[0];
      const savedRow = insertCall[insertCall.length - 1];
      expect(savedRow.shitenId).toBeNull();
    });

    it('should throw ValidationException when the shiten_id does not belong to the account 管理支店', async () => {
      // shiten row resolves with kanriShitenId=1 (default mock), but the DTO
      // pins kanri_shiten_id=2 → mismatch → 支店 not under the 管理支店.
      await expect(
        service.createAccount(
          buildCreateAccountBody({
            role_id: 5,
            ja_id: 1,
            kanri_shiten_id: 2,
            shiten_id: 1,
          }),
          adminSession(),
          baseReq,
        ),
      ).rejects.toThrow(ValidationException);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-025-003 — PUT /api/v1/accounts/:account_id (updateAccount)
  // ───────────────────────────────────────────────────────────────────
  describe('updateAccount', () => {
    beforeEach(() => {
      const before = buildAccountFormEntity({ accountId: 2 });
      accountRepo.findOne.mockResolvedValue(before);
      txManager.findOne.mockResolvedValue(before);
      txManager.update.mockResolvedValue({ affected: 1 });
      qbMock.getRawOne.mockResolvedValue({
        account_id: 2,
        login_id: 'ja_honten001',
        account_name: 'JA本店 花子（更新）',
        role_id: 4,
        role_name: 'JA本店',
        todofuken_code: '13',
        todofuken_name: '東京都',
        ja_id: 10,
        ja_name: 'JA東京中央',
        kanri_shiten_id: null,
        kanri_shiten_name: null,
        email: 'honten001_new@example.com',
        sub_email_1: 'honten001.sub1_new@example.com',
        sub_email_2: 'manager@example.com',
        sub_email_3: '',
        paper_flg: true,
        denshi_flg: true,
        biko: '備考を追加しました',
        created_at: new Date('2026-02-01T09:00:00Z'),
        updated_at: new Date('2026-04-14T14:30:00Z'),
      });
    });

    it('should UPDATE and return the refreshed account when NICHINO_ADMIN submits valid input', async () => {
      const result = await service.updateAccount(
        2,
        buildUpdateAccountBody(),
        adminSession(),
        baseReq,
      );

      expect(result.data).toMatchObject({
        account_id: 2,
        account_name: 'JA本店 花子（更新）',
        email: 'honten001_new@example.com',
        sub_email_1: 'honten001.sub1_new@example.com',
        sub_email_2: 'manager@example.com',
      });
    });

    it('should throw NotFoundException when target account_id does not exist', async () => {
      // COVERS: §4.3 → 404
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateAccount(999, buildUpdateAccountBody(), adminSession(), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT update password_hash when password is empty string (空欄=変更しない)', async () => {
      // COVERS: §4.4 — password が空欄の場合は変更しない
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ password: '' }),
        adminSession(),
        baseReq,
      );

      const updateCalls = txManager.update.mock.calls;
      const updatedFields = updateCalls.flatMap((c: any[]) => {
        const partial = c[c.length - 1];
        return partial && typeof partial === 'object' ? Object.keys(partial) : [];
      });
      expect(updatedFields).not.toContain('passwordHash');
      expect(updatedFields).not.toContain('passwordUpdatedAt');
    });

    it('should bcrypt-hash and update password_updated_at when password is provided', async () => {
      // COVERS: §4.4 — password 入力時のみ bcrypt + password_updated_at 更新
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ password: 'NewPass123!' }),
        adminSession(),
        baseReq,
      );

      const updateCalls = txManager.update.mock.calls;
      const merged = updateCalls.reduce(
        (acc: any, c: any[]) => ({ ...acc, ...(c[c.length - 1] ?? {}) }),
        {},
      );
      expect(merged.passwordHash).toBeDefined();
      expect(merged.passwordHash).not.toBe('NewPass123!');
      expect(merged.passwordHash).toMatch(/^\$2[abxy]\$/);
      expect(merged.passwordUpdatedAt).toBeDefined();
    });

    // ─── session revocation on security-sensitive updates (de-provisioning) ───
    it('should revoke sessions when admin LOCKS the account (account_lock_flg=true)', async () => {
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ account_lock_flg: true }),
        adminSession(),
        baseReq,
      );
      expect(
        (service as any).sessionService.destroyAllForAccount,
      ).toHaveBeenCalledWith(2);
    });

    it('should revoke sessions when password is changed (admin-forced reset)', async () => {
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ password: 'NewPass123!' }),
        adminSession(),
        baseReq,
      );
      expect(
        (service as any).sessionService.destroyAllForAccount,
      ).toHaveBeenCalledWith(2);
    });

    it('should revoke sessions when the role (privilege set) changes', async () => {
      // before.roleId=4 (JA本店) → 3 (中央会): privilege change.
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ role_id: 3 }),
        adminSession(),
        baseReq,
      );
      expect(
        (service as any).sessionService.destroyAllForAccount,
      ).toHaveBeenCalledWith(2);
    });

    it('should NOT revoke sessions on a non-sensitive update (name/email/biko only, unlock)', async () => {
      // Default body keeps role_id=4, ja_id=10, kanri_shiten_id=null (same as
      // before), password blank, account_lock_flg=false → no security-sensitive
      // change → live sessions must NOT be destroyed.
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ account_lock_flg: false }),
        adminSession(),
        baseReq,
      );
      expect(
        (service as any).sessionService.destroyAllForAccount,
      ).not.toHaveBeenCalled();
    });

    it('should reset login_failure_count to 0 AND account_lock_at to null when admin unlocks (account_lock_flg=false)', async () => {
      // COVERS: QA bug 2026-05 — unlock left account_lock_at frozen
      // at the lock timestamp. Operator reading m_account couldn't
      // tell "currently locked since X" from "previously locked at X
      // but now unlocked". Fix: reset the timestamp alongside the flg
      // + counter so the column means exactly "currently locked since".
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ account_lock_flg: false }),
        adminSession(),
        baseReq,
      );

      const updateCalls = txManager.update.mock.calls;
      const merged = updateCalls.reduce(
        (acc: any, c: any[]) => ({ ...acc, ...(c[c.length - 1] ?? {}) }),
        {},
      );
      expect(merged.accountLockFlg).toBe(false);
      expect(merged.loginFailureCount).toBe(0);
      expect(merged.accountLockAt).toBeNull();
    });

    it('should NOT touch account_lock_at when admin LOCKS (account_lock_flg=true)', async () => {
      // COVERS: lock direction stays controlled by auth.service.ts
      // (sets account_lock_at = NOW() at threshold breach). Admin
      // forcibly setting account_lock_flg=true via the form should
      // NOT clear the timestamp from a prior auto-lock.
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ account_lock_flg: true }),
        adminSession(),
        baseReq,
      );

      const updateCalls = txManager.update.mock.calls;
      const merged = updateCalls.reduce(
        (acc: any, c: any[]) => ({ ...acc, ...(c[c.length - 1] ?? {}) }),
        {},
      );
      expect(merged.accountLockFlg).toBe(true);
      // The unlock-side resets are absent here:
      expect(merged.loginFailureCount).toBeUndefined();
      expect(merged.accountLockAt).toBeUndefined();
    });

    it('should set todofuken_code / ja_id / kanri_shiten_id to NULL when role_id changes to 1 (日農管理者)', async () => {
      // COVERS: §4.4 注記 — role_id=1,2 の場合、scope columns を NULL
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ role_id: 1, todofuken_code: '13', ja_id: 10 }),
        adminSession(),
        baseReq,
      );

      const updateCalls = txManager.update.mock.calls;
      const merged = updateCalls.reduce(
        (acc: any, c: any[]) => ({ ...acc, ...(c[c.length - 1] ?? {}) }),
        {},
      );
      expect(merged.todofukenCode).toBeNull();
      expect(merged.jaId).toBeNull();
      expect(merged.kanriShitenId).toBeNull();
    });

    it('should persist all 3 sub_email_* fields when UPDATE body includes them', async () => {
      await service.updateAccount(
        2,
        buildUpdateAccountBody({
          sub_email_1: 'x@example.com',
          sub_email_2: 'y@example.com',
          sub_email_3: 'z@example.com',
        }),
        adminSession(),
        baseReq,
      );

      const updateCalls = txManager.update.mock.calls;
      const merged = updateCalls.reduce(
        (acc: any, c: any[]) => ({ ...acc, ...(c[c.length - 1] ?? {}) }),
        {},
      );
      expect(merged.subEmail1).toBe('x@example.com');
      expect(merged.subEmail2).toBe('y@example.com');
      expect(merged.subEmail3).toBe('z@example.com');
    });

    it('should wrap UPDATE + audit log in a single transaction when update succeeds', async () => {
      await service.updateAccount(
        2,
        buildUpdateAccountBody(),
        adminSession(),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logOperation).toHaveBeenCalled();
    });

    it('should call AuditLogService.logOperation with bare UPDATE operation when update succeeds', async () => {
      // COVERS: §4.5 — operation MUST be bare 'UPDATE'
      await service.updateAccount(
        2,
        buildUpdateAccountBody(),
        adminSession(),
        baseReq,
      );

      const successLogCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'UPDATE' && p.resultStatus === 1,
      );
      expect(successLogCall).toBeDefined();
      expect(successLogCall[0]).toMatchObject({
        logType: 1,
        operation: 'UPDATE',
        resultStatus: 1,
        targetTable: 'm_account',
        targetId: 2,
        beforeValue: expect.any(String),
        afterValue: expect.any(String),
      });
    });

    it('should NOT include password_hash in the audit before_value or after_value when update succeeds', async () => {
      // COVERS: §4.5 注記 — パスワード等の機密情報は含めないこと
      await service.updateAccount(
        2,
        buildUpdateAccountBody({ password: 'NewPass123!' }),
        adminSession(),
        baseReq,
      );

      const successLogCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'UPDATE' && p.resultStatus === 1,
      );
      expect(successLogCall[0].beforeValue).not.toMatch(/password_?hash/i);
      expect(successLogCall[0].afterValue).not.toMatch(/password_?hash/i);
    });

    it('should rollback and NOT persist when audit log fails inside transaction', async () => {
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit down'));
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          (txManager as any).committed = false;
          throw err;
        }
      });

      await expect(
        service.updateAccount(2, buildUpdateAccountBody(), adminSession(), baseReq),
      ).rejects.toBeDefined();
      expect((txManager as any).committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when UPDATE fails', async () => {
      dataSource.transaction.mockImplementation(async () => {
        throw new Error('DB down');
      });

      await expect(
        service.updateAccount(2, buildUpdateAccountBody(), adminSession(), baseReq),
      ).rejects.toBeDefined();

      const errorCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.logType === 3 && p.resultStatus === 2,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0]).toMatchObject({
        logType: 3,
        resultStatus: 2,
        operation: 'UPDATE',
        targetTable: 'm_account',
        targetId: 2,
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// COMMON-005 — AccountService.getAccountDropdown (consumed by SCR-030
// ログ参照画面). Sibling top-level describe so its smaller QB shape and
// DataScope-only mock surface stay isolated from SCR-024 / SCR-025.
// ═══════════════════════════════════════════════════════════════════════

describe('AccountService.getAccountDropdown (COMMON-005)', () => {
  let service: AccountService;
  let accountRepo: any;
  let auditLog: any;
  let dataSource: any;
  let qbMock: any;

  beforeEach(() => {
    qbMock = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      // [pagination] Service builds a paginated SELECT (limit/offset) and
      // a separate scoped count query — both go through the same
      // createQueryBuilder factory so qbMock is reused; getCount/getRawOne
      // must be present on the shared mock.
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
    };
    accountRepo = {
      createQueryBuilder: jest.fn(() => qbMock),
      findOne: jest.fn(),
    };
    auditLog = { logUpdate: jest.fn(), logError: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const kanriShitenRepo: any = {
      findOne: jest.fn().mockResolvedValue({ kanriShitenId: 1, jaId: 1 }),
    };
    // role_id → role_code resolver. Default mirrors the seed migration
    // (1=NICHINO_ADMIN, 2=NICHINO_STAFF, 3=CHUOKAI, 4=JA_HONTEN,
    // 5=JA_KANRI_SHITEN). Specs that want a "role not found" 400 path
    // can override with `.mockResolvedValueOnce(null)`.
    const ROLE_CODE_BY_ID: Record<number, string> = {
      1: 'NICHINO_ADMIN',
      2: 'NICHINO_STAFF',
      3: 'CHUOKAI',
      4: 'JA_HONTEN',
      5: 'JA_KANRI_SHITEN',
    };
    const roleRepo: any = {
      findOne: jest.fn(({ where }: any) => {
        const code = ROLE_CODE_BY_ID[where?.roleId as number];
        return Promise.resolve(code ? { roleCode: code } : null);
      }),
    };
    const shitenRepo: any = { findOne: jest.fn().mockResolvedValue({ shitenId: 1, kanriShitenId: 1, jaId: 1 }) };
    const sessionService: any = {
      destroyAllForAccount: jest.fn().mockResolvedValue(0),
    };
    service = new AccountService(accountRepo, auditLog, dataSource, kanriShitenRepo, shitenRepo, roleRepo, sessionService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should return data array with account_id, login_id, account_name, role_code, ja_id when called', async () => {
    qbMock.getRawMany.mockResolvedValue([
      {
        account_id: 10,
        login_id: 'ja_honten_001',
        account_name: 'JA本店 太郎',
        role_code: 'JA_HONTEN',
        ja_id: 100,
      },
    ]);
    qbMock.getCount.mockResolvedValue(1);

    const result = await service.getAccountDropdown({}, buildSession());

    expect(result.data).toEqual([
      {
        account_id: 10,
        login_id: 'ja_honten_001',
        account_name: 'JA本店 太郎',
        role_code: 'JA_HONTEN',
        ja_id: 100,
      },
    ]);
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      per_page: 50,
      has_more: false,
    });
  });

  it('should apply NO DataScope predicate when session role_code is NICHINO_ADMIN (bypass)', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    await service.getAccountDropdown({}, buildSession());

    const calls = qbMock.andWhere.mock.calls;
    const scopedCall = calls.find(
      ([_sql, params]: any[]) =>
        params &&
        (Object.prototype.hasOwnProperty.call(params, 'scopeJaId') ||
          Object.prototype.hasOwnProperty.call(params, 'scopeKanriShitenId') ||
          Object.prototype.hasOwnProperty.call(params, 'ja_id') ||
          Object.prototype.hasOwnProperty.call(params, 'kanri_shiten_id')),
    );
    expect(scopedCall).toBeUndefined();
  });

  it('should apply NO DataScope predicate when session role_code is NICHINO_STAFF (bypass)', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    await service.getAccountDropdown(
      {},
      buildSession({ role_code: 'NICHINO_STAFF', role_id: 2 }),
    );

    const calls = qbMock.andWhere.mock.calls;
    const scopedCall = calls.find(
      ([_sql, params]: any[]) =>
        params &&
        (Object.prototype.hasOwnProperty.call(params, 'scopeJaId') ||
          Object.prototype.hasOwnProperty.call(params, 'scopeKanriShitenId') ||
          Object.prototype.hasOwnProperty.call(params, 'ja_id') ||
          Object.prototype.hasOwnProperty.call(params, 'kanri_shiten_id')),
    );
    expect(scopedCall).toBeUndefined();
  });

  it('should bind a.ja_id scope predicate when session role_code is CHUOKAI', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    await service.getAccountDropdown({}, buildChuokaiSession({ ja_id: 7 }));

    const scopedCall = qbMock.andWhere.mock.calls.find(
      ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
    );
    expect(scopedCall).toBeDefined();
  });

  it('should bind a.ja_id scope predicate when session role_code is JA_HONTEN', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    await service.getAccountDropdown({}, buildJaHontenSession({ ja_id: 9 }));

    const scopedCall = qbMock.andWhere.mock.calls.find(
      ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
    );
    expect(scopedCall).toBeDefined();
  });

  it('should bind a.kanri_shiten_id scope predicate when session role_code is JA_KANRI_SHITEN', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    await service.getAccountDropdown(
      {},
      buildJaKanriShitenSession({ kanri_shiten_id: 33 }),
    );

    const scopedCall = qbMock.andWhere.mock.calls.find(
      ([sql]: any[]) => typeof sql === 'string' && /\bkanri_?[Ss]hiten_?[Ii]d\b/.test(sql),
    );
    expect(scopedCall).toBeDefined();
  });

  it('should order results by login_id ASC when called', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    await service.getAccountDropdown({}, buildSession());

    const orderCall = qbMock.orderBy.mock.calls[0];
    expect(orderCall[0]).toMatch(/login_id/i);
    expect(orderCall[1]).toBe('ASC');
  });

  it('should return data:[] when repository returns no rows', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    const result = await service.getAccountDropdown({}, buildSession());

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({
      total: 0,
      page: 1,
      per_page: 50,
      has_more: false,
    });
  });

  // [match-field] SCR-030 log view's ユーザ名 filter scopes ILIKE to
  // account_name only — a hit on login_id would be invisible to the
  // user and read as a bug.
  it('should scope ILIKE to account_name only when match_field=name', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    await service.getAccountDropdown(
      { q: '太郎', match_field: 'name' },
      buildSession(),
    );

    const nameOnly = qbMock.andWhere.mock.calls.find(
      ([sql]: any[]) =>
        typeof sql === 'string' &&
        sql.includes('account_name ILIKE') &&
        !sql.includes('login_id'),
    );
    expect(nameOnly).toBeDefined();
    expect(nameOnly![1]).toEqual({ q: '%太郎%' });

    const orCall = qbMock.andWhere.mock.calls.find(
      ([sql]: any[]) =>
        typeof sql === 'string' &&
        sql.includes('login_id ILIKE') &&
        sql.includes('OR'),
    );
    expect(orCall).toBeUndefined();
  });

  it('should issue an OR-matched ILIKE on login_id and account_name by default when q is provided', async () => {
    qbMock.getRawMany.mockResolvedValue([]);

    await service.getAccountDropdown({ q: 'admin' }, buildSession());

    const orCall = qbMock.andWhere.mock.calls.find(
      ([sql]: any[]) =>
        typeof sql === 'string' &&
        sql.includes('login_id ILIKE') &&
        sql.includes('OR') &&
        sql.includes('account_name ILIKE'),
    );
    expect(orCall).toBeDefined();
    expect(orCall![1]).toEqual({ q: '%admin%' });
  });

  it('should apply limit + offset and report has_more from total when paginated', async () => {
    qbMock.getRawMany.mockResolvedValue([]);
    qbMock.getCount.mockResolvedValue(137);

    const result = await service.getAccountDropdown(
      { page: 2, per_page: 50 },
      buildSession(),
    );

    expect(qbMock.limit).toHaveBeenCalledWith(50);
    expect(qbMock.offset).toHaveBeenCalledWith(50);
    expect(result.meta).toEqual({
      total: 137,
      page: 2,
      per_page: 50,
      has_more: true,
    });
  });

  it('should prepend include_id row when it is not in the current page slice', async () => {
    qbMock.getRawMany.mockResolvedValue([
      { account_id: 1, login_id: 'a001', account_name: 'A', role_code: 'JA_HONTEN', ja_id: 1 },
      { account_id: 2, login_id: 'a002', account_name: 'B', role_code: 'JA_HONTEN', ja_id: 1 },
    ]);
    qbMock.getCount.mockResolvedValue(250);
    qbMock.getRawOne.mockResolvedValue({
      account_id: 99,
      login_id: 'pinned',
      account_name: 'Pinned User',
      role_code: 'JA_HONTEN',
      ja_id: 1,
    });

    const result = await service.getAccountDropdown(
      { include_id: 99 },
      buildSession(),
    );

    expect(result.data[0]).toMatchObject({ account_id: 99, login_id: 'pinned' });
    expect(result.data).toHaveLength(3);
  });
});

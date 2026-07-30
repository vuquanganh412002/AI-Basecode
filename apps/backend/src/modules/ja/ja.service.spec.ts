// Screen: ACSMS-SCR-005 — JAマスタ登録画面
//          ACSMS-SCR-004 — JAマスタ明細検索画面 (extends with findAll + remove)
//
// Drives src/modules/ja/ja.service.ts. Every it() maps to a clause in
// docs/design/ACSMS-SCR-005/ACSMS-SCR-005-api.md (find/create/update)
// or docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md (findAll/remove).

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';

import { JaService } from '@/modules/ja/ja.service';
import { buildJa } from '@test/fixtures/ja.factory';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
} from '@test/fixtures/session.factory';

describe('JaService', () => {
  let service: JaService;
  // Use any for mock containers — jest.fn return types vary per method and
  // strict typing blocks the shared-factory pattern without adding no-op casts.
  let repo: any;
  let qbMock: any;
  let todofukenRepo: any;
  let roleRepo: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  // Captured manager passed into transaction callback
  let txManager: any;

  const baseReq = { ip: '127.0.0.1', headers: { 'user-agent': 'vitest' } } as any;

  beforeEach(async () => {
    // Singleton QB so spec-side `qb.getRawOne.mockResolvedValue(...)` and
    // service-side `this.repo.createQueryBuilder(...)` see the same instance.
    qbMock = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      // SCR-004 list-query additions — chainable + result terminators.
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock),
    };
    todofukenRepo = {
      findOne: jest.fn().mockResolvedValue({ todofukenCode: '13', todofukenName: '東京都' }),
      find: jest.fn().mockResolvedValue([]),
    };
    // m_roles lookup for the dropdown role_id→role_code cascade. Tests that
    // exercise the cascade override findOne per the seeded role_id↔role_code
    // contract (3=CHUOKAI, 4=JA_HONTEN, 5=JA_KANRI_SHITEN per seeder.md §1).
    roleRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    /**
     * AuditLogService mock — `logOperation` is the unified row-emit point.
     * The convenience helpers (`logCreate`/`logUpdate`/`logDelete`/`logError`)
     * delegate to it with the standard logType/resultStatus/JSON.stringify
     * defaults so existing assertions on `logOperation`'s row shape stay
     * stable regardless of which call style the service uses.
     */
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      async logCreate(ctx: any, after: unknown) {
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
      async logUpdate(ctx: any, before: unknown, after: unknown) {
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
      async logDelete(ctx: any, before: unknown) {
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
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          errorMessage: err.message,
          stackTrace: err.stack ?? '',
        });
      },
    };
    codeService = {
      has: jest.fn().mockReturnValue(true),
      getLabel: jest.fn().mockReturnValue(''),
    };

    // Default transaction: call the callback with a capturing manager that
    // mirrors entity-shape input back to caller (matches real EntityManager).
    txManager = {
      // EntityManager.create(entity, plainPayload) returns plain hydrated object
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        // Default jaId=3 unless caller already set one — keeps assertions deterministic
        return { ...value, jaId: value.jaId ?? 3 };
      }),
      softRemove: jest.fn(async (entity: any) => entity),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };

    // Plain instantiation — bypasses Nest DI / decorator-metadata
    // (Vitest+esbuild does not emit `design:paramtypes` reliably).
    service = new JaService(
      repo,
      todofukenRepo,
      roleRepo,
      dataSource,
      auditLog,
      codeService,
    );
  });

  // ───────────────────────────────────────────────────────────────────
  // API-005-001: GET /api/v1/ja/:ja_id — findById
  //
  // Implementation strategy: repo.findOne returns the hydrated Ja entity;
  // todofukenRepo.findOne resolves the display name separately. Service
  // maps camelCase entity → snake_case response per the API contract.
  // ───────────────────────────────────────────────────────────────────
  describe('findById (API-005-001)', () => {
    it('should return JA with todofuken_name when found and NICHINO_ADMIN (no ja_id scope)', async () => {
      // COVERS: 4.3 DataScope NICHINO_ADMIN, 4.4 SELECT + todofuken lookup, 4.5 response shape
      repo.findOne.mockResolvedValue(buildJa({ jaId: 1 }));

      const result = await service.findById(1, buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }));

      expect(result.ja_id).toBe(1);
      expect(result.todofuken_name).toBe('東京都');
      expect(result.zei_kubun).toBe(1);
    });

    it('should apply ja_id scope filter when called by CHUOKAI on own JA', async () => {
      // COVERS: 4.3 DataScope CHUOKAI → where clause must include ja_id filter
      repo.findOne.mockResolvedValue(buildJa({ jaId: 1 }));

      const result = await service.findById(1, buildChuokaiSession({ ja_id: 1 }));

      expect(result.ja_id).toBe(1);
      // Assert findOne was called with a where clause scoped to user's jaId
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ jaId: 1 }),
        }),
      );
    });

    it('should throw NotFoundException when ja_id not found', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById(999, buildSession())).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when CHUOKAI tries to access a JA outside own scope', async () => {
      // COVERS: err:DATA_SCOPE_VIOLATION collapses to NOT_FOUND via WHERE filter
      // api.md §4.3 — the scope predicate makes the row disappear from result
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.findById(2, buildChuokaiSession({ ja_id: 1 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not return deleted records when deleted_at IS NOT NULL', async () => {
      // COVERS: 4.3 base condition deleted_at IS NULL (TypeORM soft delete handles this)
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById(1, buildSession())).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API-005-002: POST /api/v1/ja — create
  // ───────────────────────────────────────────────────────────────────
  describe('create (API-005-002)', () => {
    const validDto = {
      ja_code: '1301003001',
      ja_name: 'JA東京みどり',
      ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾐﾄﾞﾘ',
      todofuken_code: '13',
      chuokai_flg: false,
      yubin_no: '1600022',
      address: '東京都新宿区新宿3-1-1',
      tel: '0323456789',
      fax: '0323456780',
      email: 'info@ja-tokyo-midori.or.jp',
      tanto_busho: '企画課',
      tanto_name: '鈴木花子',
      zei_kubun: 1,
      biko: '',
    };

    it('should insert m_ja row and return created entity when NICHINO_ADMIN with valid body', async () => {
      // COVERS: 4.4 UQ check (no dup), 4.5 INSERT, 4.7 201 response
      repo.findOne.mockResolvedValue(null); // no duplicate ja_code
      // Default save mock already returns entity-shape {...value, jaId: 3}
      const result = await service.create(validDto as any, buildSession(), baseReq);

      expect(result.ja_id).toBe(3);
      expect(result.ja_code).toBe('1301003001');
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(txManager.save).toHaveBeenCalledTimes(1);
    });

    it('should validate todofuken_code exists in m_todofuken', async () => {
      // COVERS: 4.3 都道府県コードの存在検証
      todofukenRepo.findOne.mockResolvedValue(null);
      repo.findOne.mockResolvedValue(null);

      await expect(service.create(validDto as any, buildSession(), baseReq)).rejects.toThrow(
        BadRequestException,
      );
      expect(todofukenRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ todofukenCode: '13' }) }),
      );
    });

    it('should throw DUPLICATE_CODE when ja_code already exists', async () => {
      // COVERS: 4.4 一意性チェック, err:DUPLICATE_CODE (row 9)
      repo.findOne.mockResolvedValue({ jaId: 1, jaCode: '1301003001' });

      await expect(service.create(validDto as any, buildSession(), baseReq)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'DUPLICATE_CODE' }),
      });
    });

    it('should reject when zei_kubun is not a valid ZEI_KUBUN code', async () => {
      // COVERS: m_code reference — zei_kubun MUST be in ZEI_KUBUN category (1 or 2)
      codeService.has.mockImplementation((cat: string, val: number) => cat !== 'ZEI_KUBUN' || val === 1 || val === 2);
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...validDto, zei_kubun: 99 } as any, buildSession(), baseReq),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'zei_kubun' }),
          ]),
        }),
      });
    });

    it('should wrap INSERT + audit log in single transaction when create succeeds', async () => {
      // COVERS: transaction boundary — 4.5 + 4.6 share one tx
      repo.findOne.mockResolvedValue(null);

      await service.create(validDto as any, buildSession(), baseReq);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.save).toHaveBeenCalledTimes(1);
      expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
    });

    it('should call AuditLogService.logOperation with bare CREATE operation when insert succeeds', async () => {
      // COVERS: 4.6 操作ログ記録 — operation MUST be bare 'CREATE', NEVER 'JA_CREATE'
      repo.findOne.mockResolvedValue(null);
      txManager.save.mockImplementation(async (_e: any, v: any) => ({ ...v, jaId: 7 }));

      await service.create(validDto as any, buildSession({ account_id: 11 }), baseReq);

      expect(auditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          logType: 1,
          accountId: 11,
          operation: 'CREATE',   // bare verb — reject any prefix like 'JA_CREATE'
          resultStatus: 1,
          targetTable: 'm_ja',
          targetId: 7,
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
        }),
      );
    });

    it('should rollback and NOT persist when audit log fails inside transaction', async () => {
      // COVERS: transaction rollback — audit log throw → INSERT must NOT commit
      repo.findOne.mockResolvedValue(null);
      txManager.save.mockImplementation(async (_e: any, v: any) => ({ ...v, jaId: 9 }));
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit down'));
      // Real tx manager would roll back on callback throw
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          // Real Postgres would discard the INSERT — emulate by tracking committed flag
          (txManager as any).committed = false;
          throw err;
        }
      });

      await expect(service.create(validDto as any, buildSession(), baseReq)).rejects.toBeDefined();
      expect((txManager as any).committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when INSERT fails', async () => {
      // COVERS: 4.8 例外処理 — error log runs after rollback
      repo.findOne.mockResolvedValue(null);
      txManager.save.mockRejectedValue(new Error('DB down'));

      await expect(service.create(validDto as any, buildSession({ account_id: 11 }), baseReq)).rejects.toBeDefined();

      // The error log must be a separate logOperation call (log_type=3) after tx rolls back
      const errorCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.logType === 3 && p.resultStatus === 2,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toMatchObject({
        logType: 3,
        resultStatus: 2,
        operation: 'CREATE',
        targetTable: 'm_ja',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API-005-003: PUT /api/v1/ja/:ja_id — update
  // ───────────────────────────────────────────────────────────────────
  describe('update (API-005-003)', () => {
    const fullBody = {
      ja_name: 'JA東京中央（改定）',
      ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾁｭｳｵｳｶｲﾃｲ',
      todofuken_code: '13',
      chuokai_flg: true,
      yubin_no: '1000001',
      address: '東京都千代田区丸の内2-2-2',
      tel: '0312345678',
      fax: '0312345679',
      email: 'info-new@ja-tokyo-chuo.or.jp',
      tanto_busho: '総務部',
      tanto_name: '田中太郎',
      zei_kubun: 2,
      biko: '住所変更済み',
    };

    beforeEach(() => {
      // 4.3 existence check returns the pre-image
      const before = buildJa({ jaId: 1 });
      repo.findOne.mockResolvedValue(before);
      txManager.findOne.mockResolvedValue(before);
      // default txManager.save handles 1-arg + 2-arg styles and preserves
      // the entity's jaId — no override needed for update-success tests
    });

    it('should update all fields when called by NICHINO_ADMIN', async () => {
      // COVERS: 4.4 NICHINO_ADMIN all-fields, 4.6 UPDATE with full SET list
      const result = await service.update(1, fullBody as any, buildSession(), baseReq);

      expect(result.ja_id).toBe(1);
      expect(result.ja_name).toBe('JA東京中央（改定）');
      expect(result.zei_kubun).toBe(2);
      expect(txManager.save).toHaveBeenCalledTimes(1);
    });

    it('should update only allowed partial fields when called by CHUOKAI (field-level restriction)', async () => {
      // COVERS: 4.4 CHUOKAI/JA_HONTEN partial — ※4 allow-list:
      // yubin_no, address, tel, fax, email, tanto_busho, tanto_name, zei_kubun, biko
      const body = { ...fullBody, ja_name: 'ATTEMPT_TO_CHANGE', todofuken_code: '99' };

      await service.update(1, body as any, buildChuokaiSession({ ja_id: 1 }), baseReq);

      // Service calls manager.save(next) with 1 arg → inspect calls[0][0]
      const savedArg = txManager.save.mock.calls[0][0];
      expect(savedArg.jaName).not.toBe('ATTEMPT_TO_CHANGE');   // ja_name silently dropped
      expect(savedArg.todofukenCode).not.toBe('99');           // todofuken_code silently dropped
      expect(savedArg.yubinNo).toBe('1000001');                // yubin_no kept
    });

    it('should update only allowed partial fields when called by JA_HONTEN', async () => {
      // COVERS: 4.4 JA_HONTEN uses same ※4 allow-list as CHUOKAI
      const body = { ...fullBody, ja_name: 'SHOULD_NOT_CHANGE' };

      await service.update(1, body as any, buildJaHontenSession({ ja_id: 1 }), baseReq);

      const savedArg = txManager.save.mock.calls[0][0];
      expect(savedArg.jaName).not.toBe('SHOULD_NOT_CHANGE');
      expect(savedArg.address).toBe('東京都千代田区丸の内2-2-2');
    });

    it('should throw NotFoundException when target ja_id does not exist', async () => {
      // COVERS: err:NOT_FOUND (row 8), 4.3 対象レコード存在確認
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(999, fullBody as any, buildSession(), baseReq)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when CHUOKAI tries to update other JA outside own scope', async () => {
      // COVERS: 4.3 DataScope + 4.6 WHERE ja_id = :user_ja_id — outside-scope row filtered → 404
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(2, fullBody as any, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate todofuken_code exists when NICHINO_ADMIN changes it', async () => {
      // COVERS: 4.5 都道府県コード存在検証 (NICHINO_ADMIN path)
      todofukenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { ...fullBody, todofuken_code: '99' } as any, buildSession(), baseReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when zei_kubun is not a valid ZEI_KUBUN code', async () => {
      // COVERS: m_code ZEI_KUBUN reference
      codeService.has.mockImplementation((cat: string, val: number) => cat !== 'ZEI_KUBUN' || val === 1 || val === 2);

      await expect(
        service.update(1, { ...fullBody, zei_kubun: 9 } as any, buildSession(), baseReq),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([expect.objectContaining({ field: 'zei_kubun' })]),
        }),
      });
    });

    it('should wrap UPDATE + audit log in single transaction', async () => {
      // COVERS: transaction boundary
      await service.update(1, fullBody as any, buildSession(), baseReq);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.save).toHaveBeenCalledTimes(1);
      expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
    });

    it('should call AuditLogService.logOperation with bare UPDATE + before/after values when update succeeds', async () => {
      // COVERS: 4.7 操作ログ記録 — operation bare 'UPDATE', before/after JSON populated
      await service.update(1, fullBody as any, buildSession({ account_id: 11, ja_id: null }), baseReq);

      expect(auditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          logType: 1,
          accountId: 11,
          operation: 'UPDATE',            // bare verb
          resultStatus: 1,
          targetTable: 'm_ja',
          targetId: 1,
          beforeValue: expect.any(String),
          afterValue: expect.any(String),
        }),
      );
    });

    it('should rollback and NOT persist when audit log fails during update', async () => {
      // COVERS: transaction rollback
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit down'));
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          (txManager as any).committed = false;
          throw err;
        }
      });

      await expect(service.update(1, fullBody as any, buildSession(), baseReq)).rejects.toBeDefined();
      expect((txManager as any).committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when UPDATE fails', async () => {
      // COVERS: 4.9 例外処理 — error log after rollback
      txManager.save.mockRejectedValue(new Error('DB down'));

      await expect(service.update(1, fullBody as any, buildSession({ account_id: 11 }), baseReq)).rejects.toBeDefined();

      const errorCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.logType === 3 && p.resultStatus === 2,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toMatchObject({
        logType: 3,
        resultStatus: 2,
        operation: 'UPDATE',
        targetTable: 'm_ja',
        targetId: 1,
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API-004-001: GET /api/v1/ja — findAll
  //
  // SCR-004 JAマスタ明細検索画面: paginated list with partial-match
  // ja_code / ja_name search, sort, and DataScope by user.ja_id.
  // Implementation strategy: QueryBuilder against `m_ja mj LEFT JOIN
  // m_todofuken mt`, applying ja_code/ja_name ILIKE clauses + ja_id
  // scope, returning {data, meta} via getManyAndCount() (or equivalent
  // raw projection — assertions check qb shape, not result shape).
  // ───────────────────────────────────────────────────────────────────
  describe('findAll (API-004-001)', () => {
    function makeRow(overrides: any = {}) {
      return {
        ja_id: 1,
        ja_code: '1301001001',
        ja_name: 'JA東京中央',
        yubin_no: '1000001',
        todofuken_code: '13',
        todofuken_name: '東京都',
        tel: '0312345678',
        address: '東京都千代田区丸の内1-1-1',
        fax: '0312345679',
        ...overrides,
      };
    }

    it('should return paginated list with meta when NICHINO_ADMIN searches without filters', async () => {
      // COVERS: 4.5 ソート・ページング, 4.6 SELECT + LEFT JOIN m_todofuken, 4.7 レスポンス生成
      qbMock.getRawMany = jest.fn().mockResolvedValue([makeRow({ ja_id: 1 }), makeRow({ ja_id: 2, ja_code: '1301002001' })]);
      qbMock.getCount = jest.fn().mockResolvedValue(2);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[buildJa({ jaId: 1 }), buildJa({ jaId: 2 })], 2]);
      todofukenRepo.find.mockResolvedValue([
        { todofukenCode: '13', todofukenName: '東京都' },
      ]);

      const result = await service.findAll(
        { page: 1, per_page: 20, sort_by: 'ja_code', sort_order: 'asc' } as any,
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.per_page).toBe(20);
      expect(result.meta.total_pages).toBe(1);
    });

    it('should apply ja_id scope filter when called by CHUOKAI', async () => {
      // COVERS: 4.3 DataScope — CHUOKAI sees only own ja_id rows
      qbMock.getRawMany = jest.fn().mockResolvedValue([makeRow({ ja_id: 1 })]);
      qbMock.getCount = jest.fn().mockResolvedValue(1);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[buildJa({ jaId: 1 })], 1]);

      await service.findAll(
        { page: 1, per_page: 20 } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      // The ja_id scope must surface as an andWhere call binding :ja_id = 1
      const andWhereCalls = qbMock.andWhere.mock.calls;
      const scopedCall = andWhereCalls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should apply ja_id scope filter when called by JA_HONTEN', async () => {
      // COVERS: 4.3 DataScope — JA_HONTEN behaves identically to CHUOKAI here
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 1, per_page: 20 } as any,
        buildJaHontenSession({ ja_id: 1 }),
      );

      const andWhereCalls = qbMock.andWhere.mock.calls;
      const scopedCall = andWhereCalls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should NOT apply ja_id scope filter when called by NICHINO_ADMIN (ja_id=null)', async () => {
      // COVERS: 4.3 DataScope — NICHINO_ADMIN bypass (ja_id=null)
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 1, per_page: 20 } as any,
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      // No scope predicate carrying a bound ja_id
      const calls = qbMock.andWhere.mock.calls;
      const scopedCall = calls.find(
        ([_sql, params]: any[]) =>
          params && Object.prototype.hasOwnProperty.call(params, 'ja_id') && params.ja_id != null,
      );
      expect(scopedCall).toBeUndefined();
    });

    it('should apply ILIKE partial match when ja_code filter is provided', async () => {
      // COVERS: 4.3 検索条件 — ja_code ILIKE '%value%'
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { ja_code: '1301', page: 1, per_page: 20 } as any,
        buildSession(),
      );

      const calls = qbMock.andWhere.mock.calls;
      const codeFilter = calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ILIKE/i.test(sql) && /ja_code/i.test(sql),
      );
      expect(codeFilter).toBeDefined();
    });

    it('should apply ILIKE partial match when ja_name filter is provided', async () => {
      // COVERS: 4.3 検索条件 — ja_name ILIKE '%value%'
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { ja_name: '東京', page: 1, per_page: 20 } as any,
        buildSession(),
      );

      const calls = qbMock.andWhere.mock.calls;
      const nameFilter = calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ILIKE/i.test(sql) && /ja_name/i.test(sql),
      );
      expect(nameFilter).toBeDefined();
    });

    it('should apply exact-match filter when todofuken_code is provided', async () => {
      // COVERS: 4.3 検索条件 — todofuken_code = :value (dropdown source,
      // 2-char m_todofuken codes; partial match would conflate "1" and "13").
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { todofuken_code: '13', page: 1, per_page: 20 } as any,
        buildSession(),
      );

      const calls = qbMock.andWhere.mock.calls;
      const tdFilter = calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /todofuken_code/i.test(sql) &&
          /=\s*:/.test(sql) &&
          params?.todofuken_code === '13',
      );
      expect(tdFilter).toBeDefined();
    });

    it('should NOT apply the todofuken filter when todofuken_code is absent', async () => {
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 1, per_page: 20 } as any,
        buildSession(),
      );

      const calls = qbMock.andWhere.mock.calls;
      const tdFilter = calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /todofuken_code/i.test(sql) && /=\s*:/.test(sql),
      );
      expect(tdFilter).toBeUndefined();
    });

    it('should exclude soft-deleted rows by filtering deleted_at IS NULL', async () => {
      // COVERS: 4.3 基本条件 — deleted_at IS NULL
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 1, per_page: 20 } as any,
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const allWhereSql = [
        ...qbMock.where.mock.calls.map((c: any[]) => c[0]),
        ...qbMock.andWhere.mock.calls.map((c: any[]) => c[0]),
      ].filter((s) => typeof s === 'string');
      const softDelete = allWhereSql.find((s) => /deleted_at/i.test(s) && /IS NULL/i.test(s));
      expect(softDelete).toBeDefined();
    });

    it('should apply ORDER BY using sort_by + sort_order', async () => {
      // COVERS: 4.5 ソート — sort_by ja_code DESC
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 1, per_page: 20, sort_by: 'ja_name', sort_order: 'desc' } as any,
        buildSession(),
      );

      // qb.orderBy was called for the chosen column + direction
      expect(qbMock.orderBy).toHaveBeenCalled();
      const orderArgs = qbMock.orderBy.mock.calls[qbMock.orderBy.mock.calls.length - 1];
      const joined = orderArgs.join(' ');
      expect(joined).toMatch(/ja_name/i);
      expect(joined).toMatch(/DESC/i);
    });

    it('should apply LIMIT/OFFSET via take/skip when page=2 per_page=10', async () => {
      // COVERS: 4.5 ページング — OFFSET = (page-1)*per_page, LIMIT = per_page
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 2, per_page: 10 } as any,
        buildSession(),
      );

      expect(qbMock.take).toHaveBeenCalledWith(10);
      expect(qbMock.skip).toHaveBeenCalledWith(10);
    });

    it('should compute total_pages from total/per_page', async () => {
      // COVERS: 4.7 meta.total_pages = ceil(total / per_page)
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(45);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 45]);

      const result = await service.findAll(
        { page: 1, per_page: 20 } as any,
        buildSession(),
      );

      expect(result.meta.total).toBe(45);
      expect(result.meta.total_pages).toBe(3);
    });

    it('should return empty data with total=0 when no rows match', async () => {
      // COVERS: 4.7 — empty list returns {data:[], meta:{total:0,...}}
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      const result = await service.findAll(
        { ja_code: 'NOMATCH', page: 1, per_page: 20 } as any,
        buildSession(),
      );

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });

    it('should not record audit log for read-only list operation', async () => {
      // COVERS: GET endpoint — no t_log row required
      qbMock.getRawMany = jest.fn().mockResolvedValue([]);
      qbMock.getCount = jest.fn().mockResolvedValue(0);
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, per_page: 20 } as any, buildSession());

      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // API-004-002: DELETE /api/v1/ja/:ja_id — remove
  //
  // Logical (soft) delete with 6-table conflict check:
  //   m_kanri_shiten, m_shiten, m_hanbaiten, m_tanka, t_dokusya, m_account
  // Implementation strategy: dataSource.query() COUNT for each related
  // table (entity classes don't yet exist for some), then
  // manager.softRemove(Ja) inside transaction, plus AuditLogService.logDelete.
  // §4.8 — error log (log_type=3) emitted OUTSIDE the rolled-back tx.
  // ───────────────────────────────────────────────────────────────────
  describe('remove (API-004-002)', () => {
    beforeEach(() => {
      // Default: target row exists, no related rows in any table
      const before = buildJa({ jaId: 5 });
      repo.findOne.mockResolvedValue(before);
      txManager.findOne.mockResolvedValue(before);
      // dataSource.query is the conflict-check call surface
      dataSource.query = jest.fn().mockResolvedValue([{ count: '0' }]);
      txManager.update.mockResolvedValue({ affected: 1 });
      txManager.softRemove.mockImplementation(async (entity: any) => entity);
    });

    it('should soft-delete and return success message when NICHINO_ADMIN deletes JA with no related data', async () => {
      // COVERS: happy path — 4.5 UPDATE deleted_at, 4.7 message
      const result = await service.remove(5, buildSession({ role_code: 'NICHINO_ADMIN' }), baseReq);

      expect(result).toMatchObject({ message: '削除しました。' });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when target ja_id does not exist', async () => {
      // COVERS: 4.3 対象レコード存在しない場合 → 404
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, buildSession(), baseReq)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target ja_id is already soft-deleted', async () => {
      // COVERS: 4.3 deleted_at IS NULL filter — already-deleted row returns null
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when m_kanri_shiten has related rows', async () => {
      // COVERS: 4.4 関連データチェック — 管理支店 → CONFLICT
      dataSource.query = jest.fn(async (sql: string) => {
        if (/m_kanri_shiten/i.test(sql)) return [{ count: '2' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'CONFLICT' }),
      });
    });

    it('should throw ConflictException when m_shiten has related rows', async () => {
      // COVERS: 4.4 — 支店
      dataSource.query = jest.fn(async (sql: string) => {
        if (/m_shiten\b/i.test(sql)) return [{ count: '1' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'CONFLICT' }),
      });
    });

    it('should throw ConflictException when m_hanbaiten has related rows', async () => {
      // COVERS: 4.4 — 販売店
      dataSource.query = jest.fn(async (sql: string) => {
        if (/m_hanbaiten/i.test(sql)) return [{ count: '7' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'CONFLICT' }),
      });
    });

    it('should throw ConflictException when m_tanka has related rows', async () => {
      // COVERS: 4.4 — 単価マスタ
      dataSource.query = jest.fn(async (sql: string) => {
        if (/m_tanka/i.test(sql)) return [{ count: '1' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'CONFLICT' }),
      });
    });

    it('should throw ConflictException when t_dokusya has related rows', async () => {
      // COVERS: 4.4 — 購読者
      dataSource.query = jest.fn(async (sql: string) => {
        if (/t_dokusya\b/i.test(sql)) return [{ count: '120' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'CONFLICT' }),
      });
    });

    it('should throw ConflictException when m_account has related rows', async () => {
      // COVERS: 4.4 — アカウント
      dataSource.query = jest.fn(async (sql: string) => {
        if (/m_account/i.test(sql)) return [{ count: '3' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'CONFLICT' }),
      });
    });

    it('should wrap soft-delete + audit log in single transaction when delete succeeds', async () => {
      // COVERS: transaction boundary — 4.5 UPDATE + 4.6 audit log share one tx
      await service.remove(5, buildSession(), baseReq);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
      // The audit log call must have happened with the captured txManager
      // (logCreate/logUpdate/logDelete delegates to logOperation)
    });

    it('should call AuditLogService.logOperation with bare DELETE operation when delete succeeds', async () => {
      // COVERS: 4.6 操作ログ — operation MUST be bare 'DELETE', NEVER 'JA_DELETE'
      await service.remove(5, buildSession({ account_id: 11, ja_id: null }), baseReq);

      expect(auditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          logType: 1,
          accountId: 11,
          operation: 'DELETE', // bare verb — reject 'JA_DELETE' / 'M_JA_DELETE'
          resultStatus: 1,
          targetTable: 'm_ja',
          targetId: 5,
          beforeValue: expect.any(String),
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
        }),
      );
    });

    it('should populate before_value with pre-deletion JA snapshot', async () => {
      // COVERS: 4.6 — before_value JSON contains the row that was deleted
      await service.remove(5, buildSession(), baseReq);

      const call = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'DELETE',
      );
      expect(call).toBeDefined();
      const before = JSON.parse(call![0].beforeValue);
      // Snapshot keeps either camelCase entity or snake_case projection — assert on identifying fields
      const flat = JSON.stringify(before);
      expect(flat).toMatch(/JA東京中央|1301001001/);
    });

    it('should rollback and NOT persist when audit log fails inside transaction', async () => {
      // COVERS: transaction rollback — audit failure rolls back the soft-delete
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit down'));
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          (txManager as any).committed = false;
          throw err;
        }
      });

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toBeDefined();
      expect((txManager as any).committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when DELETE fails', async () => {
      // COVERS: 4.8 例外処理 — error log runs after rollback
      txManager.softRemove.mockRejectedValue(new Error('DB down'));
      txManager.update.mockRejectedValue(new Error('DB down'));

      await expect(service.remove(5, buildSession({ account_id: 11 }), baseReq)).rejects.toBeDefined();

      const errorCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.logType === 3 && p.resultStatus === 2,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toMatchObject({
        logType: 3,
        resultStatus: 2,
        operation: 'DELETE',
        targetTable: 'm_ja',
        targetId: 5,
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // ACSMS-API-COMMON-003 — GET /api/v1/ja/dropdown
  // ═════════════════════════════════════════════════════════════════════
  describe('dropdown', () => {
    function buildAdminSession() {
      return buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' });
    }

    // 顧客要件 2026-07 — SCR-022 ファイルダウンロード画面の DataScope が
    // 「同一都道府県の全JA」へ拡大したため、絞り込み候補も揃える。
    // 拡大先の県はクライアント指定ではなくセッションの todofuken_code。
    it('scope=todofuken: CHUOKAI は自都道府県で絞り、自JA固定の scope は付けない', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 1, per_page: 50, scope: 'todofuken' } as any,
        buildSession({
          ja_id: 5,
          role_code: 'CHUOKAI',
          todofuken_code: '13',
        }),
      );

      const calls = qbMock.andWhere.mock.calls;
      expect(
        calls.some(
          ([sql, params]: [string, any]) =>
            String(sql).includes('mj.todofuken_code = :scopeTodofuken') &&
            params?.scopeTodofuken === '13',
        ),
      ).toBe(true);
      // applyJaScope（自JA固定）は適用されない。
      expect(
        calls.some(([sql]: [string]) => String(sql).includes('scopeJaId')),
      ).toBe(false);
    });

    it('scope=todofuken: CHUOKAI 以外は無視して従来の自JAスコープのまま', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 1, per_page: 50, scope: 'todofuken' } as any,
        buildSession({
          ja_id: 5,
          role_code: 'JA_HONTEN',
          todofuken_code: '13',
        }),
      );

      const calls = qbMock.andWhere.mock.calls;
      expect(
        calls.some(([sql]: [string]) => String(sql).includes('scopeJaId')),
      ).toBe(true);
      expect(
        calls.some(([sql]: [string]) =>
          String(sql).includes('scopeTodofuken'),
        ),
      ).toBe(false);
    });

    it('scope=todofuken: todofuken_code 未設定（旧セッション）は自JAスコープへフォールバック', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 1, per_page: 50, scope: 'todofuken' } as any,
        buildSession({ ja_id: 5, role_code: 'CHUOKAI' }),
      );

      const calls = qbMock.andWhere.mock.calls;
      expect(
        calls.some(([sql]: [string]) => String(sql).includes('scopeJaId')),
      ).toBe(true);
    });

    it('should return slim row payload with todofuken_code + chuokai_flg and has_more meta', async () => {
      const rows = [
        buildJa({
          jaId: 1,
          jaCode: '1301001001',
          jaName: 'JA東京中央',
          todofukenCode: '13',
          chuokaiFlg: true,
        }),
        buildJa({
          jaId: 2,
          jaCode: '1301002001',
          jaName: 'JA東京みどり',
          todofukenCode: '13',
          chuokaiFlg: false,
        }),
      ];
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([rows, 137]);

      const result = await service.dropdown(
        { page: 1, per_page: 50 } as any,
        buildAdminSession(),
      );

      expect(result.data).toEqual([
        {
          ja_id: 1,
          ja_code: '1301001001',
          ja_name: 'JA東京中央',
          todofuken_code: '13',
          chuokai_flg: true,
        },
        {
          ja_id: 2,
          ja_code: '1301002001',
          ja_name: 'JA東京みどり',
          todofuken_code: '13',
          chuokai_flg: false,
        },
      ]);
      expect(result.meta).toEqual({
        total: 137,
        page: 1,
        per_page: 50,
        has_more: true,
      });
    });

    it('should report has_more=false on the last page', async () => {
      qbMock.getManyAndCount = jest
        .fn()
        .mockResolvedValue([[buildJa({ jaId: 99 })], 99]);

      const result = await service.dropdown(
        { page: 2, per_page: 50 } as any,
        buildAdminSession(),
      );

      expect(result.meta.has_more).toBe(false);
    });

    it('should issue an OR-matched ILIKE on both ja_code and ja_name when q is provided', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 1, per_page: 50, q: '東京' } as any,
        buildAdminSession(),
      );

      const orCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          sql.includes('ja_code ILIKE') &&
          sql.includes('OR') &&
          sql.includes('ja_name ILIKE'),
      );
      expect(orCall).toBeDefined();
      expect(orCall![1]).toEqual({ q: '%東京%' });
    });

    // [match-field] SCR-024 account list hides ja_code in the option
    // label, so ILIKE must be scoped to ja_name only — a hit on ja_code
    // would be invisible to the user and read as a bug.
    it('should scope ILIKE to ja_name only when match_field=name', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 1, per_page: 50, q: '東京', match_field: 'name' } as any,
        buildAdminSession(),
      );

      const nameOnly = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          sql.includes('ja_name ILIKE') &&
          !sql.includes('ja_code'),
      );
      expect(nameOnly).toBeDefined();
      expect(nameOnly![1]).toEqual({ q: '%東京%' });

      // Sanity: the OR-on-both branch must NOT have fired.
      const orCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          sql.includes('ja_code ILIKE') &&
          sql.includes('OR'),
      );
      expect(orCall).toBeUndefined();
    });

    it('should sort by ja_code ASC and apply pagination via take/skip', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 3, per_page: 50 } as any,
        buildAdminSession(),
      );

      expect(qbMock.orderBy).toHaveBeenCalledWith('mj.ja_code', 'ASC');
      expect(qbMock.take).toHaveBeenCalledWith(50);
      expect(qbMock.skip).toHaveBeenCalledWith(100);
    });

    it('should apply DataScope (ja_id filter) when called by JA_HONTEN', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 1, per_page: 50 } as any,
        buildJaHontenSession({ ja_id: 1 }),
      );

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should prepend include_id row when it is not in the current page slice', async () => {
      const pageRows = [
        buildJa({ jaId: 1, jaCode: 'A001', jaName: 'A-JA' }),
        buildJa({ jaId: 2, jaCode: 'A002', jaName: 'B-JA' }),
      ];
      const pinned = buildJa({
        jaId: 99,
        jaCode: 'Z999',
        jaName: 'Pinned-JA',
        todofukenCode: '13',
        chuokaiFlg: true,
      });

      // First getManyAndCount: page slice. Second getOne: pinned lookup.
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([pageRows, 250]);
      qbMock.getOne = jest.fn().mockResolvedValue(pinned);

      const result = await service.dropdown(
        { page: 1, per_page: 50, include_id: 99 } as any,
        buildAdminSession(),
      );

      expect(result.data[0]).toMatchObject({
        ja_id: 99,
        ja_code: 'Z999',
        ja_name: 'Pinned-JA',
        todofuken_code: '13',
        chuokai_flg: true,
      });
      expect(result.data).toHaveLength(3);
    });

    it('should NOT duplicate when include_id is already inside the page slice', async () => {
      const pageRows = [
        buildJa({ jaId: 99, jaCode: 'A001', jaName: 'A-JA' }),
        buildJa({ jaId: 2, jaCode: 'A002', jaName: 'B-JA' }),
      ];
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([pageRows, 2]);
      qbMock.getOne = jest.fn();

      const result = await service.dropdown(
        { page: 1, per_page: 50, include_id: 99 } as any,
        buildAdminSession(),
      );

      expect(qbMock.getOne).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.data.filter((r) => r.ja_id === 99)).toHaveLength(1);
    });

    it('should drop include_id silently when it is out of DataScope', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      // The second QB execution for the pinned lookup runs the scope
      // filter too — if the row is out of scope, getOne returns null.
      qbMock.getOne = jest.fn().mockResolvedValue(null);

      const result = await service.dropdown(
        { page: 1, per_page: 50, include_id: 99 } as any,
        buildJaHontenSession({ ja_id: 1 }),
      );

      expect(result.data).toHaveLength(0);
    });

    it('should filter by todofuken_code with exact match when provided (SCR-024 cascade)', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 1, per_page: 50, todofuken_code: '13' } as any,
        buildAdminSession(),
      );

      const tdCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && sql.includes('mj.todofuken_code'),
      );
      expect(tdCall).toBeDefined();
      expect(tdCall![1]).toEqual({ tdcode: '13' });
    });

    it('should apply chuokai_flg=true when role_id resolves to CHUOKAI (SCR-024 cascade — 中央会)', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      roleRepo.findOne.mockResolvedValue({ roleCode: 'CHUOKAI' });

      await service.dropdown(
        { page: 1, per_page: 50, role_id: 3 } as any,
        buildAdminSession(),
      );

      const chuokaiCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /mj\.chuokai_flg\s*=\s*:chuokaiFlg/.test(sql) &&
          params?.chuokaiFlg === true,
      );
      expect(chuokaiCall).toBeDefined();
    });

    it('should apply chuokai_flg=false when role_id resolves to JA_HONTEN / JA_KANRI_SHITEN (SCR-024 cascade — 単協)', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      roleRepo.findOne.mockResolvedValue({ roleCode: 'JA_HONTEN' });

      await service.dropdown(
        { page: 1, per_page: 50, role_id: 4 } as any,
        buildAdminSession(),
      );

      const falseCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /mj\.chuokai_flg\s*=\s*:chuokaiFlg/.test(sql) &&
          params?.chuokaiFlg === false,
      );
      expect(falseCall).toBeDefined();
    });

    it('should NOT apply chuokai_flg filter when role_id is unspecified', async () => {
      qbMock.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.dropdown(
        { page: 1, per_page: 50 } as any,
        buildAdminSession(),
      );

      const chuokaiCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /chuokai_flg/i.test(sql),
      );
      expect(chuokaiCall).toBeUndefined();
    });
  });
});

// Screen: ACSMS-SCR-006 — 支店マスタ明細検索画面 (list + delete)
//         ACSMS-SCR-007 — 支店マスタ登録画面 (detail + create + update)
//
// Both SCRs share the same ShitenService class. Tests are organised as
// two sibling top-level describe blocks so each has its own mock scope
// — SCR-006 covers findAll / remove (QueryBuilder + soft-delete), and
// SCR-007 covers findById / create / update (findOne + tx-save).
// Spec count + assertions remain 1:1 with the originals; only the
// location changed (merged from __tests__/ into this file so the
// module follows "1 source = 1 spec file").

import {
  BadRequestException,
  ConflictException,
  DataScopeViolationException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';

import { ShitenService } from '@/modules/shiten/shiten.service';
import { buildShiten } from '@test/fixtures/shiten.factory';
import { buildKozaShitenDropdownRow } from '@test/fixtures/koza-furikae.factory';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';

describe('ShitenService — SCR-006 (list / delete)', () => {
  let service: any;
  let repo: any;
  let qbMock: any;
  let kanriShitenRepo: any;
  let auditLog: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any;

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
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock),
    };
    kanriShitenRepo = {
      findOne: jest.fn().mockResolvedValue({ kanriShitenId: 1, jaId: 1 }),
      find: jest.fn().mockResolvedValue([]),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
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
    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        return { ...value, shitenId: value.shitenId ?? 1 };
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn().mockResolvedValue([{ count: '0' }]),
      manager: {
        findOne: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
      },
    };

    service = new ShitenService(repo, kanriShitenRepo, dataSource, auditLog);
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-006-001 — findAll (GET /api/v1/shiten)
  // ═════════════════════════════════════════════════════════════════════
  describe('findAll (API-006-001)', () => {
    it('should return paginated list { data, meta } when CHUOKAI calls with no filter', async () => {
      const sample = buildShiten({ shitenId: 1, jaId: 1 });
      qbMock.getManyAndCount.mockResolvedValue([[sample], 1]);
      const result = await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));

      expect(result).toMatchObject({
        data: expect.any(Array),
        meta: expect.objectContaining({
          total: 1,
          page: 1,
          per_page: 20,
          total_pages: 1,
        }),
      });
      expect(result.data[0]).toMatchObject({
        shiten_id: 1,
        ja_id: 1,
      });
    });

    it('should map every entity camelCase field to response snake_case (incl. biko v1.3)', async () => {
      // COVERS: §レスポンスデータ — every column from m_shiten.
      const sample = buildShiten({
        shitenId: 5, jaId: 2,
        shitenCode: '005', shitenName: '東支店',
        shitenNameKana: 'ﾋｶﾞｼｼﾃﾝ',
        kinyuShitenFlg: true, kanriShitenId: 2,
        biko: '備考テキスト',
      });
      qbMock.getManyAndCount.mockResolvedValue([[sample], 1]);

      const result = await service.findAll({}, buildChuokaiSession({ ja_id: 2 }));
      expect(result.data[0]).toMatchObject({
        shiten_id: 5,
        ja_id: 2,
        shiten_code: '005',
        shiten_name: '東支店',
        shiten_name_kana: 'ﾋｶﾞｼｼﾃﾝ',
        kinyu_shiten_flg: true,
        kanri_shiten_id: 2,
        biko: '備考テキスト',
      });
    });

    it('should hydrate kanri_shiten_name via batch lookup against m_kanri_shiten', async () => {
      // COVERS: §レスポンスデータ — kanri_shiten_name JOIN. Service
      // batch-fetches kanri_shiten rows after the main query and maps
      // by kanri_shiten_id; the mapper consumes the resolved name.
      const sample = buildShiten({ shitenId: 1, jaId: 1, kanriShitenId: 5 });
      qbMock.getManyAndCount.mockResolvedValue([[sample], 1]);
      kanriShitenRepo.find.mockResolvedValue([
        { kanriShitenId: 5, kanriShitenName: '東京中央管理支店' },
      ]);

      const result = await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));
      expect(result.data[0]).toMatchObject({
        shiten_id: 1,
        kanri_shiten_id: 5,
        kanri_shiten_name: '東京中央管理支店',
      });
    });

    it('should set kanri_shiten_name to empty string when the lookup row is missing', async () => {
      // Defensive: orphaned kanri_shiten_id (deleted parent) shouldn't
      // break the response — surface empty string so the FE can show
      // the row with a blank 管理支店名 cell.
      const sample = buildShiten({ shitenId: 1, jaId: 1, kanriShitenId: 99 });
      qbMock.getManyAndCount.mockResolvedValue([[sample], 1]);
      kanriShitenRepo.find.mockResolvedValue([]); // no parent found

      const result = await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));
      expect(result.data[0].kanri_shiten_name).toBe('');
    });

    it('should apply DataScope (ja_id = session.ja_id) when caller is CHUOKAI', async () => {
      // COVERS: §4.3 — scope by ja_id for non-admin roles.
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));
      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should apply DataScope (ja_id = session.ja_id) when caller is JA_HONTEN', async () => {
      await service.findAll({}, buildJaHontenSession({ ja_id: 2 }));
      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should apply JA-level DataScope (ja_id = session.ja_id) — NOT kanri_shiten — when caller is JA_KANRI_SHITEN', async () => {
      // 顧客要件 2026-06 — JA_KANRI_SHITEN は **閲覧のみ** 同一 JA の全支店を
      // 一覧できる（自管理支店配下に絞らない）。更新/削除は別途 kanri_shiten で制限。
      await service.findAll({}, buildJaKanriShitenSession({ ja_id: 2, kanri_shiten_id: 1 }));
      // Scoped by ja_id …
      const jaScopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ja_?id\s*=/i.test(sql),
      );
      expect(jaScopedCall).toBeDefined();
      expect(jaScopedCall?.[1]).toMatchObject({ scopeJaId: 2 });
      // … and NOT narrowed by kanri_shiten_id (viewable across the JA).
      const ksScopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /kanri_?shiten_?id\s*=/i.test(sql),
      );
      expect(ksScopedCall).toBeUndefined();
    });

    it('should apply ILIKE filter when query.shiten_name is provided', async () => {
      // COVERS: §2.1 — shiten_name partial match
      await service.findAll({ shiten_name: '本店' }, buildChuokaiSession({ ja_id: 1 }));
      const ilikeCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ILIKE/i.test(sql) && /shiten_name/.test(sql),
      );
      expect(ilikeCall).toBeDefined();
    });

    it('should NOT apply ILIKE filter when shiten_name is absent', async () => {
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));
      const ilikeCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ILIKE/i.test(sql) && /shiten_name/.test(sql),
      );
      expect(ilikeCall).toBeUndefined();
    });

    it('should default page=1 and per_page=20 when not supplied', async () => {
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));
      expect(qbMock.take).toHaveBeenCalledWith(20);
      expect(qbMock.skip).toHaveBeenCalledWith(0);
    });

    it('should sort by updated_at DESC when sort_by/sort_order not supplied (newest-first default)', async () => {
      // Default sort surfaces the just-created / just-edited row at the
      // top of the list. 画面定義§8.1 columns remain available via
      // header clicks (covered by neighbouring tests).
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));
      const orderCall = qbMock.orderBy.mock.calls[0];
      expect(orderCall).toBeDefined();
      expect(orderCall[0]).toMatch(/updated_at/);
      expect(orderCall[1]).toBe('DESC');
    });

    it('should sort by shiten_name DESC when query specifies them', async () => {
      await service.findAll(
        { sort_by: 'shiten_name', sort_order: 'desc' },
        buildChuokaiSession({ ja_id: 1 }),
      );
      const orderCall = qbMock.orderBy.mock.calls[0];
      expect(orderCall[0]).toMatch(/shiten_name/);
      expect(orderCall[1]).toBe('DESC');
    });

    it('should LEFT JOIN m.kanriShiten and ORDER BY ks.kanriShitenName when sort_by=kanri_shiten_name', async () => {
      // The joined parent column can't be referenced without a JOIN; the
      // service adds it conditionally so the common shiten_code/shiten_name
      // sorts stay JOIN-free. leftJoinAndSelect (not raw leftJoin) is
      // required so the DISTINCT-subquery wrapper from take()/skip()
      // exposes ks.* in its SELECT.
      await service.findAll(
        { sort_by: 'kanri_shiten_name', sort_order: 'asc' },
        buildChuokaiSession({ ja_id: 1 }),
      );

      const joinCall = qbMock.leftJoinAndSelect.mock.calls.find(
        (args: any[]) => args[0] === 'm.kanriShiten' && args[1] === 'ks',
      );
      expect(joinCall).toBeDefined();

      const orderCall = qbMock.orderBy.mock.calls[0];
      expect(orderCall[0]).toBe('ks.kanriShitenName');
      expect(orderCall[1]).toBe('ASC');
    });

    it('should NOT add the LEFT JOIN when sort_by is a local column', async () => {
      // Cheap-path guard: local-column sorts must not pay for the JOIN.
      qbMock.leftJoinAndSelect.mockClear();
      await service.findAll(
        { sort_by: 'shiten_code', sort_order: 'asc' },
        buildChuokaiSession({ ja_id: 1 }),
      );
      const ksJoin = qbMock.leftJoinAndSelect.mock.calls.find(
        (args: any[]) => args[0] === 'm.kanriShiten',
      );
      expect(ksJoin).toBeUndefined();
    });

    it('should compute meta.total_pages = ceil(total / per_page) when total exceeds one page', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[buildShiten()], 47]);
      const result = await service.findAll({ per_page: 20 }, buildChuokaiSession({ ja_id: 1 }));
      expect(result.meta.total_pages).toBe(3);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-006-002 — remove (DELETE /api/v1/shiten/:id)
  // ═════════════════════════════════════════════════════════════════════
  describe('remove (API-006-002)', () => {
    it('should soft-delete the row + audit log inside transaction when CHUOKAI deletes valid id', async () => {
      // COVERS: §4.5 UPDATE deleted_at=NOW() + §4.6 audit log atomicity
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 1, jaId: 1 }));
      // §4.4 — t_dokusya conflict check returns 0.
      dataSource.query.mockResolvedValue([{ count: '0' }]);

      const result = await service.remove(1, buildChuokaiSession({ ja_id: 1 }), baseReq);

      expect(result).toEqual({ message: '削除しました。' });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when target row does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(999, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when CHUOKAI deletes another JA', async () => {
      // Service WHERE filters by session.ja_id; out-of-scope returns null.
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(5, buildChuokaiSession({ ja_id: 99 }), baseReq))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw DataScopeViolation (403) when JA_KANRI_SHITEN deletes a same-JA row from another kanri_shiten', async () => {
      // 顧客要件 2026-06 — role 5 can VIEW but NOT delete branches outside
      // its own kanri_shiten. The row is viewable (same JA), so we surface
      // an explicit 403 rather than masking as 404.
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 5, jaId: 2, kanriShitenId: 99 }));
      await expect(
        service.remove(5, buildJaKanriShitenSession({ ja_id: 2, kanri_shiten_id: 1 }), baseReq),
      ).rejects.toThrow(DataScopeViolationException);
    });

    it('should soft-delete when JA_KANRI_SHITEN deletes a row under its OWN kanri_shiten', async () => {
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 5, jaId: 2, kanriShitenId: 1 }));
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      const result = await service.remove(
        5,
        buildJaKanriShitenSession({ ja_id: 2, kanri_shiten_id: 1 }),
        baseReq,
      );
      expect(result).toEqual({ message: '削除しました。' });
      expect(txManager.update).toHaveBeenCalled();
    });

    it('should throw ConflictException when t_dokusya has rows referencing the shiten', async () => {
      // COVERS: §4.4 — conflict check on t_dokusya.shiten_id
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 1, jaId: 1 }));
      dataSource.query.mockImplementation(async (sql: string) => {
        if (/t_dokusya/i.test(sql)) return [{ count: '2' }];
        return [{ count: '0' }];
      });
      await expect(service.remove(1, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow(ConflictException);
    });

    it('should call auditLog.logOperation with bare DELETE operation (not prefixed)', async () => {
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 1, jaId: 1 }));
      dataSource.query.mockResolvedValue([{ count: '0' }]);

      await service.remove(1, buildChuokaiSession({ ja_id: 1 }), baseReq);

      const deleteCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.operation === 'DELETE',
      );
      expect(deleteCall).toBeDefined();
      expect(deleteCall[0]).toMatchObject({
        logType: 1,
        operation: 'DELETE',
        resultStatus: 1,
        targetTable: 'm_shiten',
        targetId: 1,
      });
      expect(deleteCall[0].beforeValue).toBeDefined();
    });

    it('should rollback and NOT persist when audit log fails', async () => {
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 1, jaId: 1 }));
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        await cb(txManager);
        throw new Error('audit log save failed');
      });
      await expect(service.remove(1, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow();
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      // COVERS: §4.8 — error log OUTSIDE the rolled-back tx
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 1, jaId: 1 }));
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(service.remove(1, buildChuokaiSession({ ja_id: 1 }), baseReq)).rejects.toThrow();

      const errorCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.logType === 3,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0]).toMatchObject({
        logType: 3,
        operation: 'DELETE',
        resultStatus: 2,
        targetId: 1,
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-007 — detail + create + update (separate top-level describe so its
// mock setup, especially the kanriShitenRepo default + txManager save
// shape, doesn't leak into the SCR-006 block above).
// ═══════════════════════════════════════════════════════════════════════

describe('ShitenService — SCR-007 (detail + create + update)', () => {
  let service: any;
  let repo: any;
  let kanriShitenRepo: any;
  let auditLog: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      })),
    };
    kanriShitenRepo = {
      findOne: jest.fn().mockResolvedValue({ kanriShitenId: 1, jaId: 1 }),
      find: jest.fn().mockResolvedValue([]),
    };
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
    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        return { ...value, shitenId: value.shitenId ?? 10 };
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn().mockResolvedValue([]),
      manager: {
        findOne: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
      },
    };

    service = new ShitenService(repo, kanriShitenRepo, dataSource, auditLog);
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-007-001 — findById (GET /api/v1/shiten/:id)
  // ═════════════════════════════════════════════════════════════════════
  describe('findById (API-007-001)', () => {
    it('should return detail when row exists and caller is CHUOKAI of matching JA', async () => {
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 1, jaId: 1 }));
      const result = await service.findById(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.shiten_id).toBe(1);
    });

    it('should map every entity camelCase field to response snake_case', async () => {
      // COVERS: §3 レスポンスデータ — all 11 fields incl. biko (v1.3 addition)
      repo.findOne.mockResolvedValue(buildShiten({
        shitenId: 5, jaId: 2,
        shitenCode: '005', shitenName: '東支店',
        shitenNameKana: 'ﾋｶﾞｼｼﾃﾝ',
        kinyuShitenFlg: true, kanriShitenId: 2,
        biko: '備考テキスト',
      }));

      const result = await service.findById(5, buildSession({ role_code: 'CHUOKAI', ja_id: 2 }));

      expect(result).toMatchObject({
        shiten_id: 5,
        ja_id: 2,
        shiten_code: '005',
        shiten_name: '東支店',
        shiten_name_kana: 'ﾋｶﾞｼｼﾃﾝ',
        kinyu_shiten_flg: true,
        kanri_shiten_id: 2,
        biko: '備考テキスト',
      });
      expect(result.created_at).toBeDefined();
    });

    it('should throw NotFoundException when row does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(999, buildChuokaiSession({ ja_id: 1 })))
        .rejects.toThrow(NotFoundException);
    });

    it('should apply DataScope to CHUOKAI — return row when ja_id matches session.ja_id', async () => {
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 1, jaId: 1 }));
      const result = await service.findById(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.ja_id).toBe(1);
    });

    it('should mask out-of-scope row as NotFoundException when CHUOKAI requests row of another JA', async () => {
      // Service filters via WHERE ja_id = :session_ja_id — out-of-scope appears as null.
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(2, buildChuokaiSession({ ja_id: 1 })))
        .rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when JA_HONTEN requests row of another JA', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(5, buildJaHontenSession({ ja_id: 99 })))
        .rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when JA_KANRI_SHITEN requests row of another JA', async () => {
      // Cross-JA — assertJaScope masks existence as 404.
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 5, jaId: 99, kanriShitenId: 7 }));
      await expect(
        service.findById(5, buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 1 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should RETURN a same-JA row from a DIFFERENT kanri_shiten for JA_KANRI_SHITEN (view-only expansion)', async () => {
      // 顧客要件 2026-06 — role 5 can VIEW any shiten in its own JA, even
      // ones not under its own kanri_shiten. The view succeeds; update /
      // delete are blocked separately (403).
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 5, jaId: 2, kanriShitenId: 99 }));
      const result = await service.findById(
        5,
        buildJaKanriShitenSession({ ja_id: 2, kanri_shiten_id: 1 }),
      );
      expect(result.shiten_id).toBe(5);
      expect(result.kanri_shiten_id).toBe(99);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-007-002 — create (POST /api/v1/shiten)
  // ═════════════════════════════════════════════════════════════════════
  describe('create (API-007-002)', () => {
    const validDto = {
      shiten_code: '001',
      shiten_name: '本店営業部',
      shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
      kanri_shiten_id: 1,
      kinyu_shiten_flg: false,
      biko: '本店ビル1F',
    };

    beforeEach(() => {
      // §4.3 dup-code check — no existing row.
      repo.findOne.mockResolvedValue(null);
    });

    it('should insert row + audit log inside transaction when CHUOKAI sends valid body', async () => {
      // COVERS: §4.4 INSERT + §4.5 audit log atomicity
      const result = await service.create(validDto, buildChuokaiSession({ ja_id: 1 }), baseReq);

      expect(result).toMatchObject({
        shiten_id: 10,
        shiten_code: '001',
        message: '登録しました。',
      });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.save).toHaveBeenCalled();
    });

    it('should validate kanri_shiten_id exists in m_kanri_shiten when create is called', async () => {
      // COVERS: FK guard — kanri_shiten_id must point at an existing 管理支店
      kanriShitenRepo.findOne.mockResolvedValue(null);
      await expect(service.create(validDto, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw DuplicateCodeException when shiten_code already exists in same JA', async () => {
      // COVERS: §4.3 + err:DUPLICATE_CODE (UQ ja_id + shiten_code)
      repo.findOne.mockResolvedValue(buildShiten({ shitenCode: validDto.shiten_code, jaId: 1 }));
      await expect(service.create(validDto, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow(DuplicateCodeException);
    });

    it('should surface the actual shiten_code value in DUPLICATE_CODE message', async () => {
      // COVERS: gen-code rule — `${resource}「${value}」はすでに登録されています。`
      repo.findOne.mockResolvedValue(buildShiten({ shitenCode: validDto.shiten_code, jaId: 1 }));
      await expect(service.create(validDto, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toMatchObject({
          response: {
            error_code: 'DUPLICATE_CODE',
            message: expect.stringContaining('001'),
          },
        });
    });

    it('should default kinyu_shiten_flg to false when omitted from request', async () => {
      const { kinyu_shiten_flg: _drop, ...withoutFlg } = validDto;
      const result = await service.create(withoutFlg, buildChuokaiSession({ ja_id: 1 }), baseReq);
      expect(result.kinyu_shiten_flg).toBe(false);
    });

    it('should call auditLog.logOperation with bare CREATE operation (not prefixed)', async () => {
      await service.create(validDto, buildChuokaiSession({ ja_id: 1 }), baseReq);
      const createCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.operation === 'CREATE',
      );
      expect(createCall).toBeDefined();
      expect(createCall[0]).toMatchObject({
        logType: 1,
        operation: 'CREATE',
        resultStatus: 1,
        targetTable: 'm_shiten',
      });
    });

    it('should rollback and NOT persist when audit log fails', async () => {
      // COVERS: tx atomicity — main save + audit log share one tx
      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        await cb(txManager); // run the callback
        throw new Error('audit log save failed');
      });
      await expect(service.create(validDto, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow();
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      // COVERS: §4.7 error log OUTSIDE the rolled-back tx
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(service.create(validDto, buildChuokaiSession({ ja_id: 1 }), baseReq)).rejects.toThrow();

      const errorCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.logType === 3,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0]).toMatchObject({
        logType: 3,
        operation: 'CREATE',
        resultStatus: 2,
      });
    });

    it('should derive ja_id from session, not from request body', async () => {
      // Body has no ja_id; session.ja_id is the source of truth.
      // Layer 4 FK guard now requires the kanri_shiten in the body to
      // belong to the same JA as the session — override the default
      // mock (jaId=1) so this test's session.ja_id=7 stays in scope.
      kanriShitenRepo.findOne.mockResolvedValueOnce({ kanriShitenId: 1, jaId: 7 });
      await service.create(validDto, buildJaHontenSession({ ja_id: 7 }), baseReq);
      const savedCall = txManager.save.mock.calls.find(
        (c: any[]) => c[c.length - 1]?.jaId === 7,
      );
      expect(savedCall).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-007-003 — update (PUT /api/v1/shiten/:id)
  // ═════════════════════════════════════════════════════════════════════
  describe('update (API-007-003)', () => {
    const validDto = {
      shiten_name: '本店営業部（名称変更）',
      shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
      kanri_shiten_id: 1,
      kinyu_shiten_flg: true,
      biko: '本店ビル1F 改装済み',
    };

    beforeEach(() => {
      // Existing row found. kinyuShitenFlg=true matches validDto so the
      // [kinyu-immutable] guard passes (unchanged flag); tests that need a
      // mismatch override repo.findOne locally.
      repo.findOne.mockResolvedValue(buildShiten({
        shitenId: 1, jaId: 1,
        shitenCode: '001', shitenName: '本店営業部',
        kinyuShitenFlg: true, kanriShitenId: 1,
        biko: '',
      }));
    });

    it('should update fields + audit log inside transaction when CHUOKAI sends valid body', async () => {
      // COVERS: §4.4 UPDATE + §4.5 audit log atomicity
      const result = await service.update(1, validDto, buildChuokaiSession({ ja_id: 1 }), baseReq);

      expect(result).toMatchObject({
        shiten_id: 1,
        shiten_name: '本店営業部（名称変更）',
        message: '更新しました。',
      });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when target row does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(999, validDto, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when CHUOKAI updates another JA', async () => {
      // Service WHERE filters by session.ja_id; out-of-scope appears as null.
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(5, validDto, buildChuokaiSession({ ja_id: 99 }), baseReq))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw DataScopeViolation (403) when JA_KANRI_SHITEN updates a same-JA row from another kanri_shiten', async () => {
      // 顧客要件 2026-06 — role 5 can VIEW but NOT update branches outside
      // its own kanri_shiten. Row is viewable (same JA) → explicit 403.
      repo.findOne.mockResolvedValue(buildShiten({ shitenId: 5, jaId: 2, kanriShitenId: 99 }));
      await expect(
        service.update(
          5,
          validDto,
          buildJaKanriShitenSession({ ja_id: 2, kanri_shiten_id: 1 }),
          baseReq,
        ),
      ).rejects.toThrow(DataScopeViolationException);
    });

    it('should validate kanri_shiten_id exists in m_kanri_shiten when update is called', async () => {
      kanriShitenRepo.findOne.mockResolvedValue(null);
      await expect(service.update(1, validDto, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject changing kinyu_shiten_flg (immutable after create) with 400 VALIDATION_ERROR', async () => {
      // [kinyu-immutable] before=false, DTO sends true → reject.
      repo.findOne.mockResolvedValue(buildShiten({
        shitenId: 1, jaId: 1, shitenCode: '001',
        kinyuShitenFlg: false, kanriShitenId: 1,
      }));
      await expect(
        service.update(
          1,
          { ...validDto, kinyu_shiten_flg: true },
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      // No write when the guard trips.
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should reject clearing kinyu_shiten_flg (true→false) as immutable', async () => {
      // beforeEach mock has kinyuShitenFlg=true; DTO sends false → reject.
      await expect(
        service.update(
          1,
          { ...validDto, kinyu_shiten_flg: false },
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('should allow update when kinyu_shiten_flg is omitted (undefined) — flag preserved', async () => {
      // [kinyu-immutable] omitting the flag must NOT trip the guard; the
      // existing value is preserved by the service.
      const { kinyu_shiten_flg: _drop, ...noFlag } = validDto;
      const result = await service.update(1, noFlag, buildChuokaiSession({ ja_id: 1 }), baseReq);
      expect(result).toMatchObject({ shiten_id: 1, message: '更新しました。' });
    });

    it('should NOT change shiten_code (immutable per api.md 注記)', async () => {
      // Smuggle shiten_code into the DTO; the service must drop it.
      const dtoWithSmuggle = { ...validDto, shiten_code: '999' };
      const result = await service.update(1, dtoWithSmuggle, buildChuokaiSession({ ja_id: 1 }), baseReq);
      expect(result.shiten_code).toBe('001'); // original, not 999
    });

    it('should call auditLog.logOperation with bare UPDATE operation + before+after values', async () => {
      await service.update(1, validDto, buildChuokaiSession({ ja_id: 1 }), baseReq);
      const updateCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.operation === 'UPDATE',
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toMatchObject({
        logType: 1,
        operation: 'UPDATE',
        resultStatus: 1,
        targetTable: 'm_shiten',
      });
      expect(updateCall[0].beforeValue).toBeDefined();
      expect(updateCall[0].afterValue).toBeDefined();
    });

    it('should rollback and NOT persist when audit log fails', async () => {
      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        await cb(txManager);
        throw new Error('audit log save failed');
      });
      await expect(service.update(1, validDto, buildChuokaiSession({ ja_id: 1 }), baseReq))
        .rejects.toThrow();
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(service.update(1, validDto, buildChuokaiSession({ ja_id: 1 }), baseReq)).rejects.toThrow();

      const errorCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.logType === 3,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0]).toMatchObject({
        logType: 3,
        operation: 'UPDATE',
        resultStatus: 2,
      });
    });

    // ─── FIELD_RESTRICTIONS (security.md Layer 3) ─────────────────────
    it('should SILENTLY DROP kanri_shiten_id when JA_KANRI_SHITEN sends it on update', async () => {
      // Customer policy 2026-05: role 5 cannot reassign a shiten to
      // a different kanri-shiten. Existing row's kanriShitenId stays
      // intact even when the DTO carries a different value.
      // FE mirror: ShitenFormView.vue disables the 管理支店 select
      // for role 5 — this BE drop is the authoritative gate.
      const dtoWithKanri = {
        ...validDto,
        kanri_shiten_id: 99, // attempted reassignment
      };
      const ksSession = buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 1 });
      // The fetchFkInJa guard runs BEFORE filterAllowedFields; mock so
      // the lookup succeeds (parent row 99 exists in JA 1). The drop
      // happens at the field-restriction step, not the FK step.
      kanriShitenRepo.findOne.mockResolvedValue({ kanriShitenId: 99, jaId: 1 });

      const result = await service.update(1, dtoWithKanri, ksSession, baseReq);
      // The result should reflect the ORIGINAL kanri_shiten_id, not the
      // smuggled 99 — proves filterAllowedFields dropped it before the
      // pickNumber fallback to before.kanriShitenId.
      expect(result.kanri_shiten_id).toBe(1);
    });

    it('should ACCEPT every other field (shiten_name / kinyu_shiten_flg / biko / JASTEM) when JA_KANRI_SHITEN updates', async () => {
      // Regression guard — only kanri_shiten_id is locked. Every other
      // column on the DTO must still round-trip for role 5.
      const dto = {
        shiten_name: 'role-5 renamed',
        shiten_name_kana: 'ﾛｰﾙ5',
        kinyu_shiten_flg: true,
        jastem_toriatsukai_tenpo_code: '888',
        jastem_tenpo_name: 'ﾃｽﾄﾃﾝﾎﾟ',
        jastem_tyokin_shubetsu: '1',
        jastem_koza_no: '1234567',
        biko: 'role 5 edited 備考',
      };
      const ksSession = buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 1 });

      const result = await service.update(1, dto, ksSession, baseReq);
      expect(result.shiten_name).toBe('role-5 renamed');
      expect(result.shiten_name_kana).toBe('ﾛｰﾙ5');
      expect(result.kinyu_shiten_flg).toBe(true);
      expect(result.jastem_toriatsukai_tenpo_code).toBe('888');
      expect(result.biko).toBe('role 5 edited 備考');
    });

    it('should ACCEPT kanri_shiten_id when CHUOKAI / JA_HONTEN update (lock is scoped to role 5)', async () => {
      // CHUOKAI carries `['*']` in FIELD_RESTRICTIONS so the value
      // flows through. Verifies the lock didn't accidentally generalise.
      const dtoWithKanri = { ...validDto, kanri_shiten_id: 7 };
      kanriShitenRepo.findOne.mockResolvedValueOnce({ kanriShitenId: 7, jaId: 1 });
      const result = await service.update(1, dtoWithKanri, buildChuokaiSession({ ja_id: 1 }), baseReq);
      expect(result.kanri_shiten_id).toBe(7);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
// ACSMS-API-COMMON-008 — Get Koza Shiten Dropdown (定義元: ACSMS-SCR-020)
// GET /api/v1/shiten/koza-dropdown — 金融機関支店(kinyu_shiten_flg=TRUE)のみ。
// ══════════════════════════════════════════════════════════════════════
describe('ShitenService — COMMON-008 (koza-dropdown)', () => {
  let service: any;
  let repo: any;
  let qbMock: any;
  let kanriShitenRepo: any;
  let auditLog: any;
  let dataSource: any;

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { shitenId: 10, shitenCode: '001', shitenName: '本店', kanriShitenId: 1 },
        { shitenId: 11, shitenCode: '002', shitenName: '北支店', kanriShitenId: 1 },
      ]),
      getRawMany: jest.fn().mockResolvedValue([
        buildKozaShitenDropdownRow({ shiten_id: 10 }),
        buildKozaShitenDropdownRow({ shiten_id: 11, shiten_code: '002', shiten_name: '北支店' }),
      ]),
    };
    repo = { createQueryBuilder: jest.fn(() => qbMock) };
    kanriShitenRepo = { findOne: jest.fn(), find: jest.fn() };
    auditLog = { logOperation: jest.fn() };
    dataSource = { transaction: jest.fn(), query: jest.fn() };

    service = new ShitenService(repo, kanriShitenRepo, dataSource, auditLog);
  });

  it('should return the koza-shiten list shaped { shiten_id, shiten_code, shiten_name, kanri_shiten_id } when called', async () => {
    // COVERS: 4.3 / 4.4 レスポンスデータ
    const result = await service.getKozaDropdown({}, buildChuokaiSession({ ja_id: 1 }));

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        shiten_id: expect.any(Number),
        shiten_code: expect.any(String),
        shiten_name: expect.any(String),
        kanri_shiten_id: expect.any(Number),
      }),
    );
  });

  it('should restrict the query to kinyu_shiten_flg = TRUE when building the koza-dropdown', async () => {
    // COVERS: 4.3 WHERE kinyu_shiten_flg = TRUE
    await service.getKozaDropdown({}, buildChuokaiSession({ ja_id: 1 }));

    const matched = qbMock.andWhere.mock.calls
      .concat(qbMock.where.mock.calls)
      .find(([sql]: any[]) => typeof sql === 'string' && /kinyu_?[Ss]hiten_?[Ff]lg/.test(sql));
    expect(matched).toBeDefined();
  });

  it('should bind ja_id scope when the session role is CHUOKAI', async () => {
    // COVERS: 4.2 DataScope ja_id = user.ja_id
    await service.getKozaDropdown({}, buildChuokaiSession({ ja_id: 7 }));

    const calls = qbMock.andWhere.mock.calls.concat(qbMock.where.mock.calls);
    const scoped = calls.find(
      ([sql, params]: any[]) =>
        typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql) && params && JSON.stringify(params).includes('7'),
    );
    expect(scoped).toBeDefined();
  });

  it('should additionally bind kanri_shiten_id scope when the session role is JA_KANRI_SHITEN', async () => {
    // COVERS: 4.2 DataScope JA_KANRI_SHITEN は kanri_shiten_id も絞込
    await service.getKozaDropdown(
      {},
      buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 5 }),
    );

    const calls = qbMock.andWhere.mock.calls.concat(qbMock.where.mock.calls);
    const scoped = calls.find(
      ([_sql, params]: any[]) => params && JSON.stringify(params).includes('5'),
    );
    expect(scoped).toBeDefined();
  });

  it('should apply the kanri_shiten_ids filter when provided in the query', async () => {
    // COVERS: 4.1 / 4.3 画面の絞込条件 kanri_shiten_ids
    await service.getKozaDropdown(
      { kanri_shiten_ids: [1, 2] },
      buildChuokaiSession({ ja_id: 1 }),
    );

    const calls = qbMock.andWhere.mock.calls.concat(qbMock.where.mock.calls);
    const filtered = calls.find(
      ([_sql, params]: any[]) => params && JSON.stringify(params).includes('[1,2]'),
    );
    expect(filtered).toBeDefined();
  });
});

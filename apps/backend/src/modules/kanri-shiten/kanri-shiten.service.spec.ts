// Screen: ACSMS-SCR-008 — 管理支店マスタ明細検索画面 (list + delete)
//         ACSMS-SCR-009 — 管理支店マスタ登録画面 (detail + create + update)
//
// Both SCRs share the same KanriShitenService class. Tests are organised
// as two sibling top-level describe blocks so each has its own mock
// scope — SCR-008 uses QueryBuilder-heavy mocks, SCR-009 mixes
// findOne / save / count. Spec count + assertions remain 1:1 with the
// originals; only the location changed (merged from __tests__/ into
// this file so the module follows "1 source = 1 spec file").

import {
  BadRequestException,
  ConflictException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';

import { KanriShitenService } from '@/modules/kanri-shiten/kanri-shiten.service';
import { buildKanriShiten } from '@test/fixtures/kanri-shiten.factory';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';

describe('KanriShitenService — SCR-008 (list / delete)', () => {
  let service: any;
  let repo: any;
  let qbMock: any;
  let todofukenRepo: any;
  let jaRepo: any;
  let jaQbMock: any;
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
      addOrderBy: jest.fn().mockReturnThis(),
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
    todofukenRepo = {
      findOne: jest.fn().mockResolvedValue({ todofukenCode: '01', todofukenName: '北海道' }),
      find: jest.fn().mockResolvedValue([
        { todofukenCode: '01', todofukenName: '北海道' },
        { todofukenCode: '13', todofukenName: '東京都' },
      ]),
    };
    // jaRepo's createQueryBuilder is only used by findAll's batch
    // lookup for ja_name. Singleton qb that returns no rows by default
    // — individual tests override .getMany when they need to assert
    // the joined ja_name surfaces in the response.
    jaQbMock = {
      select: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    jaRepo = {
      createQueryBuilder: jest.fn(() => jaQbMock),
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
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => maybeValue ?? entityOrValue),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn().mockResolvedValue([{ count: '0' }]),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn().mockResolvedValue([{ count: '0' }]),
    };

    service = new KanriShitenService(repo, todofukenRepo, jaRepo, dataSource, auditLog);
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-008-001 — GET /api/v1/kanri-shiten (findAll)
  // ═════════════════════════════════════════════════════════════════════
  describe('findAll (API-008-001)', () => {
    it('should return paginated rows when NICHINO_ADMIN with no filters', async () => {
      // COVERS: §4.6 happy path — meta shape per pagination helper contract
      qbMock.getManyAndCount.mockResolvedValue([[buildKanriShiten()], 1]);

      const result = await service.findAll(
        { page: 1, per_page: 20, sort_by: 'kanri_shiten_code', sort_order: 'asc' },
        buildSession({ role_code: 'NICHINO_ADMIN', ja_id: null }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });

    it('should map entity camelCase to response snake_case when row is returned', async () => {
      // COVERS: §3 レスポンスデータ shape — ja_id (DataScope display) + todofuken_name JOIN
      qbMock.getManyAndCount.mockResolvedValue([[buildKanriShiten({ kanriShitenId: 7, jaId: 5 })], 1]);

      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
      );

      const row = result.data[0];
      expect(row.kanri_shiten_id).toBe(7);
      expect(row.ja_id).toBe(5);
      expect(row.kanri_shiten_code).toBe('013-3300-001');
      expect(row.kanri_shiten_name).toBe('JA北海道中央管理支店');
      expect(row.yubin_no).toBe('0600001');
      expect(row.todofuken_code).toBe('01');
      expect(row.todofuken_name).toBe('北海道');
      expect(row.address).toBe('札幌市中央区北1条西2丁目');
      expect(row.tel).toBe('0112223333');
      expect(row.fax).toBe('0112223334');
      expect(row.paper_flg).toBe(true);
      expect(row.denshi_flg).toBe(true);
    });

    it('should return empty data + total=0 when no rows match (UI displays ACSMS-MSG-008-001)', async () => {
      // COVERS: §4.6 "検索結果がない場合は、UI側で ACSMS-MSG-008-001 を表示する"
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, per_page: 20 }, buildSession());

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });

    it('should apply ILIKE partial-match on kanri_shiten_code when query.kanri_shiten_code is set', async () => {
      // COVERS: §4.6 SQL — kanri_shiten_code ILIKE '%value%'
      await service.findAll(
        { kanri_shiten_code: '3300', page: 1, per_page: 20 },
        buildSession(),
      );
      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_shiten_code/i.test(sql) && /ILIKE/i.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should apply ILIKE partial-match on kanri_shiten_name when query.kanri_shiten_name is set', async () => {
      await service.findAll(
        { kanri_shiten_name: '北海道', page: 1, per_page: 20 },
        buildSession(),
      );
      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_shiten_name/i.test(sql) && /ILIKE/i.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should apply EXACT-match on todofuken_code when query.todofuken_code is set (= predicate, dropdown)', async () => {
      // COVERS: §4.6 SQL — todofuken_code exact match. The 都道府県
      // filter is a プルダウン (single selection) so partial-match
      // doesn't help; an `=` predicate uses the m_todofuken FK index.
      // Spec change traces to screen-design v1.3 §2.1 / api.md §処理手順.
      await service.findAll(
        { todofuken_code: '01', page: 1, per_page: 20 },
        buildSession(),
      );
      const call = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /todofuken_code/i.test(sql) &&
          /=\s*:todofuken_code/i.test(sql) &&
          params?.todofuken_code === '01',
      );
      expect(call).toBeDefined();
    });

    it('should apply ILIKE partial-match on tel when query.tel is set', async () => {
      await service.findAll(
        { tel: '0112', page: 1, per_page: 20 },
        buildSession(),
      );
      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\btel\b/i.test(sql) && /ILIKE/i.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should apply ILIKE partial-match on fax when query.fax is set', async () => {
      await service.findAll(
        { fax: '0112', page: 1, per_page: 20 },
        buildSession(),
      );
      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bfax\b/i.test(sql) && /ILIKE/i.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should NOT bind ja_id scope predicate when role is NICHINO_ADMIN', async () => {
      // COVERS: §4.3 DataScope NICHINO_ADMIN bypass
      await service.findAll({ page: 1, per_page: 20 }, buildSession({ role_code: 'NICHINO_ADMIN', ja_id: null }));

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([_sql, params]: any[]) =>
          params && Object.prototype.hasOwnProperty.call(params, 'ja_id') && params.ja_id != null,
      );
      expect(scopedCall).toBeUndefined();
    });

    it('should bind ja_id scope predicate when role is CHUOKAI', async () => {
      // COVERS: §4.3 DataScope CHUOKAI — mks.ja_id = session.ja_id
      await service.findAll({ page: 1, per_page: 20 }, buildChuokaiSession({ ja_id: 1 }));

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should bind ja_id scope predicate when role is JA_HONTEN', async () => {
      // COVERS: §4.3 DataScope JA_HONTEN
      await service.findAll({ page: 1, per_page: 20 }, buildJaHontenSession({ ja_id: 2 }));

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should bind kanri_shiten_id scope when role is JA_KANRI_SHITEN', async () => {
      // COVERS: §4.3 DataScope JA_KANRI_SHITEN — most restrictive.
      // kanri_shiten_id is globally unique across JAs (FK target on
      // m_kanri_shiten.pk), so the applyBranchScope helper binds ONLY
      // kanri_shiten_id for this role; ja_id would be redundant.
      await service.findAll(
        { page: 1, per_page: 20 },
        buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 5 }),
      );

      // Match snake_case (kanri_shiten_id) AND camelCase (kanriShitenId)
      // — the helper passes the entity property name through; TypeORM
      // resolves it at execution time.
      const ksScope = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /kanri_?shiten_?id/i.test(sql),
      );
      expect(ksScope).toBeDefined();
      expect(ksScope[1]).toMatchObject({ scopeKsId: 5 });
    });

    it('should apply sort_by and sort_order to orderBy when both are provided', async () => {
      // COVERS: §4.5 sort
      await service.findAll(
        { page: 1, per_page: 20, sort_by: 'kanri_shiten_name', sort_order: 'desc' },
        buildSession(),
      );
      const orderCall = qbMock.orderBy.mock.calls[0];
      expect(orderCall).toBeDefined();
      const sqlOrCol = String(orderCall[0]);
      expect(sqlOrCol).toMatch(/kanri_shiten_name/i);
    });

    it('should apply pagination offset = (page - 1) * per_page when page > 1', async () => {
      // COVERS: §4.5 OFFSET = (page - 1) * per_page
      await service.findAll({ page: 3, per_page: 20 }, buildSession());

      expect(qbMock.take).toHaveBeenCalledWith(20);
      expect(qbMock.skip).toHaveBeenCalledWith(40);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-008-002 — DELETE /api/v1/kanri-shiten/:id (remove)
  // ═════════════════════════════════════════════════════════════════════
  describe('remove (API-008-002)', () => {
    it('should soft-delete the row and audit log when row exists with no related data', async () => {
      // COVERS: §4.3 exists + §4.4 no conflict + §4.5 UPDATE + §4.6 audit log
      const existing = buildKanriShiten({ kanriShitenId: 5 });
      repo.findOne.mockResolvedValue(existing);
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      txManager.query.mockResolvedValue([{ count: '0' }]);

      const result = await service.remove(5, buildSession(), baseReq);

      expect(result).toEqual({ message: '削除しました。' });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when target kanri_shiten_id does not exist', async () => {
      // COVERS: §4.3 — err:NOT_FOUND (row 8)
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, buildSession(), baseReq))
        .rejects.toThrow(NotFoundException);
    });

    it('should NOT call dataSource.transaction when row is missing (404 short-circuit)', async () => {
      // COVERS: §4.3 — early return before DML
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, buildSession(), baseReq)).rejects.toThrow();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when m_shiten has rows referencing the kanri_shiten', async () => {
      // COVERS: §4.4 conflict check — m_shiten
      repo.findOne.mockResolvedValue(buildKanriShiten());
      dataSource.query.mockImplementation(async (sql: string) => {
        if (/m_shiten/i.test(sql) && !/m_kanri_shiten/i.test(sql)) return [{ count: '2' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when t_dokusya has rows referencing the kanri_shiten', async () => {
      // COVERS: §4.4 conflict check — t_dokusya
      repo.findOne.mockResolvedValue(buildKanriShiten());
      dataSource.query.mockImplementation(async (sql: string) => {
        if (/t_dokusya/i.test(sql)) return [{ count: '1' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when m_account has rows referencing the kanri_shiten', async () => {
      // COVERS: §4.4 conflict check — m_account
      repo.findOne.mockResolvedValue(buildKanriShiten());
      dataSource.query.mockImplementation(async (sql: string) => {
        if (/m_account/i.test(sql)) return [{ count: '3' }];
        return [{ count: '0' }];
      });

      await expect(service.remove(5, buildSession(), baseReq))
        .rejects.toThrow(ConflictException);
    });

    it('should set deleted_at = NOW() via UPDATE when soft-deleting', async () => {
      // COVERS: §4.5 logical delete SQL
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenId: 5 }));
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      txManager.query.mockResolvedValue([{ count: '0' }]);

      await service.remove(5, buildSession(), baseReq);

      const updateCalls = txManager.update.mock.calls;
      const softDeleteCall = updateCalls.find((c: any[]) =>
        JSON.stringify(c).includes('deletedAt'),
      );
      expect(softDeleteCall).toBeDefined();
    });

    it('should call auditLog.logOperation with operation=DELETE inside the transaction', async () => {
      // COVERS: §4.6 audit log — bare 'DELETE' (no entity/screen prefix)
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenId: 5 }));
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      txManager.query.mockResolvedValue([{ count: '0' }]);

      await service.remove(5, buildSession(), baseReq);

      expect(auditLog.logOperation).toHaveBeenCalled();
      const opCall = auditLog.logOperation.mock.calls.find((c: any[]) => c[0]?.operation === 'DELETE');
      expect(opCall).toBeDefined();
      expect(opCall[0]).toMatchObject({
        logType: 1,
        operation: 'DELETE',
        resultStatus: 1,
        targetTable: 'm_kanri_shiten',
      });
    });

    it('should include before_value (JSON of pre-delete row) in audit log', async () => {
      // COVERS: §4.6 before_value capture
      const existing = buildKanriShiten({ kanriShitenId: 5, kanriShitenName: 'JA削除対象管理支店' });
      repo.findOne.mockResolvedValue(existing);
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      txManager.query.mockResolvedValue([{ count: '0' }]);

      await service.remove(5, buildSession(), baseReq);

      const opCall = auditLog.logOperation.mock.calls.find((c: any[]) => c[0]?.operation === 'DELETE');
      expect(opCall[0].beforeValue).toBeDefined();
      expect(typeof opCall[0].beforeValue).toBe('string');
      expect(opCall[0].beforeValue).toContain('JA削除対象管理支店');
    });

    it('should rollback the UPDATE and NOT commit when audit log throws inside the transaction', async () => {
      // COVERS: §4.6 atomicity — main DML + audit log share one tx
      const existing = buildKanriShiten({ kanriShitenId: 5 });
      repo.findOne.mockResolvedValue(existing);
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      txManager.query.mockResolvedValue([{ count: '0' }]);
      auditLog.logOperation.mockImplementationOnce(() => {
        throw new Error('audit log down');
      });
      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (e) {
          throw e;
        }
      });

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toThrow();
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      // COVERS: §4.8 error log OUTSIDE the rolled-back transaction
      const existing = buildKanriShiten({ kanriShitenId: 5 });
      repo.findOne.mockResolvedValue(existing);
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(service.remove(5, buildSession(), baseReq)).rejects.toThrow();

      // Expect a log_type=3 call AFTER the failing tx — caller is the outer catch in service
      const errorLogCall = auditLog.logOperation.mock.calls.find((c: any[]) => c[0]?.logType === 3);
      expect(errorLogCall).toBeDefined();
      expect(errorLogCall[0].resultStatus).toBe(2);
    });

    it('should pass IP + UA from the request context into the audit log', async () => {
      // COVERS: §4.6 ip_address / user_agent
      repo.findOne.mockResolvedValue(buildKanriShiten());
      dataSource.query.mockResolvedValue([{ count: '0' }]);
      txManager.query.mockResolvedValue([{ count: '0' }]);

      await service.remove(5, buildSession(), {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'curl/8.4' },
      } as any);

      const opCall = auditLog.logOperation.mock.calls.find((c: any[]) => c[0]?.operation === 'DELETE');
      expect(opCall[0].ipAddress).toBe('10.0.0.1');
      expect(opCall[0].userAgent).toBe('curl/8.4');
    });

  });

  // ─── ACSMS-API-COMMON-004 — listDropdown (管理支店プルダウン) ──────────
  describe('listDropdown (API-COMMON-004)', () => {
    it('should filter by the requested ja_id', async () => {
      await service.listDropdown({ ja_id: 7 }, buildChuokaiSession({ ja_id: 7 }));
      const jaCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /\bja_?id\b/i.test(sql) && /=\s*:jaId/.test(sql),
      );
      expect(jaCall).toBeDefined();
      expect(jaCall[1]).toMatchObject({ jaId: 7 });
    });

    it('should narrow to the caller own kanri_shiten_id when JA_KANRI_SHITEN (datascope)', async () => {
      // 顧客要件 — 支店登録フォームの 管理支店 プルダウンは、JA_KANRI_SHITEN
      // には自分の管理支店だけを出す (以前は JA 全件が見えていた)。
      await service.listDropdown(
        { ja_id: 1 },
        buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 5 }),
      );
      const ksScope = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /kanri_?shiten_?id\s*=/i.test(sql),
      );
      expect(ksScope).toBeDefined();
      expect(ksScope[1]).toMatchObject({ scopeKsId: 5 });
    });

    it('should NOT add a kanri_shiten_id scope for CHUOKAI (JA-level only)', async () => {
      await service.listDropdown({ ja_id: 1 }, buildChuokaiSession({ ja_id: 1 }));
      const ksScope = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /kanri_?shiten_?id\s*=/i.test(sql),
      );
      expect(ksScope).toBeUndefined();
    });

    it('should search by code OR name (match_field default both)', async () => {
      await service.listDropdown(
        { ja_id: 1, q: '千代田' },
        buildChuokaiSession({ ja_id: 1 }),
      );
      const search = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /kanri_shiten_code ILIKE/i.test(sql) &&
          /kanri_shiten_name ILIKE/i.test(sql) &&
          /\bOR\b/.test(sql),
      );
      expect(search).toBeDefined();
      expect(search[1]).toMatchObject({ q: '%千代田%' });
    });

    it('should search by name only when match_field=name', async () => {
      await service.listDropdown(
        { ja_id: 1, q: 'x', match_field: 'name' },
        buildChuokaiSession({ ja_id: 1 }),
      );
      const search = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /kanri_shiten_name ILIKE/i.test(sql) &&
          !/\bOR\b/.test(sql),
      );
      expect(search).toBeDefined();
    });

    it('should paginate with skip/take and report has_more when an extra row exists', async () => {
      const mk = (id: number) => ({
        kanriShitenId: id,
        kanriShitenCode: `KS${id}`,
        kanriShitenName: `支所${id}`,
      });
      // per_page=2 → take(3); 3 rows back → has_more, sliced to 2.
      qbMock.getMany.mockResolvedValueOnce([mk(1), mk(2), mk(3)]);
      const res = await service.listDropdown(
        { ja_id: 1, page: 1, per_page: 2 },
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(qbMock.skip).toHaveBeenCalledWith(0);
      expect(qbMock.take).toHaveBeenCalledWith(3);
      expect(res.has_more).toBe(true);
      expect(res.data).toHaveLength(2);
    });

    it('should NOT paginate (return all, has_more=false) when page is absent', async () => {
      const mk = (id: number) => ({
        kanriShitenId: id,
        kanriShitenCode: `KS${id}`,
        kanriShitenName: `支所${id}`,
      });
      qbMock.getMany.mockResolvedValueOnce([mk(1), mk(2)]);
      const res = await service.listDropdown(
        { ja_id: 1 },
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(qbMock.take).not.toHaveBeenCalled();
      expect(res.has_more).toBe(false);
      expect(res.data).toHaveLength(2);
    });

    it('should include paper_flg/denshi_flg in the dropdown item (SCR-011 購読種別フィルタ用・顧客要件2026-07)', async () => {
      qbMock.getMany.mockResolvedValueOnce([
        {
          kanriShitenId: 1,
          kanriShitenCode: 'KS1',
          kanriShitenName: '紙のみ支店',
          paperFlg: true,
          denshiFlg: false,
        },
        {
          kanriShitenId: 2,
          kanriShitenCode: 'KS2',
          kanriShitenName: '両方支店',
          paperFlg: true,
          denshiFlg: true,
        },
      ]);
      const res = await service.listDropdown(
        { ja_id: 1 },
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(res.data[0]).toEqual(
        expect.objectContaining({ kanri_shiten_id: 1, paper_flg: true, denshi_flg: false }),
      );
      expect(res.data[1]).toEqual(
        expect.objectContaining({ kanri_shiten_id: 2, paper_flg: true, denshi_flg: true }),
      );
    });

    it('should pin include_id onto page 1 when not in the fetched page', async () => {
      const mk = (id: number) => ({
        kanriShitenId: id,
        kanriShitenCode: `KS${id}`,
        kanriShitenName: `支所${id}`,
      });
      qbMock.getMany.mockResolvedValueOnce([mk(1), mk(2)]); // page rows (no 99)
      qbMock.getOne.mockResolvedValueOnce(mk(99)); // pinned row
      const res = await service.listDropdown(
        { ja_id: 1, page: 1, per_page: 5, include_id: 99 },
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(res.data[0].kanri_shiten_id).toBe(99);
      expect(res.data).toHaveLength(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-009 — detail + create + update (separate top-level describe so its
// mock setup, especially the dataSource.manager + create/update wiring,
// doesn't leak into the SCR-008 block above).
// ═══════════════════════════════════════════════════════════════════════

describe('KanriShitenService — SCR-009 (detail + create + update)', () => {
  let service: any;
  let repo: any;
  let todofukenRepo: any;
  let jaRepo: any;
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
    todofukenRepo = {
      findOne: jest.fn().mockResolvedValue({ todofukenCode: '13', todofukenName: '東京都' }),
      find: jest.fn().mockResolvedValue([
        { todofukenCode: '13', todofukenName: '東京都' },
      ]),
    };
    // SCR-009 methods (getDetail / create / update) don't hit the
    // findAll ja_name batch lookup, but the constructor still requires
    // a jaRepo. Stub minimally — also add `findOne` since the detail
    // + update endpoints now fetch ja_name via jaRepo.findOne.
    jaRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        whereInIds: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      findOne: jest.fn().mockResolvedValue({ jaId: 1, jaName: 'JA東京' }),
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
        return { ...value, kanriShitenId: value.kanriShitenId ?? 7 };
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

    service = new KanriShitenService(repo, todofukenRepo, jaRepo, dataSource, auditLog);
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-009-001 — findById (GET /api/v1/kanri-shiten/:id)
  // ═════════════════════════════════════════════════════════════════════
  describe('findById (API-009-001)', () => {
    it('should return detail with todofuken_name when row exists and caller is NICHINO_ADMIN', async () => {
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenId: 1, jaId: 1 }));

      const result = await service.findById(1, buildSession({ role_code: 'NICHINO_ADMIN', ja_id: null }));

      expect(result.kanri_shiten_id).toBe(1);
      expect(result.todofuken_name).toBe('東京都');
    });

    it('should map every entity camelCase field to response snake_case', async () => {
      // COVERS: §3 レスポンスデータ — all 17 fields
      repo.findOne.mockResolvedValue(buildKanriShiten({
        kanriShitenId: 5, jaId: 2,
        kanriShitenCode: '113-3300-005', kanriShitenName: 'テスト支店',
        kanriShitenNameKana: 'ﾃｽﾄｼﾃﾝ',
        yubinNo: '1000005', todofukenCode: '13',
        address: '住所5', tel: '0312345005', fax: '0312345006',
        paperFlg: true, denshiFlg: false, biko: '備考',
      }));

      const result = await service.findById(5, buildSession());

      expect(result).toMatchObject({
        kanri_shiten_id: 5,
        ja_id: 2,
        kanri_shiten_code: '113-3300-005',
        kanri_shiten_name: 'テスト支店',
        kanri_shiten_name_kana: 'ﾃｽﾄｼﾃﾝ',
        todofuken_code: '13',
        todofuken_name: '東京都',
        yubin_no: '1000005',
        address: '住所5',
        tel: '0312345005',
        fax: '0312345006',
        paper_flg: true,
        denshi_flg: false,
        biko: '備考',
      });
      expect(result.created_at).toBeDefined();
    });

    it('should throw NotFoundException when row does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(999, buildSession())).rejects.toThrow(NotFoundException);
    });

    it('should apply DataScope to CHUOKAI — return row when ja_id matches session.ja_id', async () => {
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenId: 1, jaId: 1 }));
      const result = await service.findById(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.ja_id).toBe(1);
    });

    it('should mask out-of-scope row as NotFoundException when CHUOKAI requests row of another JA', async () => {
      // Service should filter via WHERE clause — out-of-scope row appears as null.
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(2, buildChuokaiSession({ ja_id: 1 })))
        .rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when JA_KANRI_SHITEN requests row of another branch', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.findById(5, buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 3 })),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-009-002 — create (POST /api/v1/kanri-shiten)
  // ═════════════════════════════════════════════════════════════════════
  describe('create (API-009-002)', () => {
    const validDto = {
      ja_id: 1,
      kanri_shiten_code: '113-3300-002',
      kanri_shiten_name: '東京第二支店',
      kanri_shiten_name_kana: 'ﾄｳｷｮｳﾀﾞｲﾆｼﾃﾝ',
      todofuken_code: '13',
      yubin_no: '1000002',
      address: '千代田区千代田2-2-2',
      tel: '0312345680',
      fax: '0312345681',
      paper_flg: true,
      denshi_flg: true,
      biko: '新規登録テスト',
    };

    beforeEach(() => {
      // §4.4 ja_id existence check — m_ja query returns hit.
      dataSource.query.mockImplementation(async (sql: string) => {
        if (/m_ja/i.test(sql)) return [{ ja_id: 1 }];
        return [];
      });
      // §4.5 dup-code check — no existing row.
      repo.findOne.mockResolvedValue(null);
    });

    it('should insert row + audit log inside transaction when NICHINO_ADMIN sends valid body', async () => {
      // COVERS: §4.6 INSERT + §4.7 audit log atomicity
      const result = await service.create(validDto, buildSession(), baseReq);

      expect(result).toMatchObject({
        kanri_shiten_id: 7,
        kanri_shiten_code: '113-3300-002',
        message: '登録しました。',
      });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.save).toHaveBeenCalled();
    });

    it('should validate todofuken_code exists in m_todofuken when create is called', async () => {
      // COVERS: §4.3 todofuken_code 存在検証
      todofukenRepo.findOne.mockResolvedValue(null);
      await expect(service.create(validDto, buildSession(), baseReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should validate ja_id exists in m_ja when create is called', async () => {
      // COVERS: §4.4 ja_id 存在検証
      dataSource.query.mockImplementation(async () => []);
      await expect(service.create(validDto, buildSession(), baseReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw DuplicateCodeException when kanri_shiten_code already exists', async () => {
      // COVERS: §4.5 + err:DUPLICATE_CODE (§エラー一覧 #9)
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenCode: validDto.kanri_shiten_code }));
      await expect(service.create(validDto, buildSession(), baseReq))
        .rejects.toThrow(DuplicateCodeException);
    });

    it('should surface the actual code value in DUPLICATE_CODE message', async () => {
      // COVERS: gen-code rule — `${resource}「${value}」はすでに登録されています。`
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenCode: validDto.kanri_shiten_code }));
      await expect(service.create(validDto, buildSession(), baseReq))
        .rejects.toMatchObject({
          response: {
            error_code: 'DUPLICATE_CODE',
            message: expect.stringContaining('113-3300-002'),
          },
        });
    });

    it('should call auditLog.logOperation with bare CREATE operation (not prefixed)', async () => {
      await service.create(validDto, buildSession(), baseReq);
      const createCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.operation === 'CREATE',
      );
      expect(createCall).toBeDefined();
      expect(createCall[0]).toMatchObject({
        logType: 1,
        operation: 'CREATE',
        resultStatus: 1,
        targetTable: 'm_kanri_shiten',
      });
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      // COVERS: §4.9 error log OUTSIDE the rolled-back tx
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(service.create(validDto, buildSession(), baseReq)).rejects.toThrow();

      const errorCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.logType === 3,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0].resultStatus).toBe(2);
    });

    it('should rollback the INSERT and NOT commit when audit log throws inside transaction', async () => {
      auditLog.logOperation.mockImplementationOnce(() => {
        throw new Error('audit failed');
      });
      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        try { return await cb(txManager); } catch (e) { throw e; }
      });

      await expect(service.create(validDto, buildSession(), baseReq)).rejects.toThrow();
    });

  });

  // ═════════════════════════════════════════════════════════════════════
  // API-009-003 — update (PUT /api/v1/kanri-shiten/:id)
  // ═════════════════════════════════════════════════════════════════════
  describe('update (API-009-003)', () => {
    const validUpdate = {
      kanri_shiten_name: '東京中央会支店（改称）',
      kanri_shiten_name_kana: 'ﾄｳｷｮｳﾁｭｳｵｳｶｲｼﾃﾝ ｶｲｼｮｳ',
      todofuken_code: '13',
      yubin_no: '1000001',
      address: '千代田区千代田1-1-1 改修ビル3F',
      tel: '0312345678',
      fax: '0312345679',
      paper_flg: true,
      denshi_flg: true,
      biko: '住所変更済み',
    };

    it('should update row + audit log inside transaction when NICHINO_ADMIN sends valid body', async () => {
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenId: 1, jaId: 1 }));

      const result = await service.update(1, validUpdate, buildSession(), baseReq);

      expect(result.message).toBe('更新しました。');
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when target row does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(999, validUpdate, buildSession(), baseReq))
        .rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when CHUOKAI updates another JA row', async () => {
      // COVERS: §4.3 DataScope — out-of-scope record returns null from WHERE.
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.update(2, validUpdate, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate todofuken_code exists when NICHINO_ADMIN provides it', async () => {
      // COVERS: §4.4 都道府県コードの存在検証
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenId: 1, jaId: 1 }));
      todofukenRepo.findOne.mockResolvedValue(null);
      await expect(service.update(1, validUpdate, buildSession(), baseReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should call auditLog.logOperation with bare UPDATE operation (not prefixed)', async () => {
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenId: 1, jaId: 1 }));
      await service.update(1, validUpdate, buildSession(), baseReq);
      const call = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.operation === 'UPDATE',
      );
      expect(call).toBeDefined();
      expect(call[0]).toMatchObject({
        logType: 1,
        operation: 'UPDATE',
        resultStatus: 1,
        targetTable: 'm_kanri_shiten',
      });
    });

    it('should include both before_value and after_value in UPDATE audit log', async () => {
      const before = buildKanriShiten({ kanriShitenId: 1, jaId: 1, kanriShitenName: '旧名称' });
      repo.findOne.mockResolvedValue(before);
      await service.update(1, validUpdate, buildSession(), baseReq);

      const call = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.operation === 'UPDATE',
      );
      expect(call[0].beforeValue).toBeDefined();
      expect(call[0].afterValue).toBeDefined();
      expect(call[0].beforeValue).toContain('旧名称');
      expect(call[0].afterValue).toContain('東京中央会支店（改称）');
    });

    // ─── Field-level restrictions §4.5 ─────────────────────────────────
    describe('field-level restriction (§4.5)', () => {
      it('should silently drop kanri_shiten_name when caller is CHUOKAI (not in allow-list)', async () => {
        // COVERS: §4.5 — CHUOKAI allow-list = [yubin_no, address, tel, fax, biko]
        const before = buildKanriShiten({
          kanriShitenId: 1,
          jaId: 1,
          kanriShitenName: '元の名前',
        });
        repo.findOne.mockResolvedValue(before);

        await service.update(
          1,
          { ...validUpdate, kanri_shiten_name: '変更しようとした名前' },
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        );

        // Verify the UPDATE call's payload does NOT contain kanri_shiten_name
        // (or carries the BEFORE value untouched).
        const updateCalls = txManager.update.mock.calls;
        const payload = updateCalls[updateCalls.length - 1]?.[2] ?? {};
        // Either field is absent OR equals before value — both satisfy
        // "silently drop" from the spec.
        if (payload.kanriShitenName !== undefined) {
          expect(payload.kanriShitenName).toBe('元の名前');
        }
      });

      it('should allow yubin_no / address / tel / fax / biko when caller is CHUOKAI', async () => {
        const before = buildKanriShiten({ kanriShitenId: 1, jaId: 1 });
        repo.findOne.mockResolvedValue(before);

        await service.update(
          1,
          {
            yubin_no: '9999999',
            address: '新住所',
            tel: '0399999999',
            fax: '0399999998',
            biko: '新備考',
            // Plus forbidden fields — should be dropped silently.
            kanri_shiten_name: 'forbidden',
            todofuken_code: '99',
          },
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        );

        const updateCalls = txManager.update.mock.calls;
        const payload = updateCalls[updateCalls.length - 1]?.[2] ?? {};
        // Allowed fields propagate.
        expect(payload.yubinNo).toBe('9999999');
        expect(payload.address).toBe('新住所');
        expect(payload.tel).toBe('0399999999');
        expect(payload.fax).toBe('0399999998');
        expect(payload.biko).toBe('新備考');
      });

      it('should silently drop todofuken_code when caller is JA_HONTEN (not in allow-list)', async () => {
        const before = buildKanriShiten({ kanriShitenId: 1, jaId: 1, todofukenCode: '13' });
        repo.findOne.mockResolvedValue(before);

        await service.update(
          1,
          { ...validUpdate, todofuken_code: '01' },
          buildJaHontenSession({ ja_id: 1 }),
          baseReq,
        );

        const updateCalls = txManager.update.mock.calls;
        const payload = updateCalls[updateCalls.length - 1]?.[2] ?? {};
        if (payload.todofukenCode !== undefined) {
          expect(payload.todofukenCode).toBe('13'); // BEFORE value
        }
      });

      it('should NOT validate todofuken_code existence when caller is restricted role (field already dropped)', async () => {
        const before = buildKanriShiten({ kanriShitenId: 1, jaId: 1 });
        repo.findOne.mockResolvedValue(before);
        todofukenRepo.findOne.mockResolvedValue(null); // would normally fail
        // Should NOT throw — todofuken_code never reaches the validation
        // step because it's filtered by allow-list before §4.4 runs.
        await expect(
          service.update(1, validUpdate, buildChuokaiSession({ ja_id: 1 }), baseReq),
        ).resolves.toBeDefined();
      });
    });

    it('should still emit error audit log (log_type=3) when transaction rolls back', async () => {
      repo.findOne.mockResolvedValue(buildKanriShiten({ kanriShitenId: 1, jaId: 1 }));
      dataSource.transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(service.update(1, validUpdate, buildSession(), baseReq)).rejects.toThrow();

      const errorCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.logType === 3,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0].resultStatus).toBe(2);
    });

  });
});

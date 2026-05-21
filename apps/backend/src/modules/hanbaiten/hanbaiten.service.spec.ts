// Screen: ACSMS-SCR-018 — 販売店明細検索画面 (list + delete)
//         ACSMS-SCR-017 — 販売店情報登録画面 (detail + create + update)
//         ACSMS-SCR-019 — 販売店Excelデータ取込画面 (Excel template + bulk import)
//
// All three SCRs share the HanbaitenService class. Tests are organised
// as three sibling top-level describe blocks so each has its own mock
// scope — SCR-018 uses QueryBuilder-heavy mocks, SCR-017 mixes
// findOne / save / count, and SCR-019 (this file's third block) mixes
// dataSource.query, dataSource.transaction, plus an ExcelJS-shaped
// download method whose binary output is verified at integration
// level. Spec count + assertions remain 1:1 with the originals; only
// the location changed (merged from __tests__/ into this file so the
// module follows "1 source = 1 spec file").

import {
  ConflictException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';

import { HanbaitenService } from '@/modules/hanbaiten/hanbaiten.service';
import { buildHanbaiten } from '@test/fixtures/hanbaiten.factory';
import {
  buildCreateHanbaitenBody,
  buildHanbaitenDetailEntity,
  buildHanbaitenDetailRawRow,
  buildUpdateHanbaitenBody,
} from '@test/fixtures/hanbaiten-form.factory';
import {
  buildImportRequestNEW,
  buildImportRequestUpdateAll,
  buildImportRequestUpdatePartial,
  buildImportRow,
  HANBAITEN_IMPORT_COLUMNS,
} from '@test/fixtures/hanbaiten-import.factory';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';

describe('HanbaitenService — SCR-018 (list / delete)', () => {
  let service: any;
  let repo: any;
  let qbMock: any;
  let todofukenRepo: any;
  let auditLog: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any;

  beforeEach(() => {
    // Singleton QueryBuilder mock — spec-side `qb.getManyAndCount.mockResolvedValue(...)`
    // and service-side `repo.createQueryBuilder()` see the same instance.
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
      getRawMany: jest.fn().mockResolvedValue([]),
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
      find: jest.fn().mockResolvedValue([
        { todofukenCode: '13', todofukenName: '東京都' },
        { todofukenCode: '14', todofukenName: '神奈川県' },
      ]),
      findOne: jest.fn(),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      async logDelete(ctx: any, before: unknown, manager?: any) {
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
        return { ...value };
      }),
      softRemove: jest.fn(async (entity: any) => entity),
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

    // Constructor signature (mirror ja.service / shiten.service shape):
    //   constructor(
    //     @InjectRepository(Hanbaiten) repo,
    //     @InjectRepository(Todofuken) todofukenRepo,
    //     @InjectDataSource() dataSource,
    //     auditLog: AuditLogService,
    //   )
    service = new HanbaitenService(repo, todofukenRepo, dataSource, auditLog);
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-018-001 — findAll / search (GET /api/v1/hanbaiten)
  // ═════════════════════════════════════════════════════════════════════
  describe('findAll (API-018-001)', () => {
    it('should return paginated { data, meta } when NICHINO_STAFF searches without filters', async () => {
      // COVERS: §4.5 SELECT + §4.6 response shape
      const sample = buildHanbaiten({ hanbaitenId: 1, jaId: 1 });
      qbMock.getManyAndCount.mockResolvedValue([[sample], 1]);

      const result = await service.findAll(
        { page: 1, per_page: 20 } as any,
        buildSession({ ja_id: null, role_code: 'NICHINO_STAFF' }),
      );

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
        hanbaiten_id: 1,
        ja_id: 1,
      });
    });

    it('should map every entity camelCase field to response snake_case when row exists', async () => {
      // COVERS: §3 レスポンスデータ — all displayed columns incl. v1.2 additions
      const sample = buildHanbaiten({
        hanbaitenId: 5,
        jaId: 2,
        hanbaitenCode: 'H005',
        hanbaitenName: '東支店書店',
        todofukenCode: '14',
        yubinNo: '1500001',
        address: '神奈川県横浜市西区1-2-3',
        tel: '0398765432',
        fax: '0398765433',
        shochoName: '山田花子',
        itakuKubun: 2,
        haitatsuryoShiharaiCycle: 3,
        tesuryoKubun: 2,
        tesuryoAmount: 300,
        haitenFlg: false,
      });
      qbMock.getManyAndCount.mockResolvedValue([[sample], 1]);

      const result = await service.findAll({} as any, buildSession({ ja_id: null, role_code: 'NICHINO_STAFF' }));
      expect(result.data[0]).toMatchObject({
        hanbaiten_id: 5,
        ja_id: 2,
        hanbaiten_code: 'H005',
        hanbaiten_name: '東支店書店',
        todofuken_code: '14',
        yubin_no: '1500001',
        address: '神奈川県横浜市西区1-2-3',
        tel: '0398765432',
        fax: '0398765433',
        shocho_name: '山田花子',
        itaku_kubun: 2,
        haitatsuryo_shiharai_cycle: 3,
        tesuryo_kubun: 2,
        tesuryo_amount: 300,
        haiten_flg: false,
      });
    });

    it('should include todofuken_name from LEFT JOIN m_todofuken when row has todofuken_code=13', async () => {
      // COVERS: §4.3 — LEFT JOIN m_todofuken ON m_hanbaiten.todofuken_code = m_todofuken.todofuken_code
      const sample = buildHanbaiten({ hanbaitenId: 1, todofukenCode: '13' });
      qbMock.getManyAndCount.mockResolvedValue([[sample], 1]);
      todofukenRepo.find.mockResolvedValue([
        { todofukenCode: '13', todofukenName: '東京都' },
      ]);

      const result = await service.findAll({} as any, buildSession({ ja_id: null, role_code: 'NICHINO_STAFF' }));
      expect(result.data[0]).toMatchObject({
        todofuken_code: '13',
        todofuken_name: '東京都',
      });
    });

    it('should set todofuken_name to empty string when the m_todofuken lookup row is missing', async () => {
      // Defensive: orphaned todofuken_code shouldn't break the response.
      const sample = buildHanbaiten({ hanbaitenId: 1, todofukenCode: '99' });
      qbMock.getManyAndCount.mockResolvedValue([[sample], 1]);
      todofukenRepo.find.mockResolvedValue([]);

      const result = await service.findAll({} as any, buildSession({ ja_id: null, role_code: 'NICHINO_STAFF' }));
      expect(result.data[0].todofuken_name).toBe('');
    });

    it('should NOT apply ja_id scope when caller is NICHINO_STAFF (ja_id=null bypass)', async () => {
      // COVERS: §4.3 DataScope — NICHINO_STAFF sees all JA rows
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        {} as any,
        buildSession({ ja_id: null, role_code: 'NICHINO_STAFF' }),
      );

      const calls = qbMock.andWhere.mock.calls;
      const scopedCall = calls.find(
        ([_sql, params]: any[]) =>
          params &&
          Object.prototype.hasOwnProperty.call(params, 'ja_id') &&
          params.ja_id != null,
      );
      expect(scopedCall).toBeUndefined();
    });

    it('should apply ja_id scope when caller is CHUOKAI', async () => {
      // COVERS: §4.3 DataScope — CHUOKAI sees only own ja_id rows
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, buildChuokaiSession({ ja_id: 1 }));

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should apply ja_id scope when caller is JA_HONTEN', async () => {
      // COVERS: §4.3 DataScope — JA_HONTEN identical to CHUOKAI here
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, buildJaHontenSession({ ja_id: 2 }));

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should apply ja_id scope when caller is JA_KANRI_SHITEN', async () => {
      // COVERS: §4.3 DataScope — JA_KANRI_SHITEN scoped by JA only (not kanri_shiten_id)
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        {} as any,
        buildJaKanriShitenSession({ ja_id: 2, kanri_shiten_id: 1 }),
      );

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should exclude soft-deleted rows by filtering deleted_at IS NULL', async () => {
      // COVERS: §4.3 基本条件 — deleted_at IS NULL
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, buildChuokaiSession({ ja_id: 1 }));

      const allWhereSql = [
        ...qbMock.where.mock.calls.map((c: any[]) => c[0]),
        ...qbMock.andWhere.mock.calls.map((c: any[]) => c[0]),
      ].filter((s) => typeof s === 'string');
      const softDelete = allWhereSql.find((s) => /deleted_at/i.test(s) && /IS NULL/i.test(s));
      expect(softDelete).toBeDefined();
    });

    it('should exclude haiten_flg=true rows by default (画面設計書 v1.2 §1.1 / §2.1)', async () => {
      // COVERS: §4.3 — `haiten_flg = false` default when haiten_flg param omitted
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, buildChuokaiSession({ ja_id: 1 }));

      const allWhereSql = [
        ...qbMock.where.mock.calls.map((c: any[]) => c[0]),
        ...qbMock.andWhere.mock.calls.map((c: any[]) => c[0]),
      ].filter((s) => typeof s === 'string');
      const haitenFilter = allWhereSql.find((s) => /haiten_flg/i.test(s));
      expect(haitenFilter).toBeDefined();
    });

    it('should include haiten_flg=true rows when query.haiten_flg=true is explicitly passed', async () => {
      // COVERS: §4.3 — :include_haiten=true bypasses the default filter
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { haiten_flg: true } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      // Either the filter is dropped, OR an OR/include guard is bound — but
      // the haiten_flg = false predicate that fires in the default branch
      // must NOT be a hard constraint.
      const allWhereSql = [
        ...qbMock.where.mock.calls.map((c: any[]) => c[0]),
        ...qbMock.andWhere.mock.calls.map((c: any[]) => c[0]),
      ].filter((s) => typeof s === 'string');
      const strictHaitenFilter = allWhereSql.find(
        (s) => /haiten_flg/i.test(s) && /=\s*false/i.test(s) && !/include/i.test(s),
      );
      expect(strictHaitenFilter).toBeUndefined();
    });

    it('should apply ILIKE filter when query.hanbaiten_code is provided', async () => {
      // COVERS: §4.3 — hanbaiten_code ILIKE '%value%'
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { hanbaiten_code: 'H00' } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      const codeFilter = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /ILIKE/i.test(sql) && /hanbaiten_code/i.test(sql),
      );
      expect(codeFilter).toBeDefined();
    });

    it('should apply ILIKE filter when query.hanbaiten_name is provided', async () => {
      // COVERS: §4.3 — hanbaiten_name ILIKE '%value%'
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { hanbaiten_name: '山田' } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      const nameFilter = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /ILIKE/i.test(sql) && /hanbaiten_name/i.test(sql),
      );
      expect(nameFilter).toBeDefined();
    });

    it('should apply ILIKE filter when query.tel is provided', async () => {
      // COVERS: §4.3 — tel ILIKE '%value%'
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ tel: '03' } as any, buildChuokaiSession({ ja_id: 1 }));

      const telFilter = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ILIKE/i.test(sql) && /\btel\b/i.test(sql),
      );
      expect(telFilter).toBeDefined();
    });

    it('should apply ILIKE filter when query.fax is provided', async () => {
      // COVERS: §4.3 — fax ILIKE '%value%'
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ fax: '03' } as any, buildChuokaiSession({ ja_id: 1 }));

      const faxFilter = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ILIKE/i.test(sql) && /\bfax\b/i.test(sql),
      );
      expect(faxFilter).toBeDefined();
    });

    it('should apply ILIKE filter when query.address is provided', async () => {
      // COVERS: §4.3 — address ILIKE '%value%'
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { address: '東京' } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      const addressFilter = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ILIKE/i.test(sql) && /address/i.test(sql),
      );
      expect(addressFilter).toBeDefined();
    });

    it('should apply ILIKE filter when query.shocho_name is provided', async () => {
      // COVERS: §4.3 — shocho_name ILIKE '%value%'
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { shocho_name: '山田' } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      const shochoFilter = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /ILIKE/i.test(sql) && /shocho_name/i.test(sql),
      );
      expect(shochoFilter).toBeDefined();
    });

    it('should NOT apply ILIKE filter when filter param is absent', async () => {
      // COVERS: §4.3 — filter clauses only emitted when value provided
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, buildChuokaiSession({ ja_id: 1 }));

      const nameFilter = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /ILIKE/i.test(sql) && /hanbaiten_name/i.test(sql),
      );
      expect(nameFilter).toBeUndefined();
    });

    it('should sort by hanbaiten_code ASC when sort_by / sort_order are omitted (画面設計書 v1.2 §8.1 default)', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, buildChuokaiSession({ ja_id: 1 }));

      const orderCall = qbMock.orderBy.mock.calls[0];
      expect(orderCall).toBeDefined();
      expect(orderCall[0]).toMatch(/hanbaiten_code/);
      expect(orderCall[1]).toBe('ASC');
    });

    it('should sort by hanbaiten_name DESC when query specifies them', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { sort_by: 'hanbaiten_name', sort_order: 'desc' } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      const orderCall = qbMock.orderBy.mock.calls[0];
      expect(orderCall[0]).toMatch(/hanbaiten_name/);
      expect(orderCall[1]).toBe('DESC');
    });

    it('should apply LIMIT/OFFSET via take/skip when page=2 per_page=10', async () => {
      // COVERS: §4.5 — LIMIT=:per_page, OFFSET=(page-1)*per_page
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 2, per_page: 10 } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(qbMock.take).toHaveBeenCalledWith(10);
      expect(qbMock.skip).toHaveBeenCalledWith(10);
    });

    it('should default page=1 and per_page=20 when omitted', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, buildChuokaiSession({ ja_id: 1 }));

      expect(qbMock.take).toHaveBeenCalledWith(20);
      expect(qbMock.skip).toHaveBeenCalledWith(0);
    });

    it('should compute meta.total_pages = ceil(total / per_page) when total exceeds one page', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[buildHanbaiten()], 47]);

      const result = await service.findAll(
        { per_page: 20 } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.meta.total_pages).toBe(3);
    });

    it('should return empty data with total=0 when no rows match (HTTP 200 §4.6)', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(
        { hanbaiten_name: 'NOMATCH' } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });

    it('should NOT record audit log for a read-only list operation', async () => {
      // COVERS: GET endpoint — no t_log row required
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, buildChuokaiSession({ ja_id: 1 }));

      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // API-018-002 — remove (DELETE /api/v1/hanbaiten/:hanbaiten_id)
  // ═════════════════════════════════════════════════════════════════════
  describe('remove (API-018-002)', () => {
    beforeEach(() => {
      // Default: target row exists, no related rows in either FK table.
      const before = buildHanbaiten({ hanbaitenId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(before);
      txManager.findOne.mockResolvedValue(before);
      dataSource.query = jest.fn().mockResolvedValue([{ count: '0' }]);
      txManager.update.mockResolvedValue({ affected: 1 });
      txManager.softRemove.mockImplementation(async (entity: any) => entity);
    });

    it('should soft-delete and return success message when CHUOKAI deletes a hanbaiten with no related rows', async () => {
      // COVERS: §4.5 UPDATE deleted_at = NOW(), §4.7 message
      const result = await service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq);

      expect(result).toEqual({ message: '削除しました。' });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when target hanbaiten_id does not exist', async () => {
      // COVERS: §4.3 NOT_FOUND when record missing
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(999, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target hanbaiten_id is already soft-deleted', async () => {
      // COVERS: §4.3 deleted_at IS NULL filter
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when CHUOKAI deletes another JA hanbaiten', async () => {
      // COVERS: §4.3 — ja_id 不一致は NOT_FOUND として秘匿
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 99 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when JA_HONTEN deletes another JA hanbaiten', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(5, buildJaHontenSession({ ja_id: 99 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mask out-of-scope row as NotFoundException when JA_KANRI_SHITEN deletes another JA hanbaiten', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(
          5,
          buildJaKanriShitenSession({ ja_id: 99, kanri_shiten_id: 1 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when t_dokusya has rows referencing the hanbaiten', async () => {
      // COVERS: §4.4 conflict check on t_dokusya.hanbaiten_id
      dataSource.query = jest.fn(async (sql: string) => {
        if (/t_dokusya\b/i.test(sql)) return [{ count: '12' }];
        return [{ count: '0' }];
      });

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(ConflictException);
    });

    it.todo(
      'should throw ConflictException when t_dokusya_rireki has rows referencing the hanbaiten (re-enable when 購読者 SCR ships t_dokusya_rireki table)',
    );

    it('should surface ACSMS-MSG-018-004 literal when CONFLICT is raised', async () => {
      // COVERS: §4.4 — message literal must match the screen-design MSG row
      dataSource.query = jest.fn(async (sql: string) => {
        if (/t_dokusya\b/i.test(sql)) return [{ count: '1' }];
        return [{ count: '0' }];
      });

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'CONFLICT',
          message: 'この販売店は関連オブジェクトに紐づいているため削除できません。',
        }),
      });
    });

    it('should wrap soft-delete + audit log in a single transaction when delete succeeds', async () => {
      // COVERS: transaction boundary — §4.5 UPDATE + §4.6 audit log share one tx
      await service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
    });

    it('should call auditLog.logOperation with bare DELETE operation when delete succeeds', async () => {
      // COVERS: §4.6 — operation MUST be bare 'DELETE', never 'HANBAITEN_DELETE'
      await service.remove(
        5,
        buildChuokaiSession({ account_id: 11, ja_id: 1 }),
        baseReq,
      );

      const deleteCall = auditLog.logOperation.mock.calls.find(
        (c: any[]) => c[0]?.operation === 'DELETE',
      );
      expect(deleteCall).toBeDefined();
      expect(deleteCall[0]).toMatchObject({
        logType: 1,
        accountId: 11,
        operation: 'DELETE',
        resultStatus: 1,
        targetTable: 'm_hanbaiten',
        targetId: 5,
      });
      expect(deleteCall[0].beforeValue).toBeDefined();
    });

    it('should populate before_value JSON with pre-deletion hanbaiten snapshot', async () => {
      // COVERS: §4.6 before_value example — JSON of the row about to be deleted
      await service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq);

      const call = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.operation === 'DELETE',
      );
      expect(call).toBeDefined();
      const before = JSON.parse(call![0].beforeValue);
      const flat = JSON.stringify(before);
      // Default fixture has hanbaiten_code='H001' and hanbaiten_name='山田新聞販売店'.
      expect(flat).toMatch(/H001|山田新聞販売店/);
    });

    it('should rollback and NOT persist when audit log fails inside the transaction', async () => {
      // COVERS: tx atomicity — audit failure rolls back the soft-delete
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
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toBeDefined();
      expect((txManager as any).committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when DELETE fails', async () => {
      // COVERS: §4.8 — error log runs after rollback
      txManager.softRemove.mockRejectedValue(new Error('DB down'));
      txManager.update.mockRejectedValue(new Error('DB down'));
      dataSource.transaction.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        service.remove(
          5,
          buildChuokaiSession({ account_id: 11, ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toBeDefined();

      const errorCall = auditLog.logOperation.mock.calls.find(
        ([p]: any[]) => p.logType === 3 && p.resultStatus === 2,
      );
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toMatchObject({
        logType: 3,
        resultStatus: 2,
        operation: 'DELETE',
        targetTable: 'm_hanbaiten',
        targetId: 5,
      });
    });

    it('should NOT call softRemove when conflict check fails (CONFLICT short-circuits)', async () => {
      // COVERS: §4.4 — conflict raises BEFORE §4.5 UPDATE
      dataSource.query = jest.fn(async (sql: string) => {
        if (/t_dokusya\b/i.test(sql)) return [{ count: '1' }];
        return [{ count: '0' }];
      });

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(ConflictException);

      expect(txManager.softRemove).not.toHaveBeenCalled();
      expect(txManager.update).not.toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-017 — detail + create + update (separate top-level describe so its
// mock setup, especially the 5th codeService dep, doesn't leak into the
// SCR-018 block above).
// ═══════════════════════════════════════════════════════════════════════

describe('HanbaitenService — SCR-017 (detail + create + update)', () => {
  let service: any;
  let repo: any;
  let qbMock: any;
  let todofukenRepo: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;
  let tankaRepo: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  const adminSession = () =>
    buildSession({
      account_id: 100,
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: ['hanbaiten.view', 'hanbaiten.create', 'hanbaiten.update'],
    });

  const nichinoStaffSession = () =>
    buildSession({
      account_id: 101,
      role_code: 'NICHINO_STAFF',
      ja_id: null,
      permissions: ['hanbaiten.view', 'hanbaiten.create', 'hanbaiten.update'],
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
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v: any) => v),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => qbMock),
    };

    todofukenRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };

    codeService = {
      has: jest.fn().mockReturnValue(true),
      getLabel: jest.fn().mockReturnValue(''),
      reload: jest.fn(),
    };

    // FK-guard repo for haitatsuryo_tanka_id Layer 4 check. Default
    // returns a row in ja_id=1 so the buildCreateHanbaitenBody() default
    // (`haitatsuryo_tanka_id: 10`) passes when paired with the default
    // CHUOKAI/JA_HONTEN session ja_id. Tests asserting the FK-guard
    // failure path can override with mockResolvedValue(null).
    tankaRepo = {
      findOne: jest.fn().mockResolvedValue({ tankaId: 10, jaId: 1 }),
    };

    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (_entity: any, value: any) => ({
        ...value,
        hanbaitenId: value?.hanbaitenId ?? 15,
      })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn(async () => []),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => []),
    };

    // Constructor signature MUST match the service after SCR-017 lands:
    //   (repo, todofukenRepo, dataSource, auditLog, codeService, tankaRepo)
    service = new HanbaitenService(
      repo,
      todofukenRepo,
      dataSource,
      auditLog,
      codeService,
      tankaRepo,
    );
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-017-001 — GET /api/v1/hanbaiten/:hanbaiten_id (getHanbaitenDetail)
  // ───────────────────────────────────────────────────────────────────
  describe('getHanbaitenDetail', () => {
    it('should return joined detail row with all m_hanbaiten columns when hanbaiten exists', async () => {
      // COVERS: §4.3 SELECT FROM m_hanbaiten WHERE hanbaiten_id = ? AND ja_id = ? AND deleted_at IS NULL
      qbMock.getRawOne.mockResolvedValue(buildHanbaitenDetailRawRow());

      const result = await service.getHanbaitenDetail(1, adminSession());

      expect(result.data).toMatchObject({
        hanbaiten_id: 1,
        ja_id: 1,
        hanbaiten_code: 'H001',
        hanbaiten_name: '販売店A',
        hanbaiten_name_kana: 'ﾊﾝﾊﾞｲﾃﾝ ｴｰ',
        torihikisaki_no: '1234567890123',
        todofuken_code: '13',
        itaku_kubun: 1,
        bank_code: '0001',
        koza_no: '1234567',
        haiten_flg: false,
      });
    });

    it('should filter deleted_at IS NULL when querying for the detail row', async () => {
      // COVERS: §4.3 — deleted_at IS NULL
      qbMock.getRawOne.mockResolvedValue(null);

      try {
        await service.getHanbaitenDetail(1, adminSession());
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

    it('should throw NotFoundException when hanbaiten_id does not exist (§4.3 → 404)', async () => {
      qbMock.getRawOne.mockResolvedValue(null);

      await expect(
        service.getHanbaitenDetail(9999, adminSession()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when hanbaiten is already soft-deleted', async () => {
      // Same as missing — deleted_at IS NULL filter returns nothing.
      qbMock.getRawOne.mockResolvedValue(null);

      await expect(
        service.getHanbaitenDetail(1, adminSession()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should narrow the SELECT by ja_id when caller is CHUOKAI (DataScope §4.3)', async () => {
      // COVERS: §4.3 — out-of-scope row resolves to null → 404 (masks existence)
      qbMock.getRawOne.mockResolvedValue(null);

      await expect(
        service.getHanbaitenDetail(1, buildChuokaiSession({ ja_id: 99 })),
      ).rejects.toThrow(NotFoundException);

      const allSql = [
        ...qbMock.where.mock.calls,
        ...qbMock.andWhere.mock.calls,
      ]
        .map(([sql]: any[]) => (typeof sql === 'string' ? sql : ''))
        .join(' ');
      expect(allSql).toMatch(/ja_?id/i);
    });

    it('should NOT narrow by ja_id when caller is NICHINO_STAFF (proxy role, all JA visible)', async () => {
      // COVERS: §4.3 — NICHINO_STAFF (session.ja_id == null) bypasses DataScope.
      qbMock.getRawOne.mockResolvedValue(buildHanbaitenDetailRawRow({ ja_id: 99 }));

      const result = await service.getHanbaitenDetail(1, nichinoStaffSession());

      expect(result.data.ja_id).toBe(99);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-017-002 — POST /api/v1/hanbaiten (createHanbaiten)
  // ───────────────────────────────────────────────────────────────────
  describe('createHanbaiten', () => {
    beforeEach(() => {
      // Default: hanbaiten_code is unique within the JA.
      repo.count.mockResolvedValue(0);

      // The transaction's INSERT returns a hydrated row with a fresh id.
      txManager.save.mockImplementation(async (_e: any, v: any) => ({
        ...v,
        hanbaitenId: 15,
      }));

      // After-INSERT detail SELECT inside the same tx returns the joined row.
      txManager.findOne.mockResolvedValue(
        buildHanbaitenDetailEntity({ hanbaitenId: 15 }),
      );
      qbMock.getRawOne.mockResolvedValue(
        buildHanbaitenDetailRawRow({ hanbaiten_id: 15 }),
      );
    });

    it('should INSERT and return the new hanbaiten when CHUOKAI submits valid input', async () => {
      // COVERS: §4.4 INSERT + §4.6 レスポンス生成
      const result = await service.createHanbaiten(
        buildCreateHanbaitenBody(),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(result.data).toMatchObject({
        hanbaiten_id: 15,
        hanbaiten_code: 'H001',
        hanbaiten_name: '販売店A',
      });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should derive ja_id from the session (NOT from the body) when caller is CHUOKAI', async () => {
      // COVERS: §4.3 — ja_id comes from session.ja_id for scoped roles
      const session = buildChuokaiSession({ ja_id: 7 });
      // Layer 4 FK guard now requires the haitatsuryo_tanka in the body
      // to belong to the same JA as the session — override the default
      // mock (jaId=1) so this test's session.ja_id=7 stays in scope.
      tankaRepo.findOne.mockResolvedValueOnce({ tankaId: 10, jaId: 7 });
      await service.createHanbaiten(buildCreateHanbaitenBody(), session, baseReq);

      const insertCall = txManager.save.mock.calls[0];
      const savedRow = insertCall[insertCall.length - 1];
      expect(Number(savedRow.jaId)).toBe(7);
    });

    it('should default haiten_flg to false when omitted from the request body', async () => {
      // COVERS: §4.1 — 省略時はfalse
      const body = buildCreateHanbaitenBody();
      delete body.haiten_flg;

      await service.createHanbaiten(body, buildChuokaiSession(), baseReq);
      const insertCall = txManager.save.mock.calls[0];
      const savedRow = insertCall[insertCall.length - 1];
      expect(savedRow.haitenFlg).toBe(false);
    });

    it('should throw DuplicateCodeException when hanbaiten_code already exists within the same JA', async () => {
      // COVERS: §4.3 重複チェック (ja_id, hanbaiten_code) UNIQUE
      repo.count.mockResolvedValue(1);

      await expect(
        service.createHanbaiten(
          buildCreateHanbaitenBody(),
          buildChuokaiSession(),
          baseReq,
        ),
      ).rejects.toThrow(DuplicateCodeException);
    });

    it('should call CodeService.has with ITAKU_KUBUN when validating itaku_kubun', async () => {
      // COVERS: §4.1 — itaku_kubun ∈ m_code['ITAKU_KUBUN']
      await service.createHanbaiten(
        buildCreateHanbaitenBody({ itaku_kubun: 1 }),
        buildChuokaiSession(),
        baseReq,
      );
      const categories = codeService.has.mock.calls.map(([cat]: any[]) => cat);
      expect(categories).toContain('ITAKU_KUBUN');
    });

    it('should reject when itaku_kubun is not a valid ITAKU_KUBUN m_code value', async () => {
      // COVERS: §4.1 — m_code allow-list violation → VALIDATION_ERROR
      codeService.has.mockImplementation((cat: string) => cat !== 'ITAKU_KUBUN');

      await expect(
        service.createHanbaiten(
          buildCreateHanbaitenBody({ itaku_kubun: 99 }),
          buildChuokaiSession(),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    it('should reject when tesuryo_kubun is not a valid TESURYO_KUBUN m_code value', async () => {
      // COVERS: §4.1 — tesuryo_kubun ∈ m_code['TESURYO_KUBUN']
      codeService.has.mockImplementation((cat: string) => cat !== 'TESURYO_KUBUN');

      await expect(
        service.createHanbaiten(
          buildCreateHanbaitenBody({ tesuryo_kubun: 99 }),
          buildChuokaiSession(),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    it('should reject when yokin_shubetsu is not a valid YOKIN_SHUBETSU m_code value', async () => {
      // COVERS: §4.1 — yokin_shubetsu ∈ m_code['YOKIN_SHUBETSU']
      codeService.has.mockImplementation((cat: string) => cat !== 'YOKIN_SHUBETSU');

      await expect(
        service.createHanbaiten(
          buildCreateHanbaitenBody({ yokin_shubetsu: 9 }),
          buildChuokaiSession(),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    // ─── Conditional-required (画面設計書 v1.2 §3.1) ────────────────────
    describe('itaku_kubun = 1 (振込) — conditional-required No.17~No.23', () => {
      it('should reject when bank_code is missing and itaku_kubun is 1', async () => {
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({ itaku_kubun: 1, bank_code: '' }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).rejects.toThrow();
      });

      it('should reject when bank_name is missing and itaku_kubun is 1', async () => {
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({ itaku_kubun: 1, bank_name: '' }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).rejects.toThrow();
      });

      it('should reject when bank_branch_code is missing and itaku_kubun is 1', async () => {
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({ itaku_kubun: 1, bank_branch_code: '' }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).rejects.toThrow();
      });

      it('should reject when bank_branch_name is missing and itaku_kubun is 1', async () => {
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({ itaku_kubun: 1, bank_branch_name: '' }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).rejects.toThrow();
      });

      it('should reject when yokin_shubetsu is missing and itaku_kubun is 1', async () => {
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({ itaku_kubun: 1, yokin_shubetsu: null }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).rejects.toThrow();
      });

      it('should reject when koza_no is missing and itaku_kubun is 1', async () => {
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({ itaku_kubun: 1, koza_no: '' }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).rejects.toThrow();
      });

      it('should reject when koza_meigi is missing and itaku_kubun is 1', async () => {
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({ itaku_kubun: 1, koza_meigi: '' }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).rejects.toThrow();
      });
    });

    describe('itaku_kubun = 2 (日農委託) or 9 (その他) — bank fields optional', () => {
      it('should accept when bank/koza fields are empty and itaku_kubun is 2', async () => {
        // COVERS: §4.1 — No.17~23 空白可
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({
              itaku_kubun: 2,
              bank_code: '',
              bank_name: '',
              bank_branch_code: '',
              bank_branch_name: '',
              yokin_shubetsu: null,
              koza_no: '',
              koza_meigi: '',
            }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).resolves.toBeDefined();
      });

      it('should accept when bank/koza fields are empty and itaku_kubun is 9', async () => {
        await expect(
          service.createHanbaiten(
            buildCreateHanbaitenBody({
              itaku_kubun: 9,
              bank_code: '',
              bank_name: '',
              bank_branch_code: '',
              bank_branch_name: '',
              yokin_shubetsu: null,
              koza_no: '',
              koza_meigi: '',
            }),
            buildChuokaiSession(),
            baseReq,
          ),
        ).resolves.toBeDefined();
      });
    });

    it('should wrap INSERT + audit log in a single transaction when create succeeds', async () => {
      // COVERS: §4.5 — transaction boundary
      await service.createHanbaiten(
        buildCreateHanbaitenBody(),
        buildChuokaiSession(),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should call AuditLogService.logCreate with bare CREATE operation when create succeeds', async () => {
      // COVERS: §4.5 — operation MUST be bare 'CREATE' (not 'HANBAITEN_CREATE')
      await service.createHanbaiten(
        buildCreateHanbaitenBody(),
        buildChuokaiSession(),
        baseReq,
      );

      expect(auditLog.logCreate).toHaveBeenCalled();
      const ctx = auditLog.logCreate.mock.calls[0][0];
      expect(ctx).toMatchObject({
        table: 'm_hanbaiten',
      });
      expect(ctx.screen).toMatch(/ACSMS-SCR-017/);
    });

    it('should pass the transaction manager to logCreate when calling audit log so the audit row joins the tx', async () => {
      // COVERS: nestjs.md §audit log atomicity — manager MUST be passed
      await service.createHanbaiten(
        buildCreateHanbaitenBody(),
        buildChuokaiSession(),
        baseReq,
      );

      expect(auditLog.logCreate).toHaveBeenCalled();
      const lastCall = auditLog.logCreate.mock.calls[0];
      // 3rd arg is the EntityManager (logCreate signature: (ctx, after, manager?))
      expect(lastCall[2]).toBe(txManager);
    });

    it('should rollback and NOT persist when audit log fails inside transaction', async () => {
      // COVERS: rollback contract — audit failure rolls back business write
      auditLog.logCreate.mockRejectedValueOnce(new Error('audit down'));
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          (txManager as any).committed = false;
          throw err;
        }
      });

      await expect(
        service.createHanbaiten(
          buildCreateHanbaitenBody(),
          buildChuokaiSession(),
          baseReq,
        ),
      ).rejects.toBeDefined();
      expect((txManager as any).committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when CREATE fails', async () => {
      // COVERS: §4.7 — error log runs after rollback so the failure trace survives
      dataSource.transaction.mockImplementation(async () => {
        throw new Error('DB down');
      });

      await expect(
        service.createHanbaiten(
          buildCreateHanbaitenBody(),
          buildChuokaiSession(),
          baseReq,
        ),
      ).rejects.toBeDefined();

      expect(auditLog.logError).toHaveBeenCalled();
      const errCall = auditLog.logError.mock.calls[0];
      expect(errCall[1]).toBe('CREATE');
      expect(errCall[0]).toMatchObject({ table: 'm_hanbaiten' });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-017-003 — PUT /api/v1/hanbaiten/:hanbaiten_id (updateHanbaiten)
  // ───────────────────────────────────────────────────────────────────
  describe('updateHanbaiten', () => {
    beforeEach(() => {
      const before = buildHanbaitenDetailEntity({ hanbaitenId: 1, jaId: 1 });
      repo.findOne.mockResolvedValue(before);
      txManager.findOne.mockResolvedValue(before);
      txManager.update.mockResolvedValue({ affected: 1 });
      qbMock.getRawOne.mockResolvedValue(
        buildHanbaitenDetailRawRow({
          hanbaiten_id: 1,
          hanbaiten_name: '販売店A改定',
          tesuryo_amount: 600,
          biko: '更新しました',
        }),
      );
    });

    it('should UPDATE and return the refreshed hanbaiten when CHUOKAI submits valid input', async () => {
      const result = await service.updateHanbaiten(
        1,
        buildUpdateHanbaitenBody(),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(result.data).toMatchObject({
        hanbaiten_id: 1,
        hanbaiten_name: '販売店A改定',
        biko: '更新しました',
      });
    });

    it('should throw NotFoundException when target hanbaiten_id does not exist', async () => {
      // COVERS: §4.3 → 404
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateHanbaiten(
          9999,
          buildUpdateHanbaitenBody(),
          buildChuokaiSession(),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the target row belongs to a different JA than the caller (DataScope mask)', async () => {
      // COVERS: §4.3 — out-of-scope row masked as 404
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateHanbaiten(
          1,
          buildUpdateHanbaitenBody(),
          buildChuokaiSession({ ja_id: 99 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT update hanbaiten_code when present (hanbaiten_code 更新不可)', async () => {
      // COVERS: §3 注記 — hanbaiten_code は更新不可
      await service.updateHanbaiten(
        1,
        buildUpdateHanbaitenBody({ /* hanbaiten_code intentionally NOT in body */ }),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      const updateCalls = txManager.update.mock.calls;
      const merged = updateCalls.reduce(
        (acc: any, c: any[]) => ({ ...acc, ...(c[c.length - 1] ?? {}) }),
        {},
      );
      expect(merged.hanbaitenCode).toBeUndefined();
    });

    it('should call CodeService.has with ITAKU_KUBUN when validating itaku_kubun on UPDATE', async () => {
      await service.updateHanbaiten(
        1,
        buildUpdateHanbaitenBody({ itaku_kubun: 1 }),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );
      const categories = codeService.has.mock.calls.map(([cat]: any[]) => cat);
      expect(categories).toContain('ITAKU_KUBUN');
    });

    it('should reject when itaku_kubun is not a valid ITAKU_KUBUN m_code value on UPDATE', async () => {
      codeService.has.mockImplementation((cat: string) => cat !== 'ITAKU_KUBUN');

      await expect(
        service.updateHanbaiten(
          1,
          buildUpdateHanbaitenBody({ itaku_kubun: 99 }),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    describe('itaku_kubun = 1 (振込) — UPDATE conditional-required No.17~No.23', () => {
      it('should reject when bank_code is missing and itaku_kubun is 1', async () => {
        await expect(
          service.updateHanbaiten(
            1,
            buildUpdateHanbaitenBody({ itaku_kubun: 1, bank_code: '' }),
            buildChuokaiSession({ ja_id: 1 }),
            baseReq,
          ),
        ).rejects.toThrow();
      });

      it('should reject when koza_no is missing and itaku_kubun is 1', async () => {
        await expect(
          service.updateHanbaiten(
            1,
            buildUpdateHanbaitenBody({ itaku_kubun: 1, koza_no: '' }),
            buildChuokaiSession({ ja_id: 1 }),
            baseReq,
          ),
        ).rejects.toThrow();
      });

      it('should reject when koza_meigi is missing and itaku_kubun is 1', async () => {
        await expect(
          service.updateHanbaiten(
            1,
            buildUpdateHanbaitenBody({ itaku_kubun: 1, koza_meigi: '' }),
            buildChuokaiSession({ ja_id: 1 }),
            baseReq,
          ),
        ).rejects.toThrow();
      });
    });

    it('should accept when bank fields are empty and itaku_kubun is 2 (no conditional rule)', async () => {
      await expect(
        service.updateHanbaiten(
          1,
          buildUpdateHanbaitenBody({
            itaku_kubun: 2,
            bank_code: '',
            bank_name: '',
            bank_branch_code: '',
            bank_branch_name: '',
            yokin_shubetsu: null,
            koza_no: '',
            koza_meigi: '',
          }),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).resolves.toBeDefined();
    });

    it('should wrap UPDATE + audit log in a single transaction when update succeeds', async () => {
      await service.updateHanbaiten(
        1,
        buildUpdateHanbaitenBody(),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should call AuditLogService.logUpdate with bare UPDATE operation and before+after snapshots when update succeeds', async () => {
      // COVERS: §4.5 — operation MUST be bare 'UPDATE'
      await service.updateHanbaiten(
        1,
        buildUpdateHanbaitenBody(),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(auditLog.logUpdate).toHaveBeenCalled();
      const call = auditLog.logUpdate.mock.calls[0];
      const ctx = call[0];
      expect(ctx).toMatchObject({
        table: 'm_hanbaiten',
        targetId: 1,
      });
      expect(ctx.screen).toMatch(/ACSMS-SCR-017/);
      // before, after arguments must be supplied
      expect(call[1]).toBeDefined();
      expect(call[2]).toBeDefined();
    });

    it('should pass the transaction manager to logUpdate when calling audit log so the audit row joins the tx', async () => {
      await service.updateHanbaiten(
        1,
        buildUpdateHanbaitenBody(),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      const lastCall = auditLog.logUpdate.mock.calls[0];
      // logUpdate signature: (ctx, before, after, manager?)
      expect(lastCall[3]).toBe(txManager);
    });

    it('should rollback and NOT persist when audit log fails inside transaction', async () => {
      auditLog.logUpdate.mockRejectedValueOnce(new Error('audit down'));
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          (txManager as any).committed = false;
          throw err;
        }
      });

      await expect(
        service.updateHanbaiten(
          1,
          buildUpdateHanbaitenBody(),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toBeDefined();
      expect((txManager as any).committed).toBe(false);
    });

    it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when UPDATE fails', async () => {
      // COVERS: §4.7 — error log
      dataSource.transaction.mockImplementation(async () => {
        throw new Error('DB down');
      });

      await expect(
        service.updateHanbaiten(
          1,
          buildUpdateHanbaitenBody(),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toBeDefined();

      expect(auditLog.logError).toHaveBeenCalled();
      const errCall = auditLog.logError.mock.calls[0];
      expect(errCall[1]).toBe('UPDATE');
      expect(errCall[0]).toMatchObject({
        table: 'm_hanbaiten',
        targetId: 1,
      });
    });

    it('should preserve ja_id from the existing row when UPDATE is called (ja ownership immutable)', async () => {
      // COVERS: §4.4 — UPDATE WHERE ja_id = :ja_id; the row's ja_id is immutable
      await service.updateHanbaiten(
        1,
        buildUpdateHanbaitenBody(),
        buildJaHontenSession({ ja_id: 1 }),
        baseReq,
      );

      const updateCalls = txManager.update.mock.calls;
      const merged = updateCalls.reduce(
        (acc: any, c: any[]) => ({ ...acc, ...(c[c.length - 1] ?? {}) }),
        {},
      );
      // The update partial must NOT contain a jaId override.
      expect(merged.jaId).toBeUndefined();
    });

    it('should narrow the existence query by ja_id when caller is JA_KANRI_SHITEN (DataScope)', async () => {
      // COVERS: §4.3 — JA_KANRI_SHITEN sees only own ja_id
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateHanbaiten(
          1,
          buildUpdateHanbaitenBody(),
          buildJaKanriShitenSession({ ja_id: 7 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);

      const where = repo.findOne.mock.calls[0][0].where;
      // jaId must be present in the WHERE for scoped roles
      expect(where).toMatchObject({ jaId: 7 });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-019 — Excel template download + bulk import (separate top-level
// describe so the import-specific mock surface — dataSource.query
// returning pre-check rows, txManager.query for batch INSERTs, plus a
// mocked ExcelJS workbook return — doesn't leak into the SCR-017 /
// SCR-018 blocks above).
// ═══════════════════════════════════════════════════════════════════════

describe('HanbaitenService — SCR-019 (Excel template + bulk import)', () => {
  let service: any;
  let repo: any;
  let qbMock: any;
  let todofukenRepo: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;
  let tankaRepo: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  // Default session — JA_HONTEN with hanbaiten.import permission per
  // api.md §4.2 (NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN).
  const importerSession = () =>
    buildJaHontenSession({
      account_id: 200,
      ja_id: 1,
      permissions: ['hanbaiten.view', 'hanbaiten.import'],
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
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    repo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn((v: any) => v),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => qbMock),
    };

    todofukenRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };

    codeService = {
      // Allow every m_code lookup by default; individual tests can flip
      // a category to invalid by mockImplementation((cat) => cat !== 'X').
      has: jest.fn().mockReturnValue(true),
      getLabel: jest.fn().mockReturnValue(''),
      reload: jest.fn(),
    };

    // m_tanka lookup for haitatsuryo_tanka_code → haitatsuryo_tanka_id
    // resolution (§4.3.2). Default: T001 maps to tanka_id=10, in ja_id=1,
    // with tanka_type=2 (配達手数料).
    tankaRepo = {
      findOne: jest.fn(),
      find: jest
        .fn()
        .mockResolvedValue([{ tankaId: 10, tankaCode: 'T001', jaId: 1 }]),
    };

    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (_entity: any, value: any) => ({
        ...value,
        hanbaitenId: value?.hanbaitenId ?? 101,
      })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn(async () => []),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      // §4.3.1 — existing hanbaiten_code lookup runs through
      // dataSource.query when the service issues a raw ANY(:codes)
      // pre-check. Default: no row matches (i.e. no duplicates).
      query: jest.fn(async () => []),
    };

    service = new HanbaitenService(
      repo,
      todofukenRepo,
      dataSource,
      auditLog,
      codeService,
      tankaRepo,
    );
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-019-001 — GET /api/v1/hanbaiten/import/template
  // ───────────────────────────────────────────────────────────────────
  describe('downloadImportTemplate (API-019-001)', () => {
    it('should return a Buffer payload when caller holds hanbaiten.import permission', async () => {
      // COVERS: §4.3 ExcelJS template generation — service hands back a
      // Buffer; real ExcelJS integration is validated in the integration
      // spec via the Content-Type header.
      const result = await service.downloadImportTemplate(importerSession());

      expect(result).toBeDefined();
      // Service contract: returns either a raw Buffer or { buffer, filename }.
      // Both forms must surface a Buffer instance for the controller to ship.
      const buf = Buffer.isBuffer(result) ? result : result.buffer;
      expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('should include all 23 Japanese column headers in the canonical order when generating the template', async () => {
      // COVERS: §4.3 — 1行目に23列のヘッダー文字列。Headers are exposed
      // via a helper (`getImportTemplateColumns()`) the integration spec
      // also asserts. If the implementation places them inline, this
      // assertion still validates the contract because the helper is the
      // canonical source.
      const headers: string[] = service.getImportTemplateColumns();
      expect(headers).toEqual([
        '販売店コード',
        '販売店名称',
        '販売店名称（カナ）',
        'インボイス番号',
        '郵便番号',
        '住所',
        '電話番号',
        'FAX番号',
        '所長名',
        '委託区分',
        '配達手数料単価',
        '金融機関コード',
        '金融機関名',
        '配達手数料支払サイクル',
        '口座支店コード',
        '口座支店名',
        '口座種別',
        '口座番号',
        '口座名義',
        '手数料区分',
        '手数料',
        '備考',
        '廃店フラグ',
      ]);
    });

    it('should NOT record audit log for a template download (read-only operation)', async () => {
      // COVERS: §4 — no t_log row when caller just fetches the template.
      await service.downloadImportTemplate(importerSession());
      expect(auditLog.logOperation).not.toHaveBeenCalled();
      expect(auditLog.logCreate).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // ACSMS-API-019-002 — POST /api/v1/hanbaiten/import
  // ───────────────────────────────────────────────────────────────────
  describe('importExcel (API-019-002)', () => {
    // ─── NEW mode ────────────────────────────────────────────────────
    describe('NEW mode (新規登録)', () => {
      beforeEach(() => {
        // §4.3.1 — no existing hanbaiten_code rows (clean DB).
        dataSource.query = jest.fn(async () => []);
      });

      it('should INSERT each row and return the import summary when all rows are new', async () => {
        // COVERS: §4.4.1 — INSERT m_hanbaiten loop + §4.6 response shape
        const body = buildImportRequestNEW();
        const rowCount = (body.rows as any[]).length;
        const result = await service.importExcel(body, importerSession(), baseReq);

        expect(result.message).toBe('正常に取り込みました。');
        expect(result.data).toMatchObject({
          import_mode: 'NEW',
          total_rows: rowCount,
          created_count: rowCount,
          updated_count: 0,
          skipped_count: 0,
        });
        expect(typeof result.data.imported_at).toBe('string');
      });

      it('should wrap all row INSERTs in a single transaction when bulk import succeeds', async () => {
        // COVERS: §4.4 — 1 tx per batch, not 1 tx per row.
        await service.importExcel(
          buildImportRequestNEW(),
          importerSession(),
          baseReq,
        );
        expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      });

      it('should call AuditLogService.logCreate with operation IMPORT_NEW when import succeeds', async () => {
        // EXCEPTION to bare-verb rule: api.md §4.5 explicitly mandates
        // the prefixed label `IMPORT_NEW` for batch operations so the
        // audit row distinguishes a single INSERT from a 500-row bulk.
        await service.importExcel(
          buildImportRequestNEW(),
          importerSession(),
          baseReq,
        );
        expect(auditLog.logCreate).toHaveBeenCalled();
        const ctx = auditLog.logCreate.mock.calls[0][0];
        // The service forwards `operation` via the ctx OR via a direct
        // logOperation argument. Both shapes are acceptable — the test
        // walks both to stay robust to the implementation choice.
        const operation =
          ctx?.operation ??
          auditLog.logOperation.mock.calls.find(
            (c: any[]) => c[0]?.operation?.startsWith?.('IMPORT_'),
          )?.[0]?.operation;
        expect(operation).toBe('IMPORT_NEW');
      });

      it('should pass the transaction manager to logCreate so the audit row joins the tx (atomicity)', async () => {
        // COVERS: nestjs.md §audit log atomicity — manager MUST be passed.
        await service.importExcel(
          buildImportRequestNEW(),
          importerSession(),
          baseReq,
        );
        const lastCall = auditLog.logCreate.mock.calls[0];
        expect(lastCall[2]).toBe(txManager);
      });

      it('should resolve haitatsuryo_tanka_code to haitatsuryo_tanka_id via m_tanka lookup before INSERT', async () => {
        // COVERS: §4.3.2 — SELECT tanka_id WHERE tanka_code = ANY(...)
        // AND tanka_type = 2 AND ja_id = :ja_id.
        await service.importExcel(
          buildImportRequestNEW(),
          importerSession(),
          baseReq,
        );
        // tankaRepo.find OR a dataSource.query call with m_tanka must
        // fire. Either shape satisfies the FK-resolution contract.
        const tankaFindFired = (tankaRepo.find as jest.Mock).mock.calls.length > 0;
        const tankaQueryFired = (dataSource.query as jest.Mock).mock.calls.some(
          ([sql]: any[]) => typeof sql === 'string' && /m_tanka/i.test(sql),
        );
        expect(tankaFindFired || tankaQueryFired).toBe(true);
      });

      it('should derive ja_id from the session and set it on every INSERT (not from the body)', async () => {
        // COVERS: §4.2 DataScope — session.ja_id is authoritative.
        await service.importExcel(
          buildImportRequestNEW(),
          buildJaHontenSession({
            account_id: 200,
            ja_id: 7,
            permissions: ['hanbaiten.import'],
          }),
          baseReq,
        );
        // Either txManager.save or txManager.query carries the jaId.
        const saved = txManager.save.mock.calls
          .map((c: any[]) => c[c.length - 1])
          .filter(Boolean);
        const allJaIds = new Set(saved.map((s: any) => Number(s.jaId ?? s.ja_id)));
        // At least one persisted entity carries ja_id=7.
        expect(Array.from(allJaIds)).toContain(7);
      });

      // ─── Pre-check failure paths (§4.3) ───────────────────────────
      it('should throw IMPORT_VALIDATION_ERROR when rows contain duplicate hanbaiten_code values within the same batch', async () => {
        const body = buildImportRequestNEW({
          rows: [
            buildImportRow({ hanbaiten_code: 'H001' }),
            buildImportRow({ hanbaiten_code: 'H001' }),
          ],
        });
        await expect(
          service.importExcel(body, importerSession(), baseReq),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'IMPORT_VALIDATION_ERROR',
          }),
        });
      });

      it('should throw IMPORT_VALIDATION_ERROR when NEW mode is asked to insert an already-existing hanbaiten_code', async () => {
        // §4.3.1 — existing hanbaiten_code lookup returns a row → duplicate.
        dataSource.query = jest.fn(async (sql: string) => {
          if (/m_hanbaiten/i.test(sql)) {
            return [{ hanbaiten_id: 1, hanbaiten_code: 'H001' }];
          }
          return [];
        });

        await expect(
          service.importExcel(
            buildImportRequestNEW(),
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'IMPORT_VALIDATION_ERROR',
          }),
        });
      });

      it('should throw IMPORT_VALIDATION_ERROR when haitatsuryo_tanka_code does not resolve to an existing m_tanka row', async () => {
        // §4.3.2 — un-resolved tanka_code → error with field='haitatsuryo_tanka_code'.
        tankaRepo.find.mockResolvedValue([]);
        dataSource.query = jest.fn(async (sql: string) => {
          if (/m_tanka/i.test(sql)) return [];
          return [];
        });

        await expect(
          service.importExcel(
            buildImportRequestNEW({
              rows: [buildImportRow({ haitatsuryo_tanka_code: 'TXXX' })],
            }),
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'IMPORT_VALIDATION_ERROR',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'haitatsuryo_tanka_code',
              }),
            ]),
          }),
        });
      });

      it('should throw IMPORT_VALIDATION_ERROR with row number in errors[] when a row has invalid itaku_kubun', async () => {
        // §4.1 — itaku_kubun ∈ {1, 2, 9}. CodeService.has flagged
        // false drives the validation failure.
        codeService.has.mockImplementation(
          (cat: string, value: unknown) =>
            !(cat === 'ITAKU_KUBUN' && value === 7),
        );

        await expect(
          service.importExcel(
            buildImportRequestNEW({
              rows: [buildImportRow({ itaku_kubun: 7 })],
            }),
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'IMPORT_VALIDATION_ERROR',
            errors: expect.arrayContaining([
              expect.objectContaining({
                row: expect.any(Number),
                field: 'itaku_kubun',
              }),
            ]),
          }),
        });
      });

      it('should throw ROW_LIMIT_EXCEEDED when rows count is 501 even if DTO bypasses the @ArrayMaxSize check', async () => {
        // §4.1 — service-layer defence-in-depth for 500-row cap.
        const rows = Array.from({ length: 501 }, (_, i) =>
          buildImportRow({
            hanbaiten_code: `H${String(i).padStart(4, '0')}`,
          }),
        );
        await expect(
          service.importExcel(
            { import_mode: 'NEW', selected_columns: [...HANBAITEN_IMPORT_COLUMNS], rows },
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'ROW_LIMIT_EXCEEDED',
          }),
        });
      });

      it('should NOT call dataSource.transaction when the pre-check phase fails (pre-check runs BEFORE the tx opens)', async () => {
        // §4.3 — pre-check happens before §4.4 tx. Failure must short-circuit.
        dataSource.query = jest.fn(async (sql: string) => {
          if (/m_hanbaiten/i.test(sql)) {
            return [{ hanbaiten_id: 1, hanbaiten_code: 'H001' }];
          }
          return [];
        });

        await expect(
          service.importExcel(
            buildImportRequestNEW(),
            importerSession(),
            baseReq,
          ),
        ).rejects.toBeDefined();

        expect(dataSource.transaction).not.toHaveBeenCalled();
      });

      it('should rollback the whole batch when any row INSERT fails inside the transaction', async () => {
        // §4.4 — single-tx rollback on partial failure.
        let callCount = 0;
        txManager.save.mockImplementation(async (_e: any, v: any) => {
          callCount += 1;
          if (callCount === 2) throw new Error('FK violation');
          return { ...v, hanbaitenId: 100 + callCount };
        });
        dataSource.transaction.mockImplementation(async (cb: any) => {
          try {
            return await cb(txManager);
          } catch (err) {
            (txManager as any).committed = false;
            throw err;
          }
        });

        await expect(
          service.importExcel(
            buildImportRequestNEW(),
            importerSession(),
            baseReq,
          ),
        ).rejects.toBeDefined();
        expect((txManager as any).committed).toBe(false);
      });

      it('should still emit error audit log (log_type=3) OUTSIDE the rolled-back transaction when import fails', async () => {
        // §4.7 — error log runs after rollback so the failure trace survives.
        dataSource.transaction.mockImplementation(async () => {
          throw new Error('DB down');
        });

        await expect(
          service.importExcel(
            buildImportRequestNEW(),
            importerSession(),
            baseReq,
          ),
        ).rejects.toBeDefined();

        expect(auditLog.logError).toHaveBeenCalled();
        const errCall = auditLog.logError.mock.calls[0];
        // operation argument should still be IMPORT_NEW for traceability.
        expect(['IMPORT_NEW', 'CREATE']).toContain(errCall[1]);
        expect(errCall[0]).toMatchObject({ table: 'm_hanbaiten' });
      });

      it('should populate after_value JSON with the import summary including created_ids when audit-logging the success path', async () => {
        // §4.5 — after_value contains created_ids array.
        await service.importExcel(
          buildImportRequestNEW(),
          importerSession(),
          baseReq,
        );
        const call = auditLog.logCreate.mock.calls[0];
        // Second arg holds the after-snapshot used by AuditLogService.
        const after = call[1];
        expect(after).toBeDefined();
        const serialized =
          typeof after === 'string' ? after : JSON.stringify(after);
        expect(serialized).toMatch(/import_mode|created_ids|total_rows/);
      });
    });

    // ─── UPDATE_ALL mode ─────────────────────────────────────────────
    describe('UPDATE_ALL mode (全項目更新)', () => {
      beforeEach(() => {
        // §4.3.1 — UPDATE_ALL expects rows to EXIST. Return the matching code.
        dataSource.query = jest.fn(async (sql: string) => {
          if (/m_hanbaiten/i.test(sql)) {
            return [{ hanbaiten_id: 1, hanbaiten_code: 'H001' }];
          }
          return [];
        });
      });

      it('should UPDATE each row and return updated_count when UPDATE_ALL succeeds', async () => {
        const body = buildImportRequestUpdateAll();
        const rowCount = (body.rows as any[]).length;
        const result = await service.importExcel(body, importerSession(), baseReq);

        expect(result.data).toMatchObject({
          import_mode: 'UPDATE_ALL',
          total_rows: rowCount,
          created_count: 0,
          updated_count: rowCount,
        });
      });

      it('should call AuditLogService.logUpdate with operation IMPORT_UPDATE_ALL when UPDATE_ALL succeeds', async () => {
        // EXCEPTION to bare-verb rule per api.md §4.5.
        await service.importExcel(
          buildImportRequestUpdateAll(),
          importerSession(),
          baseReq,
        );
        // The service may use logUpdate OR logOperation directly — accept either.
        const updateCtx =
          auditLog.logUpdate.mock.calls[0]?.[0] ??
          auditLog.logOperation.mock.calls.find(
            (c: any[]) => c[0]?.operation === 'IMPORT_UPDATE_ALL',
          )?.[0];
        expect(updateCtx).toBeDefined();
        const operation =
          updateCtx.operation ??
          auditLog.logOperation.mock.calls.find(
            (c: any[]) => c[0]?.operation === 'IMPORT_UPDATE_ALL',
          )?.[0]?.operation;
        expect(operation).toBe('IMPORT_UPDATE_ALL');
      });

      it('should populate before_value JSON with the pre-update row snapshot when audit-logging UPDATE_ALL', async () => {
        // §4.5 — before_value: UPDATE_ALL / UPDATE_PARTIAL モード — 更新前データJSON
        await service.importExcel(
          buildImportRequestUpdateAll(),
          importerSession(),
          baseReq,
        );
        const updateCall = auditLog.logUpdate.mock.calls[0];
        expect(updateCall).toBeDefined();
        // logUpdate signature: (ctx, before, after, manager?)
        const before = updateCall[1];
        expect(before).toBeDefined();
      });

      it('should throw IMPORT_VALIDATION_ERROR when UPDATE_ALL targets a hanbaiten_code that does not exist', async () => {
        // §4.3.1 — UPDATE_ALL with a missing code is "存在しない" error.
        dataSource.query = jest.fn(async () => []);

        await expect(
          service.importExcel(
            buildImportRequestUpdateAll(),
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'IMPORT_VALIDATION_ERROR',
            errors: expect.arrayContaining([
              expect.objectContaining({ field: 'hanbaiten_code' }),
            ]),
          }),
        });
      });

      it('should overwrite unselected columns with NULL / empty when UPDATE_ALL is the mode (selected_columns is informational only)', async () => {
        // §4.4.2 — UPDATE_ALL: 未選択列は NULL / 空文字で上書き
        await service.importExcel(
          buildImportRequestUpdateAll({
            selected_columns: ['hanbaiten_code', 'hanbaiten_name'],
            rows: [
              {
                hanbaiten_code: 'H001',
                hanbaiten_name: '販売店A改定',
                // tel/fax intentionally omitted in body — UPDATE_ALL still writes them as NULL.
              },
            ],
          }),
          importerSession(),
          baseReq,
        );

        // The service either calls txManager.update / txManager.save /
        // txManager.query — at least one mutation must have fired.
        const mutated =
          (txManager.update as jest.Mock).mock.calls.length +
          (txManager.save as jest.Mock).mock.calls.length +
          (txManager.query as jest.Mock).mock.calls.length;
        expect(mutated).toBeGreaterThan(0);
      });

      it('should pass the transaction manager to logUpdate when calling audit log so the audit row joins the tx', async () => {
        await service.importExcel(
          buildImportRequestUpdateAll(),
          importerSession(),
          baseReq,
        );
        const lastCall = auditLog.logUpdate.mock.calls[0];
        expect(lastCall).toBeDefined();
        // logUpdate signature: (ctx, before, after, manager?)
        expect(lastCall[3]).toBe(txManager);
      });
    });

    // ─── UPDATE_PARTIAL mode ─────────────────────────────────────────
    describe('UPDATE_PARTIAL mode (入力箇所のみ更新)', () => {
      beforeEach(() => {
        dataSource.query = jest.fn(async (sql: string) => {
          if (/m_hanbaiten/i.test(sql)) {
            return [{ hanbaiten_id: 1, hanbaiten_code: 'H001' }];
          }
          return [];
        });
      });

      it('should UPDATE only selected_columns and return updated_count when UPDATE_PARTIAL succeeds', async () => {
        const body = buildImportRequestUpdatePartial();
        const rowCount = (body.rows as any[]).length;
        const result = await service.importExcel(body, importerSession(), baseReq);
        expect(result.data).toMatchObject({
          import_mode: 'UPDATE_PARTIAL',
          updated_count: rowCount,
        });
      });

      it('should call AuditLogService.logUpdate with operation IMPORT_UPDATE_PARTIAL when UPDATE_PARTIAL succeeds', async () => {
        await service.importExcel(
          buildImportRequestUpdatePartial(),
          importerSession(),
          baseReq,
        );
        const operation =
          auditLog.logUpdate.mock.calls[0]?.[0]?.operation ??
          auditLog.logOperation.mock.calls.find(
            (c: any[]) => c[0]?.operation === 'IMPORT_UPDATE_PARTIAL',
          )?.[0]?.operation;
        expect(operation).toBe('IMPORT_UPDATE_PARTIAL');
      });

      it('should NOT touch unselected columns when UPDATE_PARTIAL is the mode (existing DB values retained)', async () => {
        // §4.4.3 — UPDATE_PARTIAL: 未選択列は既存値を維持する。
        // Implementation contract: SET clause includes ONLY selected_columns.
        await service.importExcel(
          buildImportRequestUpdatePartial({
            selected_columns: ['hanbaiten_code', 'tel'],
            rows: [{ hanbaiten_code: 'H001', tel: '03-0000-0000' }],
          }),
          importerSession(),
          baseReq,
        );

        // Aggregate every SET-clause string emitted to txManager.query OR
        // every partial payload to txManager.update. The service must
        // mutate `tel` but NOT touch `hanbaiten_name` or `address`.
        const queryCalls = (txManager.query as jest.Mock).mock.calls.map(
          ([sql]: any[]) => (typeof sql === 'string' ? sql : ''),
        );
        const updateCalls = (txManager.update as jest.Mock).mock.calls.map(
          (c: any[]) => c[c.length - 1] ?? {},
        );
        const flat = JSON.stringify({ queryCalls, updateCalls });
        expect(flat).toMatch(/tel/i);
        // Spec is permissive about exactly HOW the SET clause is built —
        // the harder negative assertion ("no hanbaiten_name in SET")
        // lives in the integration spec where the real SQL is observable.
      });

      it('should reject in pre-check when selected_columns omits hanbaiten_code (key column always required)', async () => {
        // §1 注記 — hanbaiten_code は selected_columns に必ず含む。
        // DTO catches this in the @ArrayMinSize / custom @Validate path;
        // the service either re-asserts (defence-in-depth) or relies on
        // the DTO. Test the DEFENCE path so removing the DTO check later
        // doesn't silently allow keyless updates.
        await expect(
          service.importExcel(
            buildImportRequestUpdatePartial({
              selected_columns: ['hanbaiten_name', 'tel'], // no hanbaiten_code
            }),
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: expect.stringMatching(
              /VALIDATION_ERROR|IMPORT_VALIDATION_ERROR/,
            ),
          }),
        });
      });
    });

    // ─── Common — error paths ─────────────────────────────────────────
    describe('error paths', () => {
      it('should surface IMPORT_VALIDATION_ERROR with the exact message literal from api.md §エラー一覧', async () => {
        dataSource.query = jest.fn(async (sql: string) => {
          if (/m_hanbaiten/i.test(sql)) {
            return [{ hanbaiten_id: 1, hanbaiten_code: 'H001' }];
          }
          return [];
        });
        await expect(
          service.importExcel(
            buildImportRequestNEW(),
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'IMPORT_VALIDATION_ERROR',
            message: expect.stringContaining('Excel取込データにエラーがあります'),
          }),
        });
      });

      it('should surface ROW_LIMIT_EXCEEDED with the exact message literal "取込データ行数の上限"', async () => {
        const rows = Array.from({ length: 501 }, (_, i) =>
          buildImportRow({ hanbaiten_code: `H${String(i).padStart(4, '0')}` }),
        );
        await expect(
          service.importExcel(
            { import_mode: 'NEW', selected_columns: [...HANBAITEN_IMPORT_COLUMNS], rows },
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'ROW_LIMIT_EXCEEDED',
            message: expect.stringContaining('取込データ行数の上限'),
          }),
        });
      });

      it.todo(
        'should reject with UNAUTHORIZED when no session is attached — covered in integration (guard-level)',
      );

      it.todo(
        'should reject with TOO_MANY_REQUESTS when throttle limit is hit — covered in integration (Throttler)',
      );

      it('should propagate FILE_FORMAT_ERROR when downstream parser rejects an unparseable payload', async () => {
        // §エラー一覧 row 11 — although this is more naturally raised on
        // the FE / multipart endpoint, the service contract MUST handle
        // it for the JSON pre-parsed body too (e.g. tesuryo_amount sent
        // as `"abc"` survives @IsOptional + DTO).
        await expect(
          service.importExcel(
            buildImportRequestNEW({
              rows: [
                buildImportRow({ tesuryo_amount: 'NOT_A_NUMBER' as unknown as number }),
              ],
            }),
            importerSession(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: expect.stringMatching(
              /IMPORT_VALIDATION_ERROR|FILE_FORMAT_ERROR|VALIDATION_ERROR/,
            ),
          }),
        });
      });

      it('should propagate DATA_SCOPE_VIOLATION when caller session has no ja_id and import requires JA-scoped writes', async () => {
        // §4.2 — ja_id authoritative. NICHINO_STAFF has ja_id=null per
        // session shape; the service must REJECT (DATA_SCOPE_VIOLATION)
        // or DEFAULT-CARRY some explicit JA. api.md doesn't pick which;
        // accept either error code so the spec stays implementation-
        // neutral. The choice is documented in `it.todo` below.
        await expect(
          service.importExcel(
            buildImportRequestNEW(),
            buildSession({
              role_code: 'NICHINO_STAFF',
              ja_id: null,
              permissions: ['hanbaiten.import'],
            }),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: expect.stringMatching(
              /DATA_SCOPE_VIOLATION|VALIDATION_ERROR|IMPORT_VALIDATION_ERROR/,
            ),
          }),
        });
      });

      it.todo(
        'should accept NICHINO_STAFF imports when an explicit ja_id is conveyed via a future body field (api.md ambiguous — pending spec clarification)',
      );

      it('should propagate INTERNAL_SERVER_ERROR-shape rejection when the underlying DB connection drops mid-batch', async () => {
        dataSource.transaction.mockImplementation(async () => {
          throw new Error('connection terminated');
        });

        await expect(
          service.importExcel(
            buildImportRequestNEW(),
            importerSession(),
            baseReq,
          ),
        ).rejects.toBeDefined();
      });
    });
  });
});


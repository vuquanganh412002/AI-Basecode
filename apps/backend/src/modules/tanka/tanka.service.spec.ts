// Screen: ACSMS-SCR-002 — 単価マスタ明細検索画面 (list + delete)
//         ACSMS-SCR-003 — 単価マスタ登録画面 (detail + create + update)
//
// Both SCRs share the same TankaService class. Tests are organised as
// two sibling top-level describe blocks so each has its own mock scope
// — SCR-002 covers findAll / remove (QueryBuilder + soft-delete), and
// SCR-003 covers findById / create / update (findOne + count + tx-save).
// Spec count + assertions remain 1:1 with the originals; only the
// location changed (merged from __tests__/ into this file so the
// module follows "1 source = 1 spec file").

import {
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ConflictException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';

import { Tanka } from '@/database/entities/tanka.entity';
import { TankaService } from '@/modules/tanka/tanka.service';
import {
  buildChuokaiSession,
  buildJaHontenSession,
  buildSession,
} from '@test/fixtures/session.factory';
import {
  buildCreateTankaPayload,
  buildTanka,
  buildTankaList,
  buildUpdateTankaPayload,
} from '@test/fixtures/tanka.factory';

describe('TankaService — SCR-002 (list / delete)', () => {
  let service: TankaService;
  let repo: any;
  let qbMock: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
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
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock),
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

    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        return value && typeof value === 'object' && 'tankaId' in value
          ? { ...value }
          : { ...value, tankaId: 5 };
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn(async () => [{ count: '0' }]),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => [{ count: '0' }]),
    };

    // Constructor order MUST match the service:
    //   (repo, dataSource, auditLog, codeService)
    service = new TankaService(repo, dataSource, auditLog, codeService);
  });

  // ─── API-002-001 — GET /api/v1/tanka (findAll) ───────────────────────────
  describe('findAll', () => {
    it('should return paginated list with meta when CHUOKAI calls with no filter', async () => {
      // COVERS: §4.3 + §4.4 + §4.5 + §4.7 happy path
      const rows = buildTankaList(2, { jaId: 1 });
      qbMock.getManyAndCount.mockResolvedValue([rows, 2]);

      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });

    it('should compute total_pages correctly when total spans multiple pages', async () => {
      qbMock.getManyAndCount.mockResolvedValue([buildTankaList(20), 47]);
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.meta.total_pages).toBe(3);
    });

    it('should serialize tanka_type as a Number value (FE looks up label via useCodesStore)', async () => {
      // COVERS: §レスポンスデータ row 3 — `tanka_type` value only, NO `tanka_type_label`
      qbMock.getManyAndCount.mockResolvedValue([
        [buildTanka({ jaId: 1, tankaType: 1 })],
        1,
      ]);
      const result = await service.findAll(
        {},
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.data[0]).toMatchObject({ tanka_type: 1 });
      expect(result.data[0]).not.toHaveProperty('tanka_type_label');
    });

    it('should include tekiyo_start_date and tekiyo_end_date in response shape', async () => {
      // COVERS: §レスポンスデータ rows 6, 7 — date fields present
      qbMock.getManyAndCount.mockResolvedValue([
        [
          buildTanka({
            jaId: 1,
            tekiyoStartDate: '2026-01-01',
            tekiyoEndDate: null,
          }),
        ],
        1,
      ]);
      const result = await service.findAll(
        {},
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.data[0]).toMatchObject({
        tekiyo_start_date: '2026-01-01',
        tekiyo_end_date: null,
      });
    });

    it('should include active_flg in response shape', async () => {
      // COVERS: §レスポンスデータ row 11
      qbMock.getManyAndCount.mockResolvedValue([
        [buildTanka({ jaId: 1, activeFlg: true })],
        1,
      ]);
      const result = await service.findAll(
        {},
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.data[0]).toHaveProperty('active_flg', true);
    });

    it('should include campaign_flg in response shape', async () => {
      qbMock.getManyAndCount.mockResolvedValue([
        [buildTanka({ jaId: 1, campaignFlg: true })],
        1,
      ]);
      const result = await service.findAll(
        {},
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.data[0]).toHaveProperty('campaign_flg', true);
    });

    it('should apply DataScope (ja_id = session.ja_id) when called by CHUOKAI', async () => {
      // COVERS: §4.3 スコープ制御
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 5 }));

      const calls = qbMock.andWhere.mock.calls;
      const scopedCall = calls.find(
        ([_sql, params]: any[]) =>
          params && /ja[_I]?[Ii]d/i.test(Object.keys(params).join('|')),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should apply DataScope (ja_id = session.ja_id) when called by JA_HONTEN', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildJaHontenSession({ ja_id: 7 }));

      const calls = qbMock.andWhere.mock.calls;
      const scopedCall = calls.find(
        ([_sql, params]: any[]) =>
          params && /ja[_I]?[Ii]d/i.test(Object.keys(params).join('|')),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should exclude soft-deleted rows (deleted_at IS NULL)', async () => {
      // COVERS: §4.3 論理削除除外
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));

      const deletedAtClause = [
        ...qbMock.where.mock.calls,
        ...qbMock.andWhere.mock.calls,
      ].find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /deleted_at IS NULL/i.test(sql),
      );
      expect(deletedAtClause).toBeDefined();
    });

    it('should NOT apply a default effective-period filter so expired 単価 are also returned (顧客要件 2026-06)', async () => {
      // COVERS: 顧客要件 — デフォルトで期限切れ含む全件表示。以前の
      // 「(tekiyo_end_date IS NULL OR >= CURRENT_DATE)」既定フィルタは廃止。
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));

      const periodClause = [
        ...qbMock.where.mock.calls,
        ...qbMock.andWhere.mock.calls,
      ].find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          (/CURRENT_DATE/i.test(sql) ||
            /tekiyo_end_date\s+IS\s+NULL/i.test(sql)),
      );
      expect(periodClause).toBeUndefined();
    });

    it('should filter by tanka_type exactly when provided', async () => {
      // COVERS: §4.3 検索条件 — tanka_type 完全一致
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { tanka_type: 2 },
        buildChuokaiSession({ ja_id: 1 }),
      );

      const tankaTypeCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /tanka_type\s*=\s*:?/i.test(sql),
      );
      expect(tankaTypeCall).toBeDefined();
    });

    it('should NOT bind tanka_type clause when filter omitted', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));

      const tankaTypeCall = qbMock.andWhere.mock.calls.find(
        ([_sql, params]: any[]) =>
          params && Object.prototype.hasOwnProperty.call(params, 'tanka_type'),
      );
      expect(tankaTypeCall).toBeUndefined();
    });

    it('should filter by tanka_name with ILIKE %name% when provided', async () => {
      // COVERS: §4.3 検索条件 — tanka_name 部分一致
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { tanka_name: '基本' },
        buildChuokaiSession({ ja_id: 1 }),
      );

      const nameCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /tanka_name\s+ILIKE/i.test(sql) &&
          params?.tanka_name === '%基本%',
      );
      expect(nameCall).toBeDefined();
    });

    it('should filter by tekiyo_start_date with >= bound when provided', async () => {
      // COVERS: §4.3 検索条件 — tekiyo_start_date filter (lower bound)
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { tekiyo_start_date: '2026-04-01' },
        buildChuokaiSession({ ja_id: 1 }),
      );

      const startCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /tekiyo_start_date\s*>=/i.test(sql) &&
          params?.tekiyo_start_date_filter === '2026-04-01',
      );
      expect(startCall).toBeDefined();
    });

    it('should filter by tekiyo_end_date with <= bound AND IS NOT NULL when provided', async () => {
      // COVERS: §4.3 検索条件 — tekiyo_end_date filter (upper bound, NULL excluded)
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { tekiyo_end_date: '2027-03-31' },
        buildChuokaiSession({ ja_id: 1 }),
      );

      const endCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /tekiyo_end_date\s+IS\s+NOT\s+NULL/i.test(sql) &&
          /tekiyo_end_date\s*<=/i.test(sql) &&
          params?.tekiyo_end_date_filter === '2027-03-31',
      );
      expect(endCall).toBeDefined();
    });

    it('should NOT bind tekiyo_start_date / tekiyo_end_date when both filters are omitted', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));

      const dateCall = qbMock.andWhere.mock.calls.find(
        ([_sql, params]: any[]) =>
          params &&
          (Object.prototype.hasOwnProperty.call(
            params,
            'tekiyo_start_date_filter',
          ) ||
            Object.prototype.hasOwnProperty.call(
              params,
              'tekiyo_end_date_filter',
            )),
      );
      expect(dateCall).toBeUndefined();
    });

    it('should filter by active_flg when active_flg=true is passed', async () => {
      // COVERS: §4.3 検索条件 — active_flg 完全一致 (active only)
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { active_flg: true },
        buildChuokaiSession({ ja_id: 1 }),
      );

      const flagCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /active_flg\s*=\s*:?/i.test(sql) &&
          params?.active_flg === true,
      );
      expect(flagCall).toBeDefined();
    });

    it('should filter by active_flg when active_flg=false is passed (disabled only)', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { active_flg: false },
        buildChuokaiSession({ ja_id: 1 }),
      );

      const flagCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /active_flg\s*=\s*:?/i.test(sql) &&
          params?.active_flg === false,
      );
      expect(flagCall).toBeDefined();
    });

    it('should return BOTH active and disabled when active_flg filter is omitted', async () => {
      // COVERS: §4.3 — 「省略時は両方（有効中・停止中）を返却」
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));

      const flagCall = qbMock.andWhere.mock.calls.find(
        ([_sql, params]: any[]) =>
          params &&
          Object.prototype.hasOwnProperty.call(params, 'active_flg') &&
          params.active_flg !== null &&
          params.active_flg !== undefined,
      );
      expect(flagCall).toBeUndefined();
    });

    it('should filter by campaign_flg when campaign_flg=true is passed', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { campaign_flg: true },
        buildChuokaiSession({ ja_id: 1 }),
      );

      const flagCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /campaign_flg\s*=\s*:?/i.test(sql) &&
          params?.campaign_flg === true,
      );
      expect(flagCall).toBeDefined();
    });

    it('should NOT filter by campaign_flg when omitted', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));

      const flagCall = qbMock.andWhere.mock.calls.find(
        ([_sql, params]: any[]) =>
          params &&
          Object.prototype.hasOwnProperty.call(params, 'campaign_flg') &&
          params.campaign_flg !== null &&
          params.campaign_flg !== undefined,
      );
      expect(flagCall).toBeUndefined();
    });

    it('should apply ORDER BY and pagination (take + skip) per request', async () => {
      // COVERS: §4.5 ソート・ページング
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { page: 3, per_page: 10, sort_by: 'tanka_code', sort_order: 'asc' },
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(qbMock.orderBy).toHaveBeenCalled();
      expect(qbMock.take).toHaveBeenCalledWith(10);
      expect(qbMock.skip).toHaveBeenCalledWith(20);
    });

    it('should default page=1, per_page=20 when omitted', async () => {
      // COVERS: §4.1 デフォルト値
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));
      expect(qbMock.take).toHaveBeenCalledWith(20);
      expect(qbMock.skip).toHaveBeenCalledWith(0);
    });

    it('should NOT call AuditLogService — read-only endpoint', async () => {
      // COVERS: §4.7 — findAll does NOT write t_log
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({}, buildChuokaiSession({ ja_id: 1 }));
      expect(auditLog.logOperation).not.toHaveBeenCalled();
      expect(auditLog.logCreate).not.toHaveBeenCalled();
    });
  });

  // ─── GET /api/v1/tanka/dropdown (getDropdown) ─────────────────────────
  describe('getDropdown', () => {
    it('should return slim row shape + has_more meta', async () => {
      const rows = [
        {
          tankaId: 11,
          tankaCode: '0002001',
          tankaName: '配達手数料A',
          tankaType: 2,
          kingakuZeikomi: 100,
          kingakuZeinuki: 90,
        },
        {
          tankaId: 12,
          tankaCode: '0002002',
          tankaName: '配達手数料B',
          tankaType: 2,
          kingakuZeikomi: 150,
          kingakuZeinuki: 140,
        },
      ];
      qbMock.getManyAndCount.mockResolvedValue([rows, 137]);
      // 税区分不明（既定 mock は zei_kubun を返さない）→ kingaku は税込で既定。
      const result = await service.getDropdown(
        { tanka_type: 2, page: 1, per_page: 50 } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(result.data).toEqual([
        {
          tanka_id: 11,
          tanka_code: '0002001',
          tanka_name: '配達手数料A',
          tanka_type: 2,
          kingaku_zeikomi: 100,
          kingaku_zeinuki: 90,
          kingaku: 100,
        },
        {
          tanka_id: 12,
          tanka_code: '0002002',
          tanka_name: '配達手数料B',
          tanka_type: 2,
          kingaku_zeikomi: 150,
          kingaku_zeinuki: 140,
          kingaku: 150,
        },
      ]);
      expect(result.meta).toEqual({
        total: 137,
        page: 1,
        per_page: 50,
        has_more: true,
      });
    });

    it('should resolve kingaku from 税込 (kingaku_zeikomi) when JA zei_kubun=1', async () => {
      const rows = [
        {
          tankaId: 11,
          tankaCode: '0001001',
          tankaName: '基本購読料',
          tankaType: 1,
          kingakuZeikomi: 4900,
          kingakuZeinuki: 4500,
        },
      ];
      qbMock.getManyAndCount.mockResolvedValue([rows, 1]);
      dataSource.query.mockImplementation(async (sql: string) =>
        sql.includes('zei_kubun') ? [{ zei_kubun: 1 }] : [{ count: '0' }],
      );

      const result = await service.getDropdown(
        { tanka_type: 1 } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(result.data[0].kingaku).toBe(4900);
    });

    it('should resolve kingaku from 税抜 (kingaku_zeinuki) when JA zei_kubun=2', async () => {
      const rows = [
        {
          tankaId: 11,
          tankaCode: '0001001',
          tankaName: '基本購読料',
          tankaType: 1,
          kingakuZeikomi: 4900,
          kingakuZeinuki: 4500,
        },
      ];
      qbMock.getManyAndCount.mockResolvedValue([rows, 1]);
      dataSource.query.mockImplementation(async (sql: string) =>
        sql.includes('zei_kubun') ? [{ zei_kubun: 2 }] : [{ count: '0' }],
      );

      const result = await service.getDropdown(
        { tanka_type: 1 } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(result.data[0].kingaku).toBe(4500);
    });

    it('should resolve effective JA from query.ja_id for NICHINO_STAFF (ja_id=null)', async () => {
      const rows = [
        {
          tankaId: 11,
          tankaCode: '0001001',
          tankaName: '基本購読料',
          tankaType: 1,
          kingakuZeikomi: 4900,
          kingakuZeinuki: 4500,
        },
      ];
      qbMock.getManyAndCount.mockResolvedValue([rows, 1]);
      const zeiCall = jest.fn(async (sql: string, _params?: unknown[]) =>
        sql.includes('zei_kubun') ? [{ zei_kubun: 2 }] : [{ count: '0' }],
      );
      dataSource.query.mockImplementation(zeiCall);

      const result = await service.getDropdown(
        { tanka_type: 1, ja_id: 7 } as any,
        buildSession({ role_code: 'NICHINO_STAFF', ja_id: null }),
      );

      // 代行入力の選択 JA(7) の税区分で解決する。
      const zeiSqlCall = zeiCall.mock.calls.find(([sql]) =>
        sql.includes('zei_kubun'),
      );
      expect(zeiSqlCall?.[1]).toEqual([7]);
      expect(result.data[0].kingaku).toBe(4500);
    });

    it('should filter by tanka_type when provided', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getDropdown(
        { tanka_type: 2 } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      const ttCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          sql.includes('tanka_type') &&
          params?.tt === 2,
      );
      expect(ttCall).toBeDefined();
    });

    it('should ILIKE on tanka_name when q is provided', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getDropdown(
        { q: '配達' } as any,
        buildChuokaiSession({ ja_id: 1 }),
      );

      const ilike = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && sql.includes('tanka_name ILIKE'),
      );
      expect(ilike).toBeDefined();
      expect(ilike![1]).toEqual({ q: '%配達%' });
    });

    it('should filter out inactive + out-of-period rows', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getDropdown({} as any, buildChuokaiSession({ ja_id: 1 }));

      const allWhereCalls = [
        ...qbMock.where.mock.calls,
        ...qbMock.andWhere.mock.calls,
      ].map(([sql]: any[]) => (typeof sql === 'string' ? sql : ''));
      expect(allWhereCalls.some((s) => /active_flg/.test(s))).toBe(true);
      expect(allWhereCalls.some((s) => /tekiyo_start_date/.test(s))).toBe(true);
      expect(allWhereCalls.some((s) => /tekiyo_end_date/.test(s))).toBe(true);
    });

    it('should accept explicit ja_id filter when caller has no session JA (NICHINO_STAFF 代行入力)', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      // Session with ja_id=null mimics NICHINO_STAFF / NICHINO_ADMIN.
      await service.getDropdown(
        { ja_id: 7 } as any,
        buildChuokaiSession({ ja_id: null as any }),
      );

      const jaCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          sql.includes('ja_id') &&
          params?.qja === 7,
      );
      expect(jaCall).toBeDefined();
    });
  });

  // ─── API-002-002 — DELETE /api/v1/tanka/:tanka_id (remove) ───────────────
  describe('remove', () => {
    it('should soft-delete and return success message when target exists', async () => {
      // COVERS: §4.5 論理削除 + §4.7 レスポンス
      const target = buildTanka({ tankaId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(target);

      const result = await service.remove(
        5,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result).toEqual({ message: '削除しました。' });
    });

    it('should return verb-only "削除しました。" message (no entity prefix)', async () => {
      // COVERS: i18n message convention — verb-only, NOT '単価を削除しました。'
      const target = buildTanka({ tankaId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(target);

      const result = await service.remove(
        5,
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );
      expect(result.message).toBe('削除しました。');
      expect(result.message).not.toContain('単価を');
    });

    it('should throw NotFoundException when target tanka does not exist', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.remove(999, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope)', async () => {
      // COVERS: §4.2-4.3 DataScope — out-of-scope rows masked as 404
      // (assertJaScope throws NotFound instead of Forbidden to hide existence)
      const otherJa = buildTanka({ tankaId: 5, jaId: 99 });
      repo.findOne.mockResolvedValue(otherJa);
      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when m_hanbaiten references the tanka', async () => {
      // COVERS: §4.4 関連データチェック — m_hanbaiten.haitatsuryo_tanka_id FK
      // err:CONFLICT (row 9)
      const target = buildTanka({ tankaId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(target);
      dataSource.query.mockImplementation(async (sql: string) => {
        if (/m_hanbaiten/i.test(sql)) return [{ count: '2' }];
        return [{ count: '0' }];
      });

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when t_dokusya references the tanka', async () => {
      // COVERS: §4.4 関連データチェック — t_dokusya.tanka_id FK
      const target = buildTanka({ tankaId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(target);
      dataSource.query.mockImplementation(async (sql: string) => {
        if (/t_dokusya/i.test(sql)) return [{ count: '1' }];
        return [{ count: '0' }];
      });

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(ConflictException);
    });

    it('should wrap soft-delete UPDATE + audit log in a single transaction', async () => {
      // COVERS: ※トランザクション境界 — 本処理 + 操作ログ記録 atomic
      const target = buildTanka({ tankaId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(target);

      await service.remove(
        5,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.update).toHaveBeenCalled();
      // logDelete (or logOperation) inside the transaction
      const auditCalledInsideTx =
        auditLog.logDelete.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.length > 0;
      expect(auditCalledInsideTx).toBe(true);
    });

    it('should call AuditLogService with bare "DELETE" operation (NOT prefixed like "TANKA_DELETE")', async () => {
      // COVERS: §4.6 操作ログ — operation MUST be bare 'DELETE'
      const target = buildTanka({ tankaId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(target);

      await service.remove(
        5,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // Service uses the shorthand `auditLog.logDelete(ctx, before)`
      // which is hard-coded to emit `operation: 'DELETE'` (bare; see
      // AuditLogService). Calling the shorthand IS the bare-DELETE
      // contract — assert it was invoked and that no prefixed
      // operation was ever emitted via the lower-level logOperation.
      expect(auditLog.logDelete).toHaveBeenCalled();
      const logOpCalls = auditLog.logOperation.mock.calls as any[][];
      const prefixed = logOpCalls
        .map((c) => c[0]?.operation)
        .filter((v: any): v is string => typeof v === 'string')
        .filter((v: string) => /^TANKA_|^M_TANKA_/i.test(v));
      expect(prefixed).toEqual([]);
    });

    it('should record audit log with target_table="m_tanka" and target_id=tanka_id', async () => {
      // COVERS: §4.6 INSERT t_log — target_id + target_table fields
      const target = buildTanka({ tankaId: 42, jaId: 1 });
      repo.findOne.mockResolvedValue(target);

      await service.remove(
        42,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const calls = [
        ...auditLog.logDelete.mock.calls.map((c: any[]) => c[0]),
        ...auditLog.logOperation.mock.calls.map((c: any[]) => c[0]),
      ];
      const matched = calls.find(
        (ctx: any) =>
          ctx?.table === 'm_tanka' &&
          (ctx?.targetId === 42 || ctx?.target_id === 42),
      );
      expect(matched).toBeDefined();
    });

    it('should rollback the soft-delete when audit log inside transaction fails', async () => {
      // COVERS: transaction rollback — main UPDATE must not persist if audit fails
      const target = buildTanka({ tankaId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(target);
      auditLog.logDelete.mockRejectedValue(new Error('audit log unreachable'));
      auditLog.logOperation.mockRejectedValue(
        new Error('audit log unreachable'),
      );

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow();

      // After rollback, dataSource.transaction's callback threw — caller saw error
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should still emit error audit log (log_type=3, result_status=2) OUTSIDE the rolled-back transaction', async () => {
      // COVERS: §4.8 例外処理 — log_type=3 outside tx so trace survives
      const target = buildTanka({ tankaId: 5, jaId: 1 });
      repo.findOne.mockResolvedValue(target);
      txManager.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.remove(5, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow();

      // logError (or logOperation with logType=3) called AFTER the tx rejection.
      const errorAuditCalled =
        auditLog.logError.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some(
          (c: any[]) => c[0]?.logType === 3 || c[0]?.log_type === 3,
        );
      expect(errorAuditCalled).toBe(true);
    });

    it('should pass before_value snapshot to audit log (for forensic reconstruction)', async () => {
      // COVERS: §4.5 — capture deleted row BEFORE the UPDATE so audit retains it
      const target = buildTanka({
        tankaId: 5,
        jaId: 1,
        tankaCode: 'T005',
        tankaName: '削除対象単価',
      });
      repo.findOne.mockResolvedValue(target);

      await service.remove(
        5,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // logDelete signature is (ctx, before) per AuditLogService
      const firstDeleteCall = auditLog.logDelete.mock.calls[0];
      if (firstDeleteCall) {
        const before = firstDeleteCall[1];
        expect(before).toBeDefined();
        expect(before).toMatchObject({ tankaId: 5, tankaCode: 'T005' });
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-003 — detail + create + update (separate top-level describe so its
// mock setup, especially the codeService default + txManager save shape,
// doesn't leak into the SCR-002 block above).
// ═══════════════════════════════════════════════════════════════════════

describe('TankaService — SCR-003 (detail + create + update)', () => {
  let service: TankaService;
  let repo: any;
  let qbMock: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
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
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => qbMock),
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

    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        return value && typeof value === 'object' && 'tankaId' in value
          ? { ...value }
          : { ...value, tankaId: 10, createdAt: new Date(), updatedAt: null };
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      query: jest.fn(async () => [{ count: '0' }]),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => [{ count: '0' }]),
    };

    service = new TankaService(repo, dataSource, auditLog, codeService);

    // [time-pin] CREATE rejects a past 適用開始日. Pin "today" BEFORE the
    // fixtures' fixed start (2026-06-01) so the date-range guard stays
    // deterministic as the real clock moves past those dates. Only `Date`
    // is faked — timer APIs stay real so async mocks don't hang.
    jest.useFakeTimers({
      now: new Date('2026-05-15T00:00:00+09:00'),
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ────────────────────────────────────────────────────────────────────────
  // API-003-001 — GET /api/v1/tanka/:tanka_id (findById)
  // ────────────────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('should return TankaResponseDto when target exists and ja_id matches (CHUOKAI)', async () => {
      // COVERS: §4.3 happy path — SELECT … WHERE tanka_id = :id AND ja_id = :ja_id
      const target = buildTanka({ tankaId: 1, jaId: 1, tankaCode: 'T001' });
      repo.findOne.mockResolvedValue(target);

      const result = await service.findById(1, buildChuokaiSession({ ja_id: 1 }));

      expect(result).toMatchObject({
        tanka_id: 1,
        ja_id: 1,
        tanka_code: 'T001',
      });
    });

    it('should query repo with deleted_at IS NULL filter when called', async () => {
      // COVERS: §4.3 — AND deleted_at IS NULL
      const target = buildTanka({ tankaId: 1, jaId: 1 });
      repo.findOne.mockResolvedValue(target);

      await service.findById(1, buildChuokaiSession({ ja_id: 1 }));

      expect(repo.findOne).toHaveBeenCalled();
      const arg = repo.findOne.mock.calls[0]?.[0];
      // TypeORM uses IsNull() — assert the where shape carries deletedAt
      expect(arg?.where).toBeDefined();
      expect(
        Object.prototype.hasOwnProperty.call(arg.where, 'deletedAt') ||
          Object.prototype.hasOwnProperty.call(arg.where, 'deleted_at'),
      ).toBe(true);
    });

    it('should serialize tanka_type as a Number (not a label) when row resolves', async () => {
      // COVERS: §レスポンスデータ #4 — ラベルは FE で codes.label() — BE は値のみ
      const target = buildTanka({ tankaId: 1, jaId: 1, tankaType: 2 });
      repo.findOne.mockResolvedValue(target);

      const result = await service.findById(1, buildChuokaiSession({ ja_id: 1 }));
      expect(typeof result.tanka_type).toBe('number');
      expect(result.tanka_type).toBe(2);
    });

    it('should include biko field as "" when DB has empty string', async () => {
      // COVERS: §レスポンスデータ #13 — biko NOT NULL, "" when blank
      const target = buildTanka({ tankaId: 1, jaId: 1, biko: '' });
      repo.findOne.mockResolvedValue(target);

      const result = await service.findById(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.biko).toBe('');
    });

    it('should serialize tekiyo_end_date as null when DB row stores NULL (無期限)', async () => {
      // COVERS: §レスポンスデータ #11 — Nullable per database-design
      const target = buildTanka({ tankaId: 1, jaId: 1, tekiyoEndDate: null });
      repo.findOne.mockResolvedValue(target);

      const result = await service.findById(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.tekiyo_end_date).toBeNull();
    });

    it('should throw NotFoundException when target does not exist', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.findById(999, buildChuokaiSession({ ja_id: 1 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope)', async () => {
      // COVERS: §4.3 — DataScope out-of-scope masked as NotFound (hides
      // existence per .claude/rules/security.md Layer 2 convention).
      const otherJa = buildTanka({ tankaId: 1, jaId: 99 });
      repo.findOne.mockResolvedValue(otherJa);
      await expect(
        service.findById(1, buildChuokaiSession({ ja_id: 1 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT call AuditLogService — read-only endpoint', async () => {
      // findById is GET — never writes t_log
      const target = buildTanka({ tankaId: 1, jaId: 1 });
      repo.findOne.mockResolvedValue(target);

      await service.findById(1, buildChuokaiSession({ ja_id: 1 }));

      expect(auditLog.logOperation).not.toHaveBeenCalled();
      expect(auditLog.logCreate).not.toHaveBeenCalled();
      expect(auditLog.logUpdate).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // API-003-002 — POST /api/v1/tanka (create)
  // ────────────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('should return TankaResponseDto with tanka_id assigned after INSERT', async () => {
      // COVERS: §4.4 INSERT + §4.6 レスポンス生成
      repo.count.mockResolvedValue(0); // no duplicate
      const payload = buildCreateTankaPayload();
      const session = buildChuokaiSession({ ja_id: 1, account_id: 11 });

      const result = await service.create(payload, session, baseReq);

      expect(result.tanka_id).toBe(10); // txManager.save assigns 10
      expect(result.tanka_code).toBe(payload.tanka_code);
      expect(result.ja_id).toBe(1);
    });

    it('should bind ja_id from session, NOT from request body (security)', async () => {
      // COVERS: §4.4 — INSERT uses :ja_id from session
      repo.count.mockResolvedValue(0);
      const payload = buildCreateTankaPayload();
      const session = buildChuokaiSession({ ja_id: 42, account_id: 11 });

      const result = await service.create(payload, session, baseReq);
      expect(result.ja_id).toBe(42);
    });

    it('should throw DuplicateCodeException when tanka_code already exists', async () => {
      // COVERS: §4.3 重複チェック — err:DUPLICATE_CODE (row 9)
      repo.count.mockResolvedValue(1); // existing row collides
      const payload = buildCreateTankaPayload({ tanka_code: 'T001' });

      await expect(
        service.create(payload, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(DuplicateCodeException);
    });

    it('should include the conflicting value in the duplicate error message', async () => {
      // Convention per .claude/rules/nestjs.md §BE message — error names
      // value so user can fix the row: 「単価コード「T001」はすでに登録…」
      repo.count.mockResolvedValue(1);
      try {
        await service.create(
          buildCreateTankaPayload({ tanka_code: 'T001' }),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        );
        fail('expected DuplicateCodeException');
      } catch (err: any) {
        const body = err?.response ?? err?.getResponse?.() ?? err;
        const msg = body?.message ?? '';
        expect(msg).toContain('T001');
      }
    });

    it('should reject when tekiyo_start_date is in the past (defense-in-depth vs FE picker)', async () => {
      // COVERS: §4.2 — 適用開始日は本日以降。FE picker disabled-date は
      // primary だが curl などで past start を送れるため BE でも遮断。
      repo.count.mockResolvedValue(0);
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .slice(0, 10);

      await expect(
        service.create(
          buildCreateTankaPayload({
            tekiyo_start_date: yesterday,
            tekiyo_end_date: '2099-12-31',
          }),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'tekiyo_start_date',
              message: '適用開始日は本日以降の日付を指定してください。',
            }),
          ]),
        }),
      });
    });

    it('should reject when tekiyo_end_date is before tekiyo_start_date', async () => {
      // COVERS: §4.2 — 適用終了日 >= 適用開始日 (mirrors FE
      // DATE_ORDER_MSG; canonical wire-format message wins).
      repo.count.mockResolvedValue(0);

      await expect(
        service.create(
          buildCreateTankaPayload({
            tekiyo_start_date: '2099-06-01',
            tekiyo_end_date: '2099-05-31',
          }),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'tekiyo_end_date',
              message: '適用終了日は適用開始日以降を指定してください。',
            }),
          ]),
        }),
      });
    });

    it('should reject when tanka_type is not in m_code TANKA_TYPE', async () => {
      // COVERS: api.md §2 — tanka_type 値は m_code TANKA_TYPE 参照.
      // CodeService.has() returns false → VALIDATION_ERROR with field='tanka_type'.
      repo.count.mockResolvedValue(0);
      codeService.has.mockImplementation((cat: string) => cat !== 'TANKA_TYPE');

      await expect(
        service.create(
          buildCreateTankaPayload({ tanka_type: 99 }),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'tanka_type' }),
          ]),
        }),
      });
    });

    it('should default biko to "" when omitted in payload', async () => {
      // COVERS: api.md §レスポンスデータ #13 — biko NOT NULL, "" when blank
      repo.count.mockResolvedValue(0);
      const payload = buildCreateTankaPayload({ biko: undefined });

      const result = await service.create(
        payload,
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(result.biko).toBe('');
    });

    it('should default active_flg to true when omitted in payload', async () => {
      // COVERS: api.md §リクエストパラメータ #10 — 省略時は TRUE
      repo.count.mockResolvedValue(0);
      const payload = buildCreateTankaPayload({ active_flg: undefined });

      const result = await service.create(
        payload,
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(result.active_flg).toBe(true);
    });

    it('should default campaign_flg to false when omitted in payload', async () => {
      repo.count.mockResolvedValue(0);
      // Future start date so assertCreateDateRange (start >= today) passes
      // regardless of wall-clock. The shared fixture's default start date
      // is fixed and trips the past-date guard once today moves past it
      // (pre-existing time-bomb in the sibling create tests).
      const payload = buildCreateTankaPayload({
        campaign_flg: undefined,
        tekiyo_start_date: '2099-01-01',
        tekiyo_end_date: '2099-12-31',
      });

      const result = await service.create(
        payload,
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(result.campaign_flg).toBe(false);
    });

    it('should wrap INSERT + audit log in a single transaction', async () => {
      // COVERS: ※トランザクション境界 — 本処理 + 操作ログ記録 atomic
      repo.count.mockResolvedValue(0);

      await service.create(
        buildCreateTankaPayload(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.save).toHaveBeenCalled();
      // logCreate (or logOperation) must run inside the same tx
      const auditCalledInsideTx =
        auditLog.logCreate.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.length > 0;
      expect(auditCalledInsideTx).toBe(true);
    });

    it('should call AuditLogService with bare "CREATE" operation (NOT prefixed)', async () => {
      // COVERS: §4.5 操作ログ — operation MUST be bare 'CREATE'
      repo.count.mockResolvedValue(0);

      await service.create(
        buildCreateTankaPayload(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // Service uses the shorthand `auditLog.logCreate(ctx, after)`
      // which is hard-coded to emit `operation: 'CREATE'` (bare; see
      // AuditLogService). Calling the shorthand IS the bare-CREATE
      // contract — assert it was invoked and that no prefixed
      // operation was ever emitted via the lower-level logOperation.
      expect(auditLog.logCreate).toHaveBeenCalled();
      const logOpCalls = auditLog.logOperation.mock.calls as any[][];
      const prefixed = logOpCalls
        .map((c) => c[0]?.operation)
        .filter((v: any): v is string => typeof v === 'string')
        .filter((v: string) => /^TANKA_|^M_TANKA_/i.test(v));
      expect(prefixed).toEqual([]);
    });

    it('should rollback INSERT when audit log throws (atomic guarantee)', async () => {
      // COVERS: ※トランザクション境界 — 本処理 + 監査ログのアトミック性
      repo.count.mockResolvedValue(0);
      auditLog.logCreate.mockRejectedValue(new Error('audit log broke'));
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));

      // Simulate the transaction failing — when callback throws, the outer
      // transaction wrapper re-throws (mock returns whatever cb returns).
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (err) {
          throw err; // mirror real TypeORM rollback semantics
        }
      });

      await expect(
        service.create(
          buildCreateTankaPayload(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    it('should emit error audit log (log_type=3) OUTSIDE transaction on failure', async () => {
      // COVERS: §4.7 例外処理 — エラーログ (log_type=3) はトランザクション外で記録
      repo.count.mockResolvedValue(0);
      txManager.save.mockRejectedValue(new Error('DB exploded'));

      await expect(
        service.create(
          buildCreateTankaPayload(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      // logError MUST have been called (outside the rolled-back tx)
      expect(auditLog.logError).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // API-003-003 — PUT /api/v1/tanka/:tanka_id (update)
  // ────────────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('should return updated TankaResponseDto when target exists and ja_id matches', async () => {
      // COVERS: §4.4 UPDATE + §4.6 レスポンス生成
      const before = buildTanka({ tankaId: 1, jaId: 1, tankaName: '旧名' });
      repo.findOne.mockResolvedValue(before);
      txManager.save.mockResolvedValue({
        ...before,
        tankaName: '基本購読料（月額）改定',
        updatedAt: new Date(),
      });

      const result = await service.update(
        1,
        buildUpdateTankaPayload({ tanka_name: '基本購読料（月額）改定' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.tanka_id).toBe(1);
      expect(result.tanka_name).toBe('基本購読料（月額）改定');
    });

    it('should silently preserve existing tekiyo_start_date when the stored start is already in the past', async () => {
      // COVERS: 適用開始日 immutable after it has passed. FE picker
      // disables the input; BE mirrors via silent-drop (FIELD_RESTRICTIONS
      // pattern from .claude/rules/security.md Layer 3) so curl-bypass
      // can't rewrite the historical start date.
      const before = buildTanka({
        tankaId: 1,
        jaId: 1,
        tekiyoStartDate: '2024-01-15', // before today
      });
      repo.findOne.mockResolvedValue(before);
      let savedPayload: Partial<Tanka> = {};
      txManager.save.mockImplementation((_entity: unknown, row: Partial<Tanka>) => {
        savedPayload = row;
        return Promise.resolve(row);
      });

      await service.update(
        1,
        buildUpdateTankaPayload({
          tekiyo_start_date: '2099-12-01', // attempt to change
          tekiyo_end_date: '2099-12-31',
        }),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(savedPayload.tekiyoStartDate).toBe('2024-01-15');
    });

    it('should allow tekiyo_start_date update when the stored start is still in the future', async () => {
      // Future-start records remain editable so the user can shift
      // the effective date before it kicks in.
      const futureStart = new Date(Date.now() + 14 * 86400000)
        .toISOString()
        .slice(0, 10);
      const before = buildTanka({
        tankaId: 1,
        jaId: 1,
        tekiyoStartDate: futureStart,
      });
      repo.findOne.mockResolvedValue(before);
      let savedPayload: Partial<Tanka> = {};
      txManager.save.mockImplementation((_entity: unknown, row: Partial<Tanka>) => {
        savedPayload = row;
        return Promise.resolve(row);
      });

      const newStart = new Date(Date.now() + 28 * 86400000)
        .toISOString()
        .slice(0, 10);
      await service.update(
        1,
        buildUpdateTankaPayload({
          tekiyo_start_date: newStart,
          tekiyo_end_date: '2099-12-31',
        }),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(savedPayload.tekiyoStartDate).toBe(newStart);
    });

    it('should preserve tanka_code unchanged (immutable per api.md §API-003-003 footnote)', async () => {
      // COVERS: 「tanka_code は更新不可」— even if payload included tanka_code
      // somehow, the stored value MUST remain the original.
      const before = buildTanka({ tankaId: 1, jaId: 1, tankaCode: 'T001' });
      repo.findOne.mockResolvedValue(before);

      const result = await service.update(
        1,
        buildUpdateTankaPayload(),
        buildChuokaiSession({ ja_id: 1 }),
        baseReq,
      );

      expect(result.tanka_code).toBe('T001');
    });

    it('should throw NotFoundException when target does not exist', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.update(
          999,
          buildUpdateTankaPayload(),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope)', async () => {
      // COVERS: §4.3 — DataScope masks out-of-scope as 404
      const otherJa = buildTanka({ tankaId: 1, jaId: 99 });
      repo.findOne.mockResolvedValue(otherJa);

      await expect(
        service.update(
          1,
          buildUpdateTankaPayload(),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when tanka_type is not in m_code TANKA_TYPE', async () => {
      // COVERS: api.md §2 — tanka_type validated against m_code
      const before = buildTanka({ tankaId: 1, jaId: 1 });
      repo.findOne.mockResolvedValue(before);
      codeService.has.mockImplementation((cat: string) => cat !== 'TANKA_TYPE');

      await expect(
        service.update(
          1,
          buildUpdateTankaPayload({ tanka_type: 99 }),
          buildChuokaiSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'tanka_type' }),
          ]),
        }),
      });
    });

    it('should wrap UPDATE + audit log in a single transaction', async () => {
      // COVERS: ※トランザクション境界
      const before = buildTanka({ tankaId: 1, jaId: 1 });
      repo.findOne.mockResolvedValue(before);

      await service.update(
        1,
        buildUpdateTankaPayload(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      const auditCalledInsideTx =
        auditLog.logUpdate.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.length > 0;
      expect(auditCalledInsideTx).toBe(true);
    });

    it('should call AuditLogService with bare "UPDATE" operation (NOT prefixed)', async () => {
      // COVERS: §4.5 操作ログ — operation MUST be bare 'UPDATE'
      const before = buildTanka({ tankaId: 1, jaId: 1 });
      repo.findOne.mockResolvedValue(before);

      await service.update(
        1,
        buildUpdateTankaPayload(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // Service uses the shorthand `auditLog.logUpdate(ctx, before, after)`
      // which is hard-coded to emit `operation: 'UPDATE'` (bare; see
      // AuditLogService). Calling the shorthand IS the bare-UPDATE
      // contract — assert it was invoked and that no prefixed
      // operation was ever emitted via the lower-level logOperation.
      expect(auditLog.logUpdate).toHaveBeenCalled();
      const logOpCalls = auditLog.logOperation.mock.calls as any[][];
      const prefixed = logOpCalls
        .map((c) => c[0]?.operation)
        .filter((v: any): v is string => typeof v === 'string')
        .filter((v: string) => /^TANKA_|^M_TANKA_/i.test(v));
      expect(prefixed).toEqual([]);
    });

    it('should pass before-snapshot to audit log so before_value JSON is populated', async () => {
      // COVERS: §4.5 操作ログ — `before_value` ← 更新前のデータJSON
      const before = buildTanka({
        tankaId: 1,
        jaId: 1,
        tankaName: '旧名',
        kingakuZeikomi: 4900,
      });
      repo.findOne.mockResolvedValue(before);

      await service.update(
        1,
        buildUpdateTankaPayload({
          tanka_name: '新名',
          kingaku_zeikomi: 5200,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // logUpdate signature: (ctx, before, after)
      const calls = auditLog.logUpdate.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const beforeArg = calls[0]?.[1];
      expect(beforeArg).toBeDefined();
      // before snapshot carries the old tankaName
      const flatBefore = JSON.stringify(beforeArg);
      expect(flatBefore).toContain('旧名');
    });

    it('should rollback UPDATE when audit log throws', async () => {
      // COVERS: ※トランザクション境界 — rollback on audit log failure
      const before = buildTanka({ tankaId: 1, jaId: 1 });
      repo.findOne.mockResolvedValue(before);
      auditLog.logUpdate.mockRejectedValue(new Error('audit log broke'));
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));

      dataSource.transaction.mockImplementation(async (cb: any) => cb(txManager));

      await expect(
        service.update(
          1,
          buildUpdateTankaPayload(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    it('should emit error audit log (log_type=3) OUTSIDE transaction on failure', async () => {
      // COVERS: §4.7 例外処理 — log_type=3 outside the rolled-back tx
      const before = buildTanka({ tankaId: 1, jaId: 1 });
      repo.findOne.mockResolvedValue(before);
      txManager.save.mockRejectedValue(new Error('DB exploded'));

      await expect(
        service.update(
          1,
          buildUpdateTankaPayload(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      expect(auditLog.logError).toHaveBeenCalled();
    });
  });
});

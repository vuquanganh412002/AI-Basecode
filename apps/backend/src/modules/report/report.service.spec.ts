// Screen: ACSMS-SCR-026 — 購読者名簿出力画面 + ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
//
// ReportService unit specs for:
//   - previewMeibo(query, session)              — API-026-001 (GET preview)
//   - exportMeiboExcel(query, session, req)     — API-026-002 (GET Excel export)
//   - previewZougenHanbaiten(query, session)    — API-028-001 (GET preview)
//   - exportZougenHanbaitenPdf(body, session, req) — API-028-002 (POST PDF export)
//
// Pattern: plain `new ReportService(...)` with mocked deps.
// Each it() maps back to a clause in the matching api.md.

import { ReportService } from '@/modules/report/report.service';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';
import {
  buildMeiboQuery,
  buildKanriShitenMeiboQuery,
  buildMeiboRawRow,
} from '@test/fixtures/report.factory';
import {
  buildZougenQuery,
  buildZougenRawRow,
} from '@test/fixtures/report-zougen.factory';

describe('ReportService', () => {
  let service: ReportService;
  let rirekiRepo: any;
  let fileDownloadRepo: any;
  let qbMock: any;
  let auditLog: any;
  let codeService: any;
  let storage: any;

  const req = { ip: '192.168.1.50', headers: { 'user-agent': 'jest' } } as any;

  // A JA-scoped session that actually holds report.export_meibo.
  const jaSession = (overrides = {}) =>
    buildChuokaiSession({ ja_id: 1, permissions: ['report.export_meibo'], ...overrides });

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    rirekiRepo = { createQueryBuilder: jest.fn(() => qbMock) };
    fileDownloadRepo = {
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => ({ fileDownloadId: 1, ...v })),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    codeService = {
      has: jest.fn().mockReturnValue(true),
      getLabel: jest.fn().mockReturnValue(''),
    };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };

    // Constructor order MUST match the service:
    //   constructor(
    //     @InjectRepository(DokusyaRireki) rirekiRepo,
    //     @InjectRepository(FileDownload) fileDownloadRepo,
    //     auditLog: AuditLogService,
    //     codeService: CodeService,
    //     storage: StorageService,
    //   )
    service = new ReportService(
      rirekiRepo,
      fileDownloadRepo,
      auditLog,
      codeService,
      storage,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  // API-026-001 — GET /api/v1/report/meibo/preview
  // ═══════════════════════════════════════════════════════════════════
  describe('previewMeibo', () => {
    it('should return a 販売店別 grouped structure when report_type is hanbaiten', async () => {
      // COVERS: 4.5 レスポンス生成 — 販売店 → 管理支店 → 購読者 のネスト
      qbMock.getRawMany.mockResolvedValue([
        buildMeiboRawRow({ hanbaiten_id: 1, kanri_shiten_id: 10, dokusya_busu: 3 }),
        buildMeiboRawRow({ hanbaiten_id: 1, kanri_shiten_id: 10, dokusya_busu: 2 }),
      ]);

      const result = await service.previewMeibo(buildMeiboQuery(), jaSession());

      expect(result.report_type).toBe('hanbaiten');
      expect(result.tekiyo_date).toBe('2026-04-01');
      expect(result.kanri_shiten_groups).toEqual([]);
      expect(result.hanbaiten_groups).toHaveLength(1);
      const hg = result.hanbaiten_groups[0];
      expect(hg.hanbaiten_id).toBe(1);
      expect(hg.total_busu).toBe(5);
      expect(hg.kanri_shiten_groups[0].subtotal_busu).toBe(5);
      expect(hg.kanri_shiten_groups[0].rows).toHaveLength(2);
      expect(result.grand_total_busu).toBe(5);
    });

    it('should return a 管理支店別 grouped structure when report_type is kanri_shiten', async () => {
      // COVERS: 4.5 レスポンス生成 — 管理支店 → 購読者 のネスト
      qbMock.getRawMany.mockResolvedValue([
        buildMeiboRawRow({ kanri_shiten_id: 10, dokusya_busu: 2 }),
      ]);

      const result = await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      expect(result.report_type).toBe('kanri_shiten');
      expect(result.hanbaiten_groups).toEqual([]);
      expect(result.kanri_shiten_groups).toHaveLength(1);
      const kg = result.kanri_shiten_groups[0];
      expect(kg.kanri_shiten_id).toBe(10);
      expect(kg.subtotal_busu).toBe(2);
      expect(kg.total_busu).toBe(2);
      expect(kg.rows[0].dokusya_id).toBeDefined();
      expect(kg.rows[0].dokusya_shubetsu).toBe(1);
      expect(kg.rows[0].kumiaiin_code).toBe('K0001');
      expect(kg.rows[0].shiten_name).toBe('千代田支店');
      expect(kg.rows[0].hanbaiten_name).toBe('東京中央販売店');
      expect(kg.rows[0].shiharai_hoho).toBe(1);
    });

    it('should use 購読者名 for shimei when haitatsu_same_flg is true', async () => {
      // COVERS: 4.5 — 配達先情報指定がFalseのとき購読者名を使用
      qbMock.getRawMany.mockResolvedValue([
        buildMeiboRawRow({
          haitatsu_same_flg: true,
          shimei_sei: '農業',
          shimei_mei: '太郎',
        }),
      ]);

      const result = await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      expect(result.kanri_shiten_groups[0].rows[0].shimei).toBe('農業 太郎');
    });

    it('should use 配達先氏名 for shimei when haitatsu_same_flg is false', async () => {
      // COVERS: 4.5 — 配達先情報指定がTrueのとき配達先氏名を使用
      qbMock.getRawMany.mockResolvedValue([
        buildMeiboRawRow({
          haitatsu_same_flg: false,
          shimei_sei: '農業',
          shimei_mei: '太郎',
          haitatsu_shimei_sei: '配達',
          haitatsu_shimei_mei: '花子',
        }),
      ]);

      const result = await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      expect(result.kanri_shiten_groups[0].rows[0].shimei).toBe('配達 花子');
    });

    it('should concatenate the 配達先住所 as 〒+郵便番号+市町村郡+丁目番地+建物名', async () => {
      // COVERS: 4.5 — haitatsu_address の連結
      qbMock.getRawMany.mockResolvedValue([buildMeiboRawRow()]);

      const result = await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      const addr = result.kanri_shiten_groups[0].rows[0].haitatsu_address;
      expect(addr).toContain('〒1000001');
      expect(addr).toContain('東京都千代田区');
      expect(addr).toContain('サンプルビル101');
    });

    it('should map haitatsu_renrakusaki_1 to the haitatsu_tel output field', async () => {
      qbMock.getRawMany.mockResolvedValue([
        buildMeiboRawRow({ haitatsu_renrakusaki_1: '03-1234-5678' }),
      ]);

      const result = await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      expect(result.kanri_shiten_groups[0].rows[0].haitatsu_tel).toBe('03-1234-5678');
    });

    // ─── validation (conditional-required) ───────────────────────────────
    it('should throw VALIDATION_ERROR (販売店を1件以上選択してください。) when report_type=hanbaiten and hanbaiten_ids is empty', async () => {
      // COVERS: 4.1 — ACSMS-MSG-026-002
      await expect(
        service.previewMeibo(buildMeiboQuery({ hanbaiten_ids: [] }), jaSession()),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'hanbaiten_ids',
              message: '販売店を1件以上選択してください。',
            }),
          ]),
        }),
      });
    });

    it('should throw VALIDATION_ERROR (管理支店を1件以上選択してください。) when report_type=kanri_shiten and kanri_shiten_ids is empty', async () => {
      // COVERS: 4.1 — ACSMS-MSG-026-003
      await expect(
        service.previewMeibo(
          buildKanriShitenMeiboQuery({ kanri_shiten_ids: [] }),
          jaSession(),
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'kanri_shiten_ids',
              message: '管理支店を1件以上選択してください。',
            }),
          ]),
        }),
      });
    });

    // ─── snapshot /抽出条件 ──────────────────────────────────────────────
    it('should bind the joho_henko_tekiyo_date <= tekiyo_date snapshot predicate', async () => {
      // COVERS: 4.3 — 適用日時点の最新スナップショット
      await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      const snapCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /joho_henko_tekiyo_date/.test(sql) &&
          /<=/.test(sql),
      );
      expect(snapCall).toBeDefined();
    });

    it('should restrict to tetsuzuki_shurui = 1 (新規 only, 解約除外)', async () => {
      // COVERS: 4.3 — 解約(tetsuzuki_shurui=0)は除外
      await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      const newOnly = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /tetsuzuki_shurui/.test(sql) &&
          (/\b1\b/.test(sql) || (params && Object.values(params).includes(1))),
      );
      expect(newOnly).toBeDefined();
    });

    it('should always exclude 併読 (dokusya_shubetsu = 3) regardless of the filter', async () => {
      // COVERS: 4.3 / 画面項目No.5「併読は除外」
      await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      const excludeHeiyo = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /dokusya_shubetsu/.test(sql) &&
          (/<>|!=|\bNOT\b/i.test(sql) ||
            /\b3\b/.test(sql) ||
            (params && Object.values(params).includes(3))),
      );
      expect(excludeHeiyo).toBeDefined();
    });

    it('should bind the dokusya_shubetsu filter when query.dokusya_shubetsu is provided', async () => {
      await service.previewMeibo(
        buildKanriShitenMeiboQuery({ dokusya_shubetsu: 2 }),
        jaSession(),
      );

      const filterCall = qbMock.andWhere.mock.calls.find(
        ([_sql, params]: any[]) => params && Object.values(params).includes(2),
      );
      expect(filterCall).toBeDefined();
    });

    it('should bind hanbaiten_id IN filter when report_type=hanbaiten', async () => {
      await service.previewMeibo(buildMeiboQuery({ hanbaiten_ids: [1, 2] }), jaSession());

      const inCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /hanbaiten_id/.test(sql),
      );
      expect(inCall).toBeDefined();
    });

    it('should bind kanri_shiten_id IN filter when report_type=kanri_shiten', async () => {
      await service.previewMeibo(
        buildKanriShitenMeiboQuery({ kanri_shiten_ids: [10, 11] }),
        jaSession(),
      );

      const inCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_shiten_id/.test(sql),
      );
      expect(inCall).toBeDefined();
    });

    it('should bind the dokusyaryo_shiharai_cycle filter when shiharai_cycle is provided (kanri_shiten only)', async () => {
      await service.previewMeibo(
        buildKanriShitenMeiboQuery({ shiharai_cycle: 12 }),
        jaSession(),
      );

      const cycleCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /dokusyaryo_shiharai_cycle/.test(sql) &&
          (/\b12\b/.test(sql) || (params && Object.values(params).includes(12))),
      );
      expect(cycleCall).toBeDefined();
    });

    // ─── DataScope ───────────────────────────────────────────────────────
    it('should bind ja_id scope predicate when session role_code is CHUOKAI', async () => {
      // COVERS: 4.2 DataScope — CHUOKAI: ja_id = user.ja_id
      await service.previewMeibo(
        buildKanriShitenMeiboQuery(),
        buildChuokaiSession({ ja_id: 7, permissions: ['report.export_meibo'] }),
      );

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should bind ja_id scope predicate when session role_code is JA_HONTEN', async () => {
      await service.previewMeibo(
        buildKanriShitenMeiboQuery(),
        buildJaHontenSession({ ja_id: 9, permissions: ['report.export_meibo'] }),
      );

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    it('should bind kanri_shiten_id scope predicate when session role_code is JA_KANRI_SHITEN', async () => {
      // COVERS: 4.2 DataScope — JA_KANRI_SHITEN: 自kanri_shiten_idのみ
      await service.previewMeibo(
        buildKanriShitenMeiboQuery(),
        buildJaKanriShitenSession({
          kanri_shiten_id: 33,
          permissions: ['report.export_meibo'],
        }),
      );

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /\bkanri_?[Ss]hiten_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

    // ─── empty result ────────────────────────────────────────────────────
    it('should return empty groups and grand_total_busu=0 (NOT 404) when no rows match', async () => {
      // COVERS: レスポンス成功例 注記 — プレビューでは404を返さない
      qbMock.getRawMany.mockResolvedValue([]);

      const result = await service.previewMeibo(buildMeiboQuery(), jaSession());

      expect(result.hanbaiten_groups).toEqual([]);
      expect(result.kanri_shiten_groups).toEqual([]);
      expect(result.grand_total_busu).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // API-026-002 — GET /api/v1/report/meibo/export (Excel)
  // ═══════════════════════════════════════════════════════════════════
  describe('exportMeiboExcel', () => {
    it('should return an Excel buffer + 購読者名簿_{YYYY年MM月}.xlsx filename when data exists', async () => {
      // COVERS: 4.4 / 4.6
      qbMock.getRawMany.mockResolvedValue([buildMeiboRawRow()]);

      const result = await service.exportMeiboExcel(
        buildMeiboQuery({ tekiyo_date: '2026-04-01' }),
        jaSession(),
        req,
      );

      expect(result).toEqual(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          filename: expect.stringMatching(/^購読者名簿_\d{4}年\d{2}月\.xlsx$/),
        }),
      );
      expect(result.filename).toBe('購読者名簿_2026年04月.xlsx');
    });

    it('should upload the generated Excel to S3 when export succeeds', async () => {
      // COVERS: 4.4 — 生成した Excel を S3 に保存
      qbMock.getRawMany.mockResolvedValue([buildMeiboRawRow()]);

      await service.exportMeiboExcel(buildMeiboQuery(), jaSession(), req);

      expect(storage.upload).toHaveBeenCalledTimes(1);
    });

    it('should record a t_file_download row with download_type=5 (購読者名簿) when export succeeds', async () => {
      // COVERS: 4.5 — ファイルダウンロード履歴の記録
      qbMock.getRawMany.mockResolvedValue([buildMeiboRawRow(), buildMeiboRawRow()]);

      await service.exportMeiboExcel(buildMeiboQuery(), jaSession(), req);

      expect(fileDownloadRepo.save).toHaveBeenCalledTimes(1);
      const saved = fileDownloadRepo.save.mock.calls[0][0];
      expect(saved.downloadType ?? saved.download_type).toBe(5);
    });

    it('should throw REPORT_NO_DATA (HTTP 404) when no rows match (Excel not generated)', async () => {
      // COVERS: 4.3 — 対象データなしの場合はExcelを生成しない
      qbMock.getRawMany.mockResolvedValue([]);

      await expect(
        service.exportMeiboExcel(buildMeiboQuery(), jaSession(), req),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'REPORT_NO_DATA' }),
      });
      expect(storage.upload).not.toHaveBeenCalled();
      expect(fileDownloadRepo.save).not.toHaveBeenCalled();
    });

    it('should emit an error log (log_type=3) OUTSIDE any transaction when export fails', async () => {
      // COVERS: 4.7 — エラーログはトランザクション外で記録
      qbMock.getRawMany.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportMeiboExcel(buildMeiboQuery(), jaSession(), req),
      ).rejects.toBeDefined();

      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should bind ja_id scope predicate when JA_HONTEN exports', async () => {
      // COVERS: 4.2 DataScope on the export path too
      qbMock.getRawMany.mockResolvedValue([buildMeiboRawRow()]);

      await service.exportMeiboExcel(
        buildMeiboQuery(),
        buildJaHontenSession({ ja_id: 9, permissions: ['report.export_meibo'] }),
        req,
      );

      const scopedCall = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scopedCall).toBeDefined();
    });

  });
});

// ══════════════════════════════════════════════════════════════════════
// ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
// ══════════════════════════════════════════════════════════════════════
describe('ReportService — 増減連絡票（販売店） (SCR-028)', () => {
  let service: ReportService;
  let rirekiRepo: any;
  let fileDownloadRepo: any;
  let qbMock: any;
  let auditLog: any;
  let codeService: any;
  let storage: any;
  let dataSource: any;
  let txManager: any;
  let pdfService: any;

  const req = { ip: '192.0.2.50', headers: { 'user-agent': 'jest' } } as any;

  // JA-scoped session holding report.export_zougen_hanbaiten.
  const zSession = (overrides = {}) =>
    buildChuokaiSession({
      ja_id: 1,
      permissions: ['report.export_zougen_hanbaiten'],
      ...overrides,
    });

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    rirekiRepo = { createQueryBuilder: jest.fn(() => qbMock) };
    fileDownloadRepo = {
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => ({ fileDownloadId: 7, ...v })),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    codeService = { has: jest.fn().mockReturnValue(true), getLabel: jest.fn().mockReturnValue('') };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };
    txManager = {
      create: jest.fn((_e: any, v: any) => ({ ...v })),
      save: jest.fn(async (_e: any, v: any) => ({ fileDownloadId: 7, ...(v ?? _e) })),
    };
    dataSource = { transaction: jest.fn(async (cb: any) => cb(txManager)) };
    pdfService = { generatePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test')) };

    // Constructor: SCR-028 appends @Optional() dataSource + pdfService
    // after the SCR-026 deps.
    //   constructor(rirekiRepo, fileDownloadRepo, auditLog, codeService,
    //               storage, @Optional() dataSource?, @Optional() pdfService?)
    service = new ReportService(
      rirekiRepo,
      fileDownloadRepo,
      auditLog,
      codeService,
      storage,
      dataSource,
      pdfService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  // API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview
  // ═══════════════════════════════════════════════════════════════════
  describe('previewZougenHanbaiten', () => {
    it('should return reports grouped by 販売店+管理支店 with tekiyo echoed when data exists', async () => {
      // COVERS: 4.5 レスポンス生成 — reports[] (販売店コード昇順)
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      expect(result.tekiyo_date).toBe('2026-05-01');
      expect(result.reports).toHaveLength(1);
      const rpt = result.reports[0];
      expect(rpt.hanbaiten_id).toBe(200);
      expect(rpt.hanbaiten_code).toBe('H001');
      expect(rpt.kanri_shiten_id).toBe(20);
      expect(rpt.kanri_shiten_tel).toBe('03-1234-5678');
      expect(rpt.kanri_shiten_fax).toBe('03-1234-5679');
    });

    it('should classify a record into zoubu when dokusya_busu > zenkai_dokusya_busu', async () => {
      // COVERS: 4.5 増部
      qbMock.getRawMany.mockResolvedValue([
        buildZougenRawRow({ dokusya_busu: 3, zenkai_dokusya_busu: 1 }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const rpt = result.reports[0];
      expect(rpt.zoubu).toHaveLength(1);
      expect(rpt.genbu).toHaveLength(0);
      expect(rpt.zoubu[0].busu).toBe('1 → 3');
      expect(rpt.zoubu[0].name).toBe('農業 太郎');
      expect(rpt.zoubu[0].delivery_name).toBe('農業 太郎');
      expect(rpt.zoubu[0].phone).toBe('03-1111-2222');
    });

    it('should classify a record into genbu when dokusya_busu < zenkai_dokusya_busu', async () => {
      // COVERS: 4.5 減部
      qbMock.getRawMany.mockResolvedValue([
        buildZougenRawRow({ dokusya_busu: 1, zenkai_dokusya_busu: 3 }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const rpt = result.reports[0];
      expect(rpt.genbu).toHaveLength(1);
      expect(rpt.zoubu).toHaveLength(0);
      expect(rpt.genbu[0].busu).toBe('3 → 1');
    });

    it('should emit two rows (変更前/変更後) in address_change when the delivery address changed', async () => {
      // COVERS: 4.5 住所変更 — 1購読者2行
      qbMock.getRawMany.mockResolvedValue([
        buildZougenRawRow({
          dokusya_busu: 2,
          zenkai_dokusya_busu: 2, // 部数同じ → 増減ではない
          zen_todofuken_name: '東京都',
          zenkai_shikuchoson: '中央区',
          zenkai_chome_banchi: '銀座3-3-3',
          zenkai_tatemono_mei: '',
        }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const rpt = result.reports[0];
      expect(rpt.address_change).toHaveLength(2);
      expect(rpt.address_change[0].label).toBe('変更前');
      expect(rpt.address_change[1].label).toBe('変更後');
      expect(rpt.address_change[0].address).toContain('銀座3-3-3'); // 前回住所
      expect(rpt.address_change[1].address).toContain('神田1-1-1'); // 現住所
    });

    it('should bind the joho_henko_tekiyo_date = tekiyo_date predicate', async () => {
      // COVERS: 4.3 適用日と一致
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /joho_henko_tekiyo_date/.test(sql) &&
          params &&
          Object.values(params).includes('2026-05-01'),
      );
      expect(call).toBeDefined();
    });

    it('should restrict to zougen_hokoku_flg = true (増減報告対象のみ)', async () => {
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /zougen_hokoku_flg/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should exclude 廃店 (haiten_flg = false) on the m_hanbaiten join', async () => {
      // COVERS: 4.3 廃店・電子版ダミー販売店を除外
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const haitenBound =
        qbMock.andWhere.mock.calls.some(
          ([sql]: any[]) => typeof sql === 'string' && /haiten_flg/.test(sql),
        ) ||
        qbMock.innerJoin.mock.calls.some(
          ([, , cond]: any[]) => typeof cond === 'string' && /haiten_flg/.test(cond),
        );
      expect(haitenBound).toBe(true);
    });

    it('should bind hanbaiten_id IN filter when hanbaiten_id is provided', async () => {
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery({ hanbaiten_id: [200, 201] }), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /hanbaiten_id/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should bind kanri_shiten_id IN filter when kanri_shiten_id is provided', async () => {
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery({ kanri_shiten_id: [20, 21] }), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_shiten_id/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should bind ja_id scope predicate when session role_code is CHUOKAI', async () => {
      // COVERS: 4.2 DataScope — CHUOKAI/JA_HONTEN: ja_id
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession({ ja_id: 7 }));

      const scoped = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scoped).toBeDefined();
    });

    it('should bind kanri_shiten_id scope predicate when session role_code is JA_KANRI_SHITEN', async () => {
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(
        buildZougenQuery(),
        buildJaKanriShitenSession({ kanri_shiten_id: 33, permissions: ['report.export_zougen_hanbaiten'] }),
      );

      const scoped = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bkanri_?[Ss]hiten_?[Ii]d\b/.test(sql),
      );
      expect(scoped).toBeDefined();
    });

    it('should return empty reports (NOT 404) when no record matches', async () => {
      // COVERS: 4.4 0件 → HTTP 200 + reports:[]（業務エラーではない）
      qbMock.getRawMany.mockResolvedValue([]);

      const result = await service.previewZougenHanbaiten(
        buildZougenQuery(),
        zSession(),
      );
      expect(result.reports).toEqual([]);
      expect(result.tekiyo_date).toBe(buildZougenQuery().tekiyo_date);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // API-028-002 — POST /api/v1/report/zougen-hanbaiten/export (PDF)
  // ═══════════════════════════════════════════════════════════════════
  describe('exportZougenHanbaitenPdf', () => {
    it('should return a PDF buffer + 増減連絡票_販売店_{YYYY年MM月DD日}.pdf filename when data exists', async () => {
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);

      const result = await service.exportZougenHanbaitenPdf(
        buildZougenQuery({ tekiyo_date: '2026-05-01' }),
        zSession(),
        req,
      );

      expect(result).toEqual(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          filename: '増減連絡票_販売店_2026年05月01日.pdf',
        }),
      );
      expect(pdfService.generatePdf).toHaveBeenCalledTimes(1);
    });

    it('should upload the generated PDF to S3 when export succeeds', async () => {
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req);
      expect(storage.upload).toHaveBeenCalledTimes(1);
    });

    it('should record a t_file_download row with download_type=3 (増減連絡票) when export succeeds', async () => {
      // COVERS: 4.5 download_type=3
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req);

      const saved =
        (fileDownloadRepo.create.mock.calls[0]?.[0] as any) ??
        (txManager.create.mock.calls[0]?.[1] as any) ??
        (txManager.save.mock.calls[0]?.[1] as any);
      expect(saved.downloadType ?? saved.download_type).toBe(3);
    });

    it('should wrap t_file_download + operation log in a single dataSource.transaction', async () => {
      // COVERS: 4.5/4.6 単一トランザクション
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should write an operation log with EXPORT_PDF + result_status success when export succeeds', async () => {
      // COVERS: 4.6 操作ログ — operation 'EXPORT_PDF'
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession({ account_id: 11 }), req);

      expect(auditLog.logOperation).toHaveBeenCalled();
      const args = auditLog.logOperation.mock.calls[0][0];
      expect(args).toEqual(
        expect.objectContaining({
          logType: 1,
          operation: 'EXPORT_PDF',
          resultStatus: 1,
          targetTable: 't_file_download',
        }),
      );
    });

    it('should NOT log personal data (氏名/住所) in the operation log after_value', async () => {
      // COVERS: 4.6 個人情報は含めない
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req);

      const args = auditLog.logOperation.mock.calls[0][0];
      const after = String(args.afterValue ?? '');
      expect(after).not.toContain('農業');
      expect(after).not.toContain('神田');
    });

    it('should rollback (operation log + t_file_download share the tx) when the audit log fails', async () => {
      // COVERS: tx rollback
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit-down'));

      await expect(
        service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req),
      ).rejects.toBeDefined();
    });

    it('should emit an error log (log_type=3) OUTSIDE the transaction when export fails', async () => {
      // COVERS: 4.8 エラーログはトランザクション外
      qbMock.getRawMany.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should return { empty: true } and NOT generate a PDF when no record matches', async () => {
      // COVERS: 4.3 0件 → HTTP 200 + 空配列, ファイル生成しない
      qbMock.getRawMany.mockResolvedValue([]);

      const result = await service.exportZougenHanbaitenPdf(
        buildZougenQuery(),
        zSession(),
        req,
      );
      expect(result).toEqual({ empty: true });
      expect(pdfService.generatePdf).not.toHaveBeenCalled();
      expect(storage.upload).not.toHaveBeenCalled();
      // 0件は履歴・操作ログも残さない。
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });

  });
});

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

import * as ExcelJS from 'exceljs';

import { attachLogExport } from '@test/utils/audit-log-mock';
import { ReportService } from '@/modules/report/report.service';
import { MeiboReportService } from '@/modules/report/meibo-report.service';
import { ZougenReportService } from '@/modules/report/zougen-report.service';
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
  let qbMock: any;
  let auditLog: any;
  let codeService: any;
  let storage: any;
  let reportArchive: any;

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
      groupBy: jest.fn().mockReturnThis(),
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
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    // logExport は実装と同じく logOperation へ委譲する（監査セマンティクス不変）。
    attachLogExport(auditLog);
    codeService = {
      has: jest.fn().mockReturnValue(true),
      getLabel: jest.fn().mockReturnValue(''),
    };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };
    reportArchive = {
      archive: jest
        .fn()
        .mockResolvedValue({ key: 'reports/meibo/x/y/2026/f.xlsx', filename: 'f.xlsx' }),
    };

    // Facade wiring: ReportService delegates to MeiboReportService +
    // ZougenReportService. Both sub-services are built from the SAME in-scope
    // mocks so every existing fileArchive/auditLog/codeService assertion holds.
    const meibo = new MeiboReportService(
      rirekiRepo,
      auditLog,
      codeService,
      reportArchive,
    );
    const zougen = new ZougenReportService(rirekiRepo, auditLog, reportArchive);
    service = new ReportService(meibo, zougen);
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

    it('should fall back to 購読者本人の住所・連絡先 when haitatsu_same_flg=true (haitatsu_* are blank)', async () => {
      // Regression: same_flg=TRUE のとき haitatsu_* は空欄で保存されるため、
      // 配達先住所/電話番号は購読者本人の住所・連絡先から取得する。
      qbMock.getRawMany.mockResolvedValue([
        buildMeiboRawRow({
          haitatsu_same_flg: true,
          yubin_no: '5000001',
          shikuchoson: '岐阜県岐阜市',
          chome_banchi: '司町1-1',
          tatemono_mei: '本人ビル202',
          renrakusaki_1: '058-111-2222',
          haitatsu_yubin_no: '',
          haitatsu_shikuchoson: '',
          haitatsu_chome_banchi: '',
          haitatsu_tatemono_mei: '',
          haitatsu_renrakusaki_1: '',
        }),
      ]);

      const row = (
        await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession())
      ).kanri_shiten_groups[0].rows[0];
      expect(row.haitatsu_address).toBe('〒5000001岐阜県岐阜市司町1-1本人ビル202');
      expect(row.haitatsu_tel).toBe('058-111-2222');
    });

    it('should use 配達先住所・連絡先 when haitatsu_same_flg=false (distinct from 本人)', async () => {
      qbMock.getRawMany.mockResolvedValue([
        buildMeiboRawRow({
          haitatsu_same_flg: false,
          yubin_no: '5000001',
          renrakusaki_1: '058-111-2222',
          haitatsu_yubin_no: '9000009',
          haitatsu_shikuchoson: '配達市',
          haitatsu_chome_banchi: '配達1-1',
          haitatsu_tatemono_mei: '配達ビル',
          haitatsu_renrakusaki_1: '099-888-7777',
        }),
      ]);

      const row = (
        await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession())
      ).kanri_shiten_groups[0].rows[0];
      expect(row.haitatsu_address).toBe('〒9000009配達市配達1-1配達ビル');
      expect(row.haitatsu_tel).toBe('099-888-7777');
    });

    it('paginates via SQL OFFSET/LIMIT + window aggregates (loads only the page)', async () => {
      // 管理支店10 に全5件。DBはページ分(rn 3,4)だけ返し、各行に全件ウィンドウ
      // 集計列を載せる（COUNT/SUM OVER）。BEは5件をメモリに抱えない。
      const win = (rn: number) =>
        buildMeiboRawRow({
          dokusya_id: 300 + rn,
          kanri_shiten_id: 10,
          kanri_shiten_name: '支所A',
          dokusya_busu: 1,
          _total_rows: 5,
          _grand_busu: 5,
          _kg_busu: 5,
          _kg_rn: rn,
          _kg_count: 5,
        });
      qbMock.getRawMany.mockResolvedValue([win(3), win(4)]);

      const res = await service.previewMeibo(
        buildKanriShitenMeiboQuery({ page: 2, per_page: 2 }),
        jaSession(),
      );

      expect(res.total_rows).toBe(5);
      expect(res.total_pages).toBe(3);
      expect(res.page_no).toBe(2);
      expect(res.is_last_page).toBe(false);
      expect(res.kanri_shiten_groups[0].rows).toHaveLength(2); // ページ分のみ
      expect(res.kanri_shiten_groups[0].is_continued).toBe(true); // 前ページから継続
      expect(res.grand_total_busu).toBe(5); // 全件合計（部分ページでも全件値）
      // SQL側でページングしていることを保証（OFFSET=(2-1)*2, LIMIT=2）。
      expect(qbMock.offset).toHaveBeenCalledWith(2);
      expect(qbMock.limit).toHaveBeenCalledWith(2);
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

    it('should count only 承認済 electronic subscribers (電子版=2 → denshi_shonin_status=1)', async () => {
      // COVERS: 電子版(DokusyaShubetsu.DIGITAL=2)は承認済(1)のみ集計対象。
      // 承認待ち(0)/否認(2)の電子版は名簿から除外する。
      await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /dokusya_shubetsu\s*<>/.test(sql) &&
          /denshi_shonin_status\s*=/.test(sql),
      );
      expect(call).toBeDefined();
      expect(call[1]).toMatchObject({ denshiShubetsu: 2, denshiApproved: 1 });
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

    it('should bind the shiharai_hoho filter when shiharai_hoho is provided (m_code SHIHARAI_HOHO)', async () => {
      await service.previewMeibo(
        buildKanriShitenMeiboQuery({ shiharai_hoho: 1 }),
        jaSession(),
      );

      const hohoCall = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /r\.shiharai_hoho\s*=/.test(sql) &&
          !/dokusyaryo_shiharai_cycle/.test(sql) &&
          (/\b1\b/.test(sql) || (params && Object.values(params).includes(1))),
      );
      expect(hohoCall).toBeDefined();
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
    it('should return an Excel buffer + 販売店別購読者名簿_{YYYY年MM月}.xlsx filename (report_type=hanbaiten) when data exists', async () => {
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
          filename: expect.stringMatching(/^販売店別購読者名簿_\d{4}年\d{2}月\.xlsx$/),
        }),
      );
      expect(result.filename).toBe('販売店別購読者名簿_2026年04月.xlsx');
    });

    it('should prefix the filename with 管理支店別 when report_type=kanri_shiten', async () => {
      qbMock.getRawMany.mockResolvedValue([buildMeiboRawRow()]);

      const result = await service.exportMeiboExcel(
        buildKanriShitenMeiboQuery({ tekiyo_date: '2026-04-01' }),
        jaSession(),
        req,
      );

      expect(result.filename).toBe('管理支店別購読者名簿_2026年04月.xlsx');
    });

    it('exports ONE A4-formatted sheet (fit-to-width A4) so 印刷 prints all pages', async () => {
      qbMock.getRawMany.mockResolvedValue([buildMeiboRawRow()]);

      const result = await service.exportMeiboExcel(buildMeiboQuery(), jaSession(), req);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(result.buffer as never);
      expect(wb.worksheets).toHaveLength(1); // 1シートに集約
      const ws = wb.worksheets[0];
      expect(ws.pageSetup.paperSize).toBe(9); // A4
      expect(ws.pageSetup.fitToPage).toBe(true);
      expect(ws.pageSetup.fitToWidth).toBe(1); // 列を1ページ幅(A4)に収める
      expect(ws.pageSetup.fitToHeight).toBe(0); // 行は縦に連続して複数A4に流す
    });

    it('repeats the report header per document page with distinct ページ数 k/M in cells', async () => {
      // 35件 → 15行/ページ → 3ページに分割（各ページにヘッダ+ページ数）。
      const rows = Array.from({ length: 35 }, (_, i) =>
        buildMeiboRawRow({ dokusya_id: 500 + i, hanbaiten_id: 1, kanri_shiten_id: 10 }),
      );
      qbMock.getRawMany.mockResolvedValue(rows);

      const result = await service.exportMeiboExcel(buildMeiboQuery(), jaSession(), req);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(result.buffer as never);
      const ws = wb.worksheets[0];

      const texts: string[] = [];
      ws.eachRow((r) =>
        r.eachCell((c) => {
          if (typeof c.value === 'string') texts.push(c.value);
        }),
      );
      const joined = texts.join('|');
      // ヘッダが各ページに繰り返される（タイトルが3ページ分。merge セルで複数
      // 計上されるため >= 3 で判定）。
      expect(texts.filter((t) => t === '販売店別購読者名簿').length).toBeGreaterThanOrEqual(3);
      // 各ページのページ数がセルに直接入る（Excel を開いた時点で見える）。
      expect(joined).toContain('ページ数：1/3');
      expect(joined).toContain('ページ数：2/3');
      expect(joined).toContain('ページ数：3/3');
    });

    it('should archive the generated Excel via FileArchiveService when export succeeds', async () => {
      // COVERS: 4.4 / 4.5 — S3 保存 + t_file_download 登録を共通サービスへ委譲
      qbMock.getRawMany.mockResolvedValue([buildMeiboRawRow(), buildMeiboRawRow()]);

      await service.exportMeiboExcel(
        buildMeiboQuery({ tekiyo_date: '2026-04-01' }),
        jaSession(),
        req,
      );

      expect(reportArchive.archive).toHaveBeenCalledTimes(1);
      const arg = reportArchive.archive.mock.calls[0][0];
      expect(arg).toEqual(
        expect.objectContaining({
          category: 'meibo',
          subFolder: 'hanbaiten',
          year: '2026',
          baseName: '販売店別購読者名簿_2026年04月',
          recordCount: 2,
          buffer: expect.any(Buffer),
        }),
      );
    });

    it('should throw REPORT_NO_DATA (HTTP 404) when no rows match (Excel not generated)', async () => {
      // COVERS: 4.3 — 対象データなしの場合はExcelを生成しない
      qbMock.getRawMany.mockResolvedValue([]);

      await expect(
        service.exportMeiboExcel(buildMeiboQuery(), jaSession(), req),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'REPORT_NO_DATA' }),
      });
      expect(reportArchive.archive).not.toHaveBeenCalled();
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
  let reportArchive: any;
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

  // 増減連絡票プレビューは SQLページング（購読者単位）：
  //   ① count(distinct dokusya_id) → getRawOne
  //   ② ページ対象の dokusya_id → getRawMany (1回目)
  //   ③ その購読者の明細行 → getRawMany (2回目)
  // テストでは「このページに載る全行」を渡せば、count/ids/rows をまとめて仕込む。
  const mockZougenPage = (rows: ReturnType<typeof buildZougenRawRow>[]): void => {
    const ids = [...new Set(rows.map((r) => Number(r.dokusya_id)))];
    qbMock.getRawOne.mockResolvedValue({ cnt: String(ids.length) });
    qbMock.getRawMany
      .mockReset()
      .mockResolvedValueOnce(ids.map((id) => ({ dokusya_id: id })))
      .mockResolvedValueOnce(rows);
  };

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn(),
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
    // logExport は実装と同じく logOperation へ委譲する（監査セマンティクス不変）。
    attachLogExport(auditLog);
    codeService = { has: jest.fn().mockReturnValue(true), getLabel: jest.fn().mockReturnValue('') };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };
    txManager = {
      create: jest.fn((_e: any, v: any) => ({ ...v })),
      save: jest.fn(async (_e: any, v: any) => ({ fileDownloadId: 7, ...(v ?? _e) })),
    };
    dataSource = { transaction: jest.fn(async (cb: any) => cb(txManager)) };
    pdfService = { generatePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test')) };
    reportArchive = {
      archive: jest
        .fn()
        .mockResolvedValue({ key: 'k', filename: 'f.pdf', fileDownloadId: 1 }),
      resolveJa: jest
        .fn()
        .mockResolvedValue({ code: 'JA001', name: 'テストJA' }),
    };

    // Facade wiring: SCR-028 export needs pdfService on the ZougenReportService.
    // dataSource is no longer used by either sub-service (kept in scope for the
    // tests that still reference it as a mock).
    void dataSource;
    const meibo = new MeiboReportService(
      rirekiRepo,
      auditLog,
      codeService,
      reportArchive,
    );
    const zougen = new ZougenReportService(
      rirekiRepo,
      auditLog,
      reportArchive,
      pdfService,
    );
    service = new ReportService(meibo, zougen);
  });

  afterEach(() => jest.restoreAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  // API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview
  // ═══════════════════════════════════════════════════════════════════
  describe('previewZougenHanbaiten', () => {
    it('should return reports grouped by 販売店+管理支店 with tekiyo echoed when data exists', async () => {
      // COVERS: 4.5 レスポンス生成 — reports[] (販売店コード昇順)
      mockZougenPage([buildZougenRawRow()]);

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
      mockZougenPage([
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

    it('should use 購読者(shimei / renrakusaki_1) for 配達先読者名・電話番号 when haitatsu_same_flg=true', async () => {
      // COVERS: 4.5 配達先読者名列/電話番号列 — haitatsu_same_flg=true → 購読者本人
      mockZougenPage([
        buildZougenRawRow({
          dokusya_busu: 3,
          zenkai_dokusya_busu: 1,
          haitatsu_same_flg: true,
          shimei_sei: '農業',
          shimei_mei: '太郎',
          renrakusaki_1: '03-1111-2222',
          // 配達先側は別値でも haitatsu_same_flg=true なら採用されない。
          haitatsu_shimei_sei: '配達',
          haitatsu_shimei_mei: '花子',
          haitatsu_renrakusaki_1: '099-888-7777',
        }),
      ]);

      const rpt = (
        await service.previewZougenHanbaiten(buildZougenQuery(), zSession())
      ).reports[0];
      expect(rpt.zoubu[0].delivery_name).toBe('農業 太郎');
      expect(rpt.zoubu[0].phone).toBe('03-1111-2222');
    });

    it('should use 配達先(haitatsu_shimei / haitatsu_renrakusaki_1) for 配達先読者名・電話番号 when haitatsu_same_flg=false', async () => {
      // COVERS: 4.5 配達先読者名列/電話番号列 — haitatsu_same_flg=false → 配達先
      mockZougenPage([
        buildZougenRawRow({
          dokusya_busu: 3,
          zenkai_dokusya_busu: 1,
          haitatsu_same_flg: false,
          shimei_sei: '農業',
          shimei_mei: '太郎',
          renrakusaki_1: '03-1111-2222',
          haitatsu_shimei_sei: '配達',
          haitatsu_shimei_mei: '花子',
          haitatsu_renrakusaki_1: '099-888-7777',
        }),
      ]);

      const rpt = (
        await service.previewZougenHanbaiten(buildZougenQuery(), zSession())
      ).reports[0];
      // 氏名列は常に購読者本人、配達先読者名列は配達先氏名。
      expect(rpt.zoubu[0].name).toBe('農業 太郎');
      expect(rpt.zoubu[0].delivery_name).toBe('配達 花子');
      expect(rpt.zoubu[0].phone).toBe('099-888-7777');
    });

    it('should classify a record into genbu when dokusya_busu < zenkai_dokusya_busu', async () => {
      // COVERS: 4.5 減部
      mockZougenPage([
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
      mockZougenPage([
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

    it('should NOT list electronic subscribers (電子版=2) in address_change even if the address changed', async () => {
      // COVERS: 電子版は配達先住所を持たないため、住所が変わっても住所変更
      // セクションには載せない（増部/減部の判定には影響しない）。
      mockZougenPage([
        buildZougenRawRow({
          dokusya_shubetsu: 2, // 電子版
          dokusya_busu: 2,
          zenkai_dokusya_busu: 2, // 部数同じ → 増減ではない
          zen_todofuken_name: '東京都',
          zenkai_shikuchoson: '中央区',
          zenkai_chome_banchi: '銀座3-3-3',
          zenkai_tatemono_mei: '',
        }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const total = result.reports.reduce((n, r) => n + r.address_change.length, 0);
      expect(total).toBe(0);
    });

    it('should still count electronic subscribers (電子版=2) in zoubu when 部数 increases', async () => {
      // 住所変更のみ除外。部数増減は電子版でも従来どおり計上する。
      mockZougenPage([
        buildZougenRawRow({
          dokusya_shubetsu: 2,
          dokusya_busu: 3,
          zenkai_dokusya_busu: 1,
        }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const zoubuTotal = result.reports.reduce((n, r) => n + r.zoubu.length, 0);
      expect(zoubuTotal).toBe(1);
    });

    it('累計: 同一購読者の同日複数履歴 (1→3→5) を 1→5 の1件に集約する', async () => {
      mockZougenPage([
        buildZougenRawRow({ dokusya_id: 9001, dokusya_busu: 3, zenkai_dokusya_busu: 1 }),
        buildZougenRawRow({ dokusya_id: 9001, dokusya_busu: 5, zenkai_dokusya_busu: 3 }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const rpt = result.reports[0];
      expect(rpt.zoubu).toHaveLength(1); // 2件ではなく累計1件
      expect(rpt.genbu).toHaveLength(0);
      expect(rpt.zoubu[0].busu).toBe('1 → 5'); // 日初(前回1) → 日末(現5)
    });

    it('解約: …→0 を減として反映する', async () => {
      mockZougenPage([
        buildZougenRawRow({ dokusya_id: 9002, dokusya_busu: 0, zenkai_dokusya_busu: 2 }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const rpt = result.reports[0];
      expect(rpt.genbu).toHaveLength(1);
      expect(rpt.genbu[0].busu).toBe('2 → 0');
    });

    it('販売店変更: 旧店に減 / 新店に増 を反映する', async () => {
      mockZougenPage([
        buildZougenRawRow({
          dokusya_id: 9003,
          dokusya_busu: 1,
          zenkai_dokusya_busu: 1, // 部数は不変
          hanbaiten_id: 300,
          hanbaiten_code: 'H002',
          hanbaiten_name: '新販売店',
          zenkai_hanbaiten_id: 200,
          zenkai_hanbaiten_code: 'H001',
          zenkai_hanbaiten_name: '旧販売店',
        }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const oldStore = result.reports.find((r) => r.hanbaiten_code === 'H001');
      const newStore = result.reports.find((r) => r.hanbaiten_code === 'H002');
      expect(oldStore?.genbu).toHaveLength(1);
      expect(oldStore?.genbu[0].busu).toBe('1 → 0'); // 旧店: 減 1
      expect(newStore?.zoubu).toHaveLength(1);
      expect(newStore?.zoubu[0].busu).toBe('0 → 1'); // 新店: 増 1
    });

    it('新規: 前回住所が空のときは住所変更を出さない (ノイズ防止)', async () => {
      mockZougenPage([
        buildZougenRawRow({
          dokusya_id: 9004,
          dokusya_busu: 1,
          zenkai_dokusya_busu: 0,
          zenkai_hanbaiten_id: null, // 初回履歴
          zen_todofuken_name: null,
          zenkai_shikuchoson: null,
          zenkai_chome_banchi: null,
          zenkai_tatemono_mei: null,
        }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const rpt = result.reports[0];
      expect(rpt.zoubu).toHaveLength(1); // 0→1 = 増
      expect(rpt.zoubu[0].busu).toBe('0 → 1');
      expect(rpt.address_change).toHaveLength(0); // 前回住所空 → 出さない
    });

    it('新規(CREATE, zenkai_dokusya_busu=null): 前回部数を0扱いで増部に出す (顧客確認)', async () => {
      // zenkai_* が NULL の CREATE 行でも、前回部数は 0 として 0→現部数 の増部に
      // 出す（rmin の現部数へフォールバックすると新規が増部から消えるため不可）。
      mockZougenPage([
        buildZougenRawRow({
          dokusya_id: 9005,
          dokusya_busu: 3,
          zenkai_dokusya_busu: null, // CREATE: 前回部数なし
          zenkai_hanbaiten_id: null,
          zenkai_yubin_no: null,
          zenkai_todofuken_code: null,
          zen_todofuken_name: null,
          zenkai_shikuchoson: null,
          zenkai_chome_banchi: null,
          zenkai_tatemono_mei: null,
        }),
      ]);

      const result = await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const rpt = result.reports[0];
      expect(rpt.zoubu).toHaveLength(1); // 0→3 = 増（新規は増部に出す）
      expect(rpt.zoubu[0].busu).toBe('0 → 3');
      // zenkai null → fallback で前回住所 = 現住所 → 住所変更なし。
      expect(rpt.address_change).toHaveLength(0);
    });

    it('ページ送り: SQL OFFSET/LIMIT で購読者単位に分割 (per_page=15, 全20件→2ページ)', async () => {
      // 全20購読者(全て増, 同一販売店)。SQL は count(distinct) + dokusya_id の
      // OFFSET/LIMIT で1ページ分の購読者だけをロードする（メモリ内ではない）。
      const page1Rows = Array.from({ length: 15 }, (_, i) =>
        buildZougenRawRow({ dokusya_id: 9300 + i, dokusya_busu: 3, zenkai_dokusya_busu: 1 }),
      );
      // page1: count=20 → ページIDクエリ(15) → 明細行(15)
      qbMock.getRawOne.mockResolvedValue({ cnt: '20' });
      qbMock.getRawMany
        .mockReset()
        .mockResolvedValueOnce(page1Rows.map((r) => ({ dokusya_id: r.dokusya_id })))
        .mockResolvedValueOnce(page1Rows);

      const p1 = await service.previewZougenHanbaiten(
        buildZougenQuery({ page: 1, per_page: 15 }),
        zSession(),
      );
      expect(p1.total_rows).toBe(20); // 購読者数
      expect(p1.total_pages).toBe(2);
      expect(p1.page_no).toBe(1);
      expect(p1.is_last_page).toBe(false);
      expect(p1.reports[0].zoubu).toHaveLength(15); // 1ページ目=15購読者
      // SQL の OFFSET/LIMIT がページIDクエリに渡ること（メモリ内スライスではない）。
      expect(qbMock.offset).toHaveBeenCalledWith(0);
      expect(qbMock.limit).toHaveBeenCalledWith(15);

      // page2: count=20 → ページIDクエリ(残り5) → 明細行(5)
      const page2Rows = Array.from({ length: 5 }, (_, i) =>
        buildZougenRawRow({ dokusya_id: 9400 + i, dokusya_busu: 3, zenkai_dokusya_busu: 1 }),
      );
      qbMock.getRawOne.mockResolvedValue({ cnt: '20' });
      qbMock.getRawMany
        .mockReset()
        .mockResolvedValueOnce(page2Rows.map((r) => ({ dokusya_id: r.dokusya_id })))
        .mockResolvedValueOnce(page2Rows);

      const p2 = await service.previewZougenHanbaiten(
        buildZougenQuery({ page: 2, per_page: 15 }),
        zSession(),
      );
      expect(p2.page_no).toBe(2);
      expect(p2.is_last_page).toBe(true);
      expect(p2.reports[0].zoubu).toHaveLength(5); // 2ページ目=残り5購読者
      expect(qbMock.offset).toHaveBeenCalledWith(15); // OFFSET = (2-1)*15
    });

    it('should bind the joho_henko_tekiyo_date = tekiyo_date predicate', async () => {
      // COVERS: 4.3 適用日と一致
      mockZougenPage([buildZougenRawRow()]);
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
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /zougen_hokoku_flg/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should count only 承認済 electronic subscribers (電子版=2 → denshi_shonin_status=1)', async () => {
      // COVERS: 電子版(DokusyaShubetsu.DIGITAL=2)は承認済(1)のみ集計対象。
      // 承認待ち(0)/否認(2)の電子版は増減連絡票から除外する。
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /dokusya_shubetsu\s*<>/.test(sql) &&
          /denshi_shonin_status\s*=/.test(sql),
      );
      expect(call).toBeDefined();
      expect(call[1]).toMatchObject({ denshiShubetsu: 2, denshiApproved: 1 });
    });

    it('should exclude 廃店 (haiten_flg = false) on the m_hanbaiten join', async () => {
      // COVERS: 4.3 廃店・電子版ダミー販売店を除外
      mockZougenPage([buildZougenRawRow()]);
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
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery({ hanbaiten_id: [200, 201] }), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /hanbaiten_id/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should bind kanri_shiten_id IN filter when kanri_shiten_id is provided', async () => {
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery({ kanri_shiten_id: [20, 21] }), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_shiten_id/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should bind ja_id scope predicate when session role_code is CHUOKAI', async () => {
      // COVERS: 4.2 DataScope — CHUOKAI/JA_HONTEN: ja_id
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession({ ja_id: 7 }));

      const scoped = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scoped).toBeDefined();
    });

    it('should bind kanri_shiten_id scope predicate when session role_code is JA_KANRI_SHITEN', async () => {
      mockZougenPage([buildZougenRawRow()]);
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
      mockZougenPage([]);

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
    it('should return a PDF buffer + role-aware filename (CHUOKAI → no ja_name) when data exists', async () => {
      // COVERS: ファイル名 (CHUOKAI/JA_HONTEN) = 増減連絡票_{ja_code}_{YYYY年MM月DD日}.pdf
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);

      const result = await service.exportZougenHanbaitenPdf(
        buildZougenQuery({ tekiyo_date: '2026-05-01' }),
        zSession(),
        req,
      );

      expect(result).toEqual(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          filename: '増減連絡票_JA001_2026年05月01日.pdf',
        }),
      );
      expect(pdfService.generatePdf).toHaveBeenCalledTimes(1);
    });

    it('should include ja_name in the filename when the role is JA_KANRI_SHITEN', async () => {
      // COVERS: ファイル名 (JA_KANRI_SHITEN) = 増減連絡票_{ja_code}_{ja_name}_{YYYY年MM月DD日}.pdf
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);

      const result = await service.exportZougenHanbaitenPdf(
        buildZougenQuery({ tekiyo_date: '2026-05-01' }),
        buildJaKanriShitenSession({
          ja_id: 1,
          permissions: ['report.export_zougen_hanbaiten'],
        }),
        req,
      );

      expect(result).toMatchObject({
        filename: '増減連絡票_JA001_テストJA_2026年05月01日.pdf',
      });
    });

    it('should archive the PDF via FileArchiveService (category=zougen-hanbaiten, subFolder-less path, year from tekiyo_date)', async () => {
      // COVERS: 共通 S3 アーカイブ + t_file_download。subFolder なし・年=適用日年。
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.exportZougenHanbaitenPdf(
        buildZougenQuery({ tekiyo_date: '2026-05-01' }),
        zSession(),
        req,
      );

      expect(reportArchive.archive).toHaveBeenCalledTimes(1);
      const arg = reportArchive.archive.mock.calls[0][0];
      expect(arg).toEqual(
        expect.objectContaining({
          category: 'zougen-hanbaiten',
          year: '2026',
          jaCode: 'JA001',
          baseName: '増減連絡票_JA001_2026年05月01日',
          contentType: 'application/pdf',
          extension: '.pdf',
          recordCount: 1,
        }),
      );
      // subFolder は付けない（meibo と異なる）。
      expect(arg.subFolder).toBeUndefined();
      // 旧 S3 直 upload / t_file_download 保存は行わない。
      expect(storage.upload).not.toHaveBeenCalled();
      expect(fileDownloadRepo.save).not.toHaveBeenCalled();
    });

    it('should write an operation log with EXPORT_PDF + result_status success + targetTable t_file_download', async () => {
      // COVERS: 操作ログ — operation 'EXPORT_PDF' / target = t_file_download
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
      // 単一 t_file_download なので原子化すべき DML が無く、トランザクションは使わない。
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should record the archived t_file_download id as the audit targetId', async () => {
      reportArchive.archive.mockResolvedValueOnce({
        key: 'k',
        filename: 'f.pdf',
        fileDownloadId: 55,
      });
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req);

      const args = auditLog.logOperation.mock.calls[0][0];
      expect(args.targetId).toBe(55);
    });

    it('should NOT log personal data (氏名/住所) in the operation log after_value', async () => {
      // COVERS: 個人情報は含めない
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);
      await service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req);

      const args = auditLog.logOperation.mock.calls[0][0];
      const after = String(args.afterValue ?? '');
      expect(after).not.toContain('農業');
      expect(after).not.toContain('神田');
    });

    it('should emit an error log (log_type=3) when export fails', async () => {
      // COVERS: エラーログ
      qbMock.getRawMany.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportZougenHanbaitenPdf(buildZougenQuery(), zSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should return { empty: true } and NOT generate a PDF when no record matches', async () => {
      // COVERS: 0件 → HTTP 200 + 空配列, ファイル生成しない
      qbMock.getRawMany.mockResolvedValue([]);

      const result = await service.exportZougenHanbaitenPdf(
        buildZougenQuery(),
        zSession(),
        req,
      );
      expect(result).toEqual({ empty: true });
      expect(pdfService.generatePdf).not.toHaveBeenCalled();
      expect(reportArchive.archive).not.toHaveBeenCalled();
      // 0件はアーカイブ・操作ログも残さない。
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });

  });
});

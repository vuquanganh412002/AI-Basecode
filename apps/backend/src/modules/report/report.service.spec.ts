// Screen: ACSMS-SCR-026 — 購読者名簿出力画面 + ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
//
// ReportService unit specs for:
//   - previewMeibo(query, session)              — ACSMS-API-026-001 (GET preview)
//   - exportMeiboExcel(query, session, req)     — ACSMS-API-026-002 (GET Excel export)
//   - previewZougenHanbaiten(query, session)    — ACSMS-API-028-001 (GET preview)
//   - exportZougenHanbaitenPdf(body, session, req) — ACSMS-API-028-002 (POST PDF export)
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
  // ACSMS-API-026-001 — GET /api/v1/report/meibo/preview
  // ═══════════════════════════════════════════════════════════════════
  // 動的ページング（顧客要件 2026-07）: previewMeibo は fetchRows で全件を1回
  // getRawMany し、mapper の buildMeiboDocPages で A4 高さ基準に文書ページ化する。
  // よってモックは全件を返す単一の getRawMany で足りる（stats/2クエリは廃止）。
  function mockMeiboPreview(allRows: any[]): void {
    qbMock.getRawMany.mockReset();
    qbMock.getRawMany.mockResolvedValue(allRows);
  }

  describe('previewMeibo', () => {
    it('should exclude 論理削除済み purchasers by joining t_dokusya with deleted_at IS NULL (regression)', async () => {
      // Regression: meiboBaseQuery previously only read t_dokusya_rireki and never
      // checked whether the underlying t_dokusya row had been soft-deleted via
      // DokusyaService.remove() (task check #57608-follow-up). A subscriber with
      // an active rireki row could still be soft-deleted (RELATED_TABLES only
      // blocks on t_koza_furikae) and would still leak into the 購読者名簿.
      mockMeiboPreview([buildMeiboRawRow()]);
      await service.previewMeibo(buildMeiboQuery(), jaSession());

      const dokusyaJoinBound = qbMock.innerJoin.mock.calls.some(
        ([table, , cond]: any[]) =>
          table === 't_dokusya' &&
          typeof cond === 'string' &&
          /deleted_at\s+IS\s+NULL/i.test(cond),
      );
      expect(dokusyaJoinBound).toBe(true);
    });

    it('should return a 販売店別 grouped structure when report_type is hanbaiten', async () => {
      // COVERS: 4.5 レスポンス生成 — 販売店 → 管理支店 → 購読者 のネスト
      mockMeiboPreview([
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
      mockMeiboPreview([
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
      mockMeiboPreview([
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
      mockMeiboPreview([
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
      mockMeiboPreview([buildMeiboRawRow()]);

      const result = await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      const addr = result.kanri_shiten_groups[0].rows[0].haitatsu_address;
      expect(addr).toContain('〒1000001');
      expect(addr).toContain('東京都千代田区');
      expect(addr).toContain('サンプルビル101');
    });

    it('should map haitatsu_renrakusaki_1 to the haitatsu_tel output field', async () => {
      mockMeiboPreview([
        buildMeiboRawRow({ haitatsu_renrakusaki_1: '03-1234-5678' }),
      ]);

      const result = await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      expect(result.kanri_shiten_groups[0].rows[0].haitatsu_tel).toBe('03-1234-5678');
    });

    it('should fall back to 購読者本人の住所・連絡先 when haitatsu_same_flg=true (haitatsu_* are blank)', async () => {
      // Regression: same_flg=TRUE のとき haitatsu_* は空欄で保存されるため、
      // 配達先住所/電話番号は購読者本人の住所・連絡先から取得する。
      mockMeiboPreview([
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
      mockMeiboPreview([
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

    // 全ページを順に取得して連結（動的ページングの不変条件検証に使う）。
    // getRawMany は毎回同じ全件を返すモックなので何度呼んでも安全。
    async function collectAllPages(query: any): Promise<any[]> {
      const first = await service.previewMeibo({ ...query, page: 1 }, jaSession());
      const pages = [first];
      for (let p = 2; p <= (first.total_pages ?? 1); p++) {
        pages.push(
          await service.previewMeibo({ ...query, page: p }, jaSession()),
        );
      }
      return pages;
    }

    it('全件を1クエリで取得し SQL OFFSET/LIMIT を使わず A4 高さで改ページする（動的ページング 2026-07）', async () => {
      // 管理支店10 に 30件。行の高さを積算して A4 1ページ分ずつに割る（固定行数ではない）。
      mockMeiboPreview(
        Array.from({ length: 30 }, (_, i) =>
          buildMeiboRawRow({ kanri_shiten_id: 10, dokusya_busu: 1, dokusya_id: 500 + i }),
        ),
      );

      const pages = await collectAllPages(buildKanriShitenMeiboQuery());

      // SQL ページングは廃止（全件を1回で取得）。
      expect(qbMock.offset).not.toHaveBeenCalled();
      expect(qbMock.limit).not.toHaveBeenCalled();
      // 30件は1ページに収まらない（高さ基準で複数ページ）。
      expect(pages[0].total_pages).toBeGreaterThan(1);
      expect(pages[0].total_rows).toBe(30);
      expect(pages[0].grand_total_busu).toBe(30);
      // 全ページの明細を連結すると 30件（過不足なし・グループを跨がない）。
      const allRows = pages.flatMap((p) => p.kanri_shiten_groups[0].rows);
      expect(allRows).toHaveLength(30);
      // 先頭ページは継続でない、以降のページは継続。
      expect(pages[0].kanri_shiten_groups[0].is_continued).toBe(false);
      expect(pages[1].kanri_shiten_groups[0].is_continued).toBe(true);
      // 小計はグループ最終ページのみ。
      expect(pages[pages.length - 1].kanri_shiten_groups[0].show_subtotal).toBe(true);
      expect(pages[0].kanri_shiten_groups[0].show_subtotal).toBe(false);
      // 小計値は部分ページでも常にグループ全体の合計。
      expect(pages[0].kanri_shiten_groups[0].subtotal_busu).toBe(30);
    });

    it('group-based: 各販売店は独立A4ページ（グループを跨がず、大きいグループのみ複数ページ）', async () => {
      // 3販売店 A=2件 / B=20件 / C=1件。B は1ページに収まらず複数ページに分かれるが、
      // A・C とは決して同居しない。
      mockMeiboPreview([
        ...Array.from({ length: 2 }, () => buildMeiboRawRow({ hanbaiten_id: 1, dokusya_busu: 1 })),
        ...Array.from({ length: 20 }, () => buildMeiboRawRow({ hanbaiten_id: 2, dokusya_busu: 1 })),
        buildMeiboRawRow({ hanbaiten_id: 3, dokusya_busu: 1 }),
      ]);

      const pages = await collectAllPages(buildMeiboQuery());

      expect(pages[0].total_rows).toBe(23);
      expect(qbMock.offset).not.toHaveBeenCalled();
      // どのページも販売店グループは1つだけ（他店と混ざらない）。
      for (const pg of pages) expect(pg.hanbaiten_groups).toHaveLength(1);
      // グループ id ごとのページ集合。
      const idOf = (pg: any) => pg.hanbaiten_groups[0].hanbaiten_id;
      const pagesOfB = pages.filter((pg) => idOf(pg) === 2);
      expect(pages.filter((pg) => idOf(pg) === 1)).toHaveLength(1); // A: 1ページ
      expect(pagesOfB.length).toBeGreaterThan(1); // B: 複数ページ
      expect(pages.filter((pg) => idOf(pg) === 3)).toHaveLength(1); // C: 1ページ
      // グループ id は昇順に連続（ページ順で 1..,2..,3..）。
      const ids = pages.map(idOf);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
      // B の各ページを連結すると 20件、ヘッダのページ数は B 内で 1..N。
      expect(pagesOfB.flatMap((pg) => pg.hanbaiten_groups[0].kanri_shiten_groups.flatMap((s: any) => s.rows))).toHaveLength(20);
      expect(pagesOfB.map((pg) => pg.group_page_no)).toEqual(
        pagesOfB.map((_, i) => i + 1),
      );
      expect(new Set(pagesOfB.map((pg) => pg.group_total_pages))).toEqual(
        new Set([pagesOfB.length]),
      );
    });

    it('group-based: 小計は各グループ最終ページに出す・group_count は全体グループ数', async () => {
      // 2販売店(A=3部, B=4部) → 各1ページ・計2ページ。
      mockMeiboPreview([
        buildMeiboRawRow({ hanbaiten_id: 1, dokusya_busu: 3 }),
        buildMeiboRawRow({ hanbaiten_id: 2, dokusya_busu: 4 }),
      ]);

      const pages = await collectAllPages(buildMeiboQuery());

      expect(pages[0].total_pages).toBe(2);
      expect(pages[0].group_count).toBe(2); // 全体の販売店数
      expect(pages[pages.length - 1].is_last_page).toBe(true);
      expect(pages[0].grand_total_busu).toBe(7);
      // 各グループ単一ページ → いずれも小計表示（show_total）。
      for (const pg of pages) {
        expect(pg.hanbaiten_groups[0].show_total).toBe(true);
      }
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
          typeof sql === 'string' && /denshi_shonin_status\s*=/.test(sql),
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

    // 顧客要件 2026-08 — 解約予約(Phase 1)行は到来日バッチが確定するまで
    // 手続種類=新規・部数=0 のまま残るため、手続種類だけでは除外できず名簿に
    // 「0部の有効な読者」として出てしまっていた。部数でも判断する。
    it('should restrict to dokusya_busu > 0 (解約予約中の0部行を除外)', async () => {
      await service.previewMeibo(buildKanriShitenMeiboQuery(), jaSession());

      const busuFilter = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /dokusya_busu\s*>\s*0/.test(sql),
      );
      expect(busuFilter).toBeDefined();
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

    // ─── 支店フィルタ（顧客要件2026-08・管理支店別のみ・任意）──────────────
    const shitenWhere = () =>
      qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /r\.shiten_id IN/.test(sql),
      );

    it('should bind r.shiten_id IN when shiten_ids is provided on report_type=kanri_shiten', async () => {
      await service.previewMeibo(
        buildKanriShitenMeiboQuery({ kanri_shiten_ids: [10], shiten_ids: [21, 22] }),
        jaSession(),
      );
      const call = shitenWhere();
      expect(call).toBeDefined();
      expect(call[1]).toEqual({ shiten_ids: [21, 22] });
    });

    /**
     * 支店は任意（顧客要件 2026-08 改訂）。必須にしていた時期があるが、それだと
     * shiten_id が NULL の購読者（電子版連携は常に NULL・紙版も登録時は任意）が
     * どう操作しても名簿に出せなくなるため戻した。未選択＝絞り込まない。
     */
    it.each([[undefined], [[]]])(
      'should NOT filter by shiten and include shiten_id NULL rows when shiten_ids is %p',
      async (shitenIds) => {
        await service.previewMeibo(
          buildKanriShitenMeiboQuery({
            kanri_shiten_ids: [10],
            shiten_ids: shitenIds,
          }),
          jaSession(),
        );

        // `r.kanri_shiten_id IN` も部分文字列として 'shiten_id IN' を含むので
        // 支店の条件は必ず `r.shiten_id IN` で判定する。
        const wheres = qbMock.andWhere.mock.calls.map((c: any[]) => String(c[0]));
        expect(wheres.some((w: string) => w.includes('r.shiten_id IN'))).toBe(
          false,
        );
      },
    );

    it('should restrict 販売店別 to 紙版 only (顧客要件 2026-08)', async () => {
      // 販売店別名簿は併読・電子版（有料/無料とも）を集計対象にしない。ダミー販売店に
      // 紐づく電子版読者が混ざらないよう、種別で明示的に閉じる。
      await service.previewMeibo(
        buildMeiboQuery({ hanbaiten_ids: [1] }),
        jaSession(),
      );

      const wheres = qbMock.andWhere.mock.calls.map((c: any[]) => String(c[0]));
      const params = qbMock.andWhere.mock.calls.map((c: any[]) => c[1]);
      const idx = wheres.findIndex((w: string) =>
        w.includes('r.dokusya_shubetsu = :paperShubetsu'),
      );
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(params[idx]).toMatchObject({ paperShubetsu: 1 });
      // 併読除外・電子版承認済の条件は 販売店別 では使わない（種別=紙版で足りる）。
      expect(wheres.some((w: string) => w.includes(':heiyo'))).toBe(false);
      expect(wheres.some((w: string) => w.includes(':denshiApproved'))).toBe(false);
    });

    it('should aggregate 紙版 + 併読(有料) + 電子版(有料・承認済) for 管理支店別 (顧客要件 2026-08)', async () => {
      await service.previewMeibo(
        buildKanriShitenMeiboQuery({ kanri_shiten_ids: [10] }),
        jaSession(),
      );

      const call = qbMock.andWhere.mock.calls.find((c: any[]) =>
        String(c[0]).includes('heiyoShubetsu'),
      );
      expect(call).toBeDefined();
      const [sql, params] = call as [string, Record<string, unknown>];
      // 紙版(1) は無条件。併読(3)・電子版(2) は有料(1)のみ。
      expect(params.paperShubetsu).toBe(1);
      expect(params.heiyoShubetsu).toBe(3);
      expect(params.denshiShubetsu).toBe(2);
      expect(params.denshiYuryo).toBe(1);
      // 電子版だけ承認済も条件に入る（併読には課さない）。
      expect(params.denshiApproved).toBe(1);
      expect(sql).toContain('r.denshi_shonin_status = :denshiApproved');
      // 紙版は無条件（他の2種別と OR で並ぶ1つ目の枝）。
      expect(sql).toContain('r.dokusya_shubetsu = :paperShubetsu');
    });

    it('should exclude 無料 for both 併読 and 電子版 in 管理支店別', async () => {
      // 無料(denshi_dokusya_shubetsu=0)は種別を問わず集計対象外。有料の等値条件に
      // なっていることで担保する（`<> 0` だと NULL も通ってしまう）。
      await service.previewMeibo(
        buildKanriShitenMeiboQuery({ kanri_shiten_ids: [10] }),
        jaSession(),
      );

      const sql = String(
        qbMock.andWhere.mock.calls.find((c: any[]) =>
          String(c[0]).includes('heiyoShubetsu'),
        )?.[0],
      );
      const yuryoConditions = sql.match(/denshi_dokusya_shubetsu = :denshiYuryo/g);
      expect(yuryoConditions).toHaveLength(2); // 併読・電子版の2箇所
      expect(sql).not.toContain('IS NULL');
    });

    it('should filter by shiten_id when shiten_ids is given', async () => {
      await service.previewMeibo(
        buildKanriShitenMeiboQuery({
          kanri_shiten_ids: [10],
          shiten_ids: [21, 22],
        }),
        jaSession(),
      );

      const call = qbMock.andWhere.mock.calls.find((c: any[]) =>
        String(c[0]).includes('r.shiten_id IN'),
      );
      expect(call).toBeDefined();
      expect(call?.[1]).toMatchObject({ shiten_ids: [21, 22] });
    });

    it('should ignore shiten_ids on report_type=hanbaiten (帳票に支店列が無い)', async () => {
      await service.previewMeibo(
        buildMeiboQuery({ hanbaiten_ids: [1], shiten_ids: [21] }),
        jaSession(),
      );
      expect(shitenWhere()).toBeUndefined();
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
  // ACSMS-API-026-002 — GET /api/v1/report/meibo/export (Excel)
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

    it('auto-fits detail row height so multi-line text is not clipped (顧客要件 2026-07)', async () => {
      // 折返しの多い長い住所を持つ明細 → 行高が内容に合わせて拡張される（切れない）。
      qbMock.getRawMany.mockResolvedValue([
        buildMeiboRawRow({
          hanbaiten_id: 1,
          kanri_shiten_id: 10,
          haitatsu_same_flg: false,
          haitatsu_yubin_no: '2222222',
          haitatsu_shikuchoson: '神奈川県横浜市港北区新横浜',
          haitatsu_chome_banchi: '一丁目二番三号',
          haitatsu_tatemono_mei: 'サンプルタワーマンション1508号室ずっと長い建物名',
        }),
      ]);

      const result = await service.exportMeiboExcel(buildMeiboQuery(), jaSession(), req);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(result.buffer as never);
      const ws = wb.worksheets[0];

      // 明細行（チェックボックス列に □ を持つ行）の高さを取得。
      let detailHeight = 0;
      ws.eachRow((r) => {
        if (r.getCell(1).value === '□') detailHeight = Number(r.height ?? 0);
      });
      // 高さが計算・設定され、住所の折返し分だけチェックボックス最低(44)より高い。
      expect(detailHeight).toBeGreaterThan(44);
    });

    it('repeats the report header per document page with distinct ページ数 k/M in cells', async () => {
      // 35件（単一販売店）→ A4 高さ基準で複数ページに分割（各ページにヘッダ+ページ数）。
      // 動的ページングなので総ページ数 M は行の高さで決まる（固定行数ではない）。
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
      // ページ数セルから総ページ数 M と採番 1..M を抽出（merge セルで重複計上あり）。
      const pageNos = [...joined.matchAll(/ページ数：(\d+)\/(\d+)/g)];
      expect(pageNos.length).toBeGreaterThan(0);
      const totals = new Set(pageNos.map((m) => m[2]));
      expect(totals.size).toBe(1); // 全ページで M が一致
      const M = Number([...totals][0]);
      expect(M).toBeGreaterThan(1); // 35件は1ページに収まらない
      // 採番 1..M が全て出現する（各ページにヘッダ+ページ数が入る）。
      const seen = new Set(pageNos.map((m) => Number(m[1])));
      for (let k = 1; k <= M; k++) expect(seen.has(k)).toBe(true);
      // ヘッダが各ページに繰り返される（タイトルが M ページ分。merge で複数計上）。
      expect(texts.filter((t) => t === '販売店別購読者名簿').length).toBeGreaterThanOrEqual(M);
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

  // 増減連絡票プレビューはグループ単位ページング（販売店+管理支店 combo ごとに独立
  // ページ・顧客要件 2026-07・ACSMS-SCR-026/029 と同方針）：全件を1回 getRawMany で取得し、
  // mapper の paginateZougenSubscribers で combo ページに分割する。よってモックは全件を
  // 返す単一の getRawMany で足りる（count/ids の2クエリは廃止）。
  const mockZougenPage = (rows: ReturnType<typeof buildZougenRawRow>[]): void => {
    qbMock.getRawMany.mockReset();
    qbMock.getRawMany.mockResolvedValue(rows);
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

    // Facade wiring: ACSMS-SCR-028 export needs pdfService on the ZougenReportService.
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
  // ACSMS-API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview
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

    it('販売店変更: フィルタなしなら旧店に減 / 新店に増を両方反映する', async () => {
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

      // 旧店(H001)と新店(H002)は別 combo → 別ページ（顧客要件 2026-07）。
      // hanbaiten_id 未指定＝フィルタなしなので両方出る。両ページを集約。
      const p1 = await service.previewZougenHanbaiten(
        buildZougenQuery({ hanbaiten_id: undefined, page: 1 }),
        zSession(),
      );
      const p2 = await service.previewZougenHanbaiten(
        buildZougenQuery({ hanbaiten_id: undefined, page: 2 }),
        zSession(),
      );
      expect(p1.total_pages).toBe(2);
      const all = [...p1.reports, ...p2.reports];
      const oldStore = all.find((r) => r.hanbaiten_code === 'H001');
      const newStore = all.find((r) => r.hanbaiten_code === 'H002');
      expect(oldStore?.genbu).toHaveLength(1);
      expect(oldStore?.genbu[0].busu).toBe('1 → 0'); // 旧店: 減 1
      expect(newStore?.zoubu).toHaveLength(1);
      expect(newStore?.zoubu[0].busu).toBe('0 → 1'); // 新店: 増 1
    });

    // 顧客要件2026-08: 販売店変更のとき、フィルタで選んだ店舗の分類結果だけを
    // 表示する（旧店を選べば減のみ、新店を選べば増のみ）。行取得(EXISTS)は同日の
    // 関連行を広く取るが、出力(groupZougenReports の hanbaitenFilter)で選択店舗
    // 以外を落とす。以前は「転出先/転出元」を常に両方見せていたが、
    // 「選んだ店の分だけ見たい」という要望に合わせて変更した。
    it('販売店変更: 旧店でフィルタすると減のみ・新店は出ない', async () => {
      mockZougenPage([
        buildZougenRawRow({
          dokusya_id: 9003,
          dokusya_busu: 1,
          zenkai_dokusya_busu: 1,
          hanbaiten_id: 300,
          hanbaiten_code: 'H002',
          hanbaiten_name: '新販売店',
          zenkai_hanbaiten_id: 200,
          zenkai_hanbaiten_code: 'H001',
          zenkai_hanbaiten_name: '旧販売店',
        }),
      ]);

      const result = await service.previewZougenHanbaiten(
        buildZougenQuery({ hanbaiten_id: [200] }),
        zSession(),
      );

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].hanbaiten_code).toBe('H001');
      expect(result.reports[0].genbu).toHaveLength(1);
      expect(result.reports[0].genbu[0].busu).toBe('1 → 0');
      expect(result.reports[0].zoubu).toHaveLength(0);
    });

    it('販売店変更: 新店でフィルタすると増のみ・旧店は出ない', async () => {
      mockZougenPage([
        buildZougenRawRow({
          dokusya_id: 9003,
          dokusya_busu: 1,
          zenkai_dokusya_busu: 1,
          hanbaiten_id: 300,
          hanbaiten_code: 'H002',
          hanbaiten_name: '新販売店',
          zenkai_hanbaiten_id: 200,
          zenkai_hanbaiten_code: 'H001',
          zenkai_hanbaiten_name: '旧販売店',
        }),
      ]);

      const result = await service.previewZougenHanbaiten(
        buildZougenQuery({ hanbaiten_id: [300] }),
        zSession(),
      );

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].hanbaiten_code).toBe('H002');
      expect(result.reports[0].zoubu).toHaveLength(1);
      expect(result.reports[0].zoubu[0].busu).toBe('0 → 1');
      expect(result.reports[0].genbu).toHaveLength(0);
    });

    // 顧客報告の再現テスト（2026-08）: 同一購読者が同日に「72→73へ販売店変更」
    // した後、同日中にさらに部数だけ 5→8 と変わった場合（2行の同日履歴）。
    // 行取得(EXISTS)が同日の両行を確実に含めることを前提に、日初(rmin=旧店への
    // 変更直後・busu 5)→日末(rmax=部数8)の正しい net が、72で絞っても73で絞っても
    // 同じ値で出ること（絞り方によって数字が食い違わない）を確認する。
    it('同日2履歴（店舗変更+部数変更）: 72/73どちらでフィルタしても集計値が一致する', async () => {
      const rowA = buildZougenRawRow({
        dokusya_id: 9010,
        dokusya_busu: 5,
        zenkai_dokusya_busu: 5, // このコマでは部数不変（店舗のみ変更）
        hanbaiten_id: 73,
        hanbaiten_code: 'H073',
        hanbaiten_name: '販売店73',
        zenkai_hanbaiten_id: 72,
        zenkai_hanbaiten_code: 'H072',
        zenkai_hanbaiten_name: '販売店72',
      });
      const rowB = buildZougenRawRow({
        dokusya_id: 9010, // 同一購読者・同日の2件目（rows は dokusya_id, rireki_no 昇順）
        dokusya_busu: 8,
        zenkai_dokusya_busu: 5, // rowA の busu を引き継ぐ
        hanbaiten_id: 73, // 店舗は rowA で変更済みのまま
        hanbaiten_code: 'H073',
        hanbaiten_name: '販売店73',
        zenkai_hanbaiten_id: 73, // rowA の hanbaiten を引き継ぐ（店舗変更なし）
        zenkai_hanbaiten_code: 'H073',
        zenkai_hanbaiten_name: '販売店73',
      });

      // 72(旧店)でフィルタ → 72 の genbu だけ。busuBefore は rowA の zenkai(5)由来で
      // 正しいまま。73 の zoubu は表示されない。
      mockZougenPage([rowA, rowB]);
      const filtered72 = await service.previewZougenHanbaiten(
        buildZougenQuery({ hanbaiten_id: [72] }),
        zSession(),
      );
      expect(filtered72.reports).toHaveLength(1);
      expect(filtered72.reports[0].hanbaiten_code).toBe('H072');
      expect(filtered72.reports[0].genbu[0].busu).toBe('5 → 0');
      expect(filtered72.reports[0].zoubu).toHaveLength(0);

      // 73(新店)でフィルタ → 73 の zoubu だけ。busuAfter は rowB(8)由来 —
      // rowA だけしか取れていなかった旧実装だと 5 になり 72 側の結果と食い違っていた。
      mockZougenPage([rowA, rowB]);
      const filtered73 = await service.previewZougenHanbaiten(
        buildZougenQuery({ hanbaiten_id: [73] }),
        zSession(),
      );
      expect(filtered73.reports).toHaveLength(1);
      expect(filtered73.reports[0].hanbaiten_code).toBe('H073');
      expect(filtered73.reports[0].zoubu[0].busu).toBe('0 → 8');
      expect(filtered73.reports[0].genbu).toHaveLength(0);
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

    it('ページ送り: 販売店内で combo を perPage レコードずつに分割 (per_page=15, 20レコード→2ページ・顧客要件 2026-07)', async () => {
      // 20購読者(全て増・同一販売店+管理支店=1 combo)。全件取得 → combo を 15+5 の2ページ
      // に分割。ページ数は販売店ごとに 1/2, 2/2。SQL OFFSET/LIMIT は使わない。
      const rows = Array.from({ length: 20 }, (_, i) =>
        buildZougenRawRow({
          dokusya_id: 9300 + i,
          dokusya_busu: 3,
          zenkai_dokusya_busu: 1,
          hanbaiten_id: 200,
          hanbaiten_code: 'H001',
          kanri_shiten_id: 30,
        }),
      );
      mockZougenPage(rows);

      const p1 = await service.previewZougenHanbaiten(
        buildZougenQuery({ page: 1, per_page: 15 }),
        zSession(),
      );
      expect(p1.total_rows).toBe(20); // 購読者数
      expect(p1.total_pages).toBe(2);
      expect(p1.page_no).toBe(1);
      expect(p1.is_last_page).toBe(false);
      expect(p1.reports[0].zoubu).toHaveLength(15); // 1ページ目=15レコード
      expect(p1.group_page_no).toBe(1);
      expect(p1.group_total_pages).toBe(2);
      // SQL OFFSET/LIMIT は使わない（全件取得してメモリ内で combo 分割）。
      expect(qbMock.offset).not.toHaveBeenCalled();
      expect(qbMock.limit).not.toHaveBeenCalled();

      const p2 = await service.previewZougenHanbaiten(
        buildZougenQuery({ page: 2, per_page: 15 }),
        zSession(),
      );
      expect(p2.page_no).toBe(2);
      expect(p2.is_last_page).toBe(true);
      expect(p2.reports[0].zoubu).toHaveLength(5); // 2ページ目=残り5レコード
      expect(p2.group_page_no).toBe(2);
      expect(p2.group_total_pages).toBe(2);
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

    /**
     * 顧客要件 2026-08: 集計対象は紙版(1)のみ。増減連絡票は販売店へ配達部数の
     * 増減を伝える帳票で、電子版・併読には配達という概念が無い。
     *
     * 以前は「電子版は承認済(denshi_shonin_status=1)のみ集計」だった。紙版限定は
     * それを包含するので、旧条件は残さず置き換えている。
     */
    it('should extract 紙版 (dokusya_shubetsu = 1) only', async () => {
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /dokusya_shubetsu\s*=/.test(sql),
      );
      expect(call).toBeDefined();
      expect(call[1]).toMatchObject({ paperShubetsu: 1 });
    });

    it('should no longer carry the 電子版承認済 condition (紙版限定が包含する)', async () => {
      // 常に真になる条件を残すと「電子版も入りうる」と誤読させるため。
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const stale = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /denshi_shonin_status\s*=/.test(sql),
      );
      expect(stale).toBeUndefined();
    });

    // 顧客要件2026-08: 統廃合販売店読者移行画面（旧: 購読者販売店一括置換画面・
    // SCR-015）経由の変更（hanbaiten_tohaigo_flg=true）は集計対象から除外する。
    it('should exclude hanbaiten_tohaigo_flg=true rows (販売店統廃合)', async () => {
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /hanbaiten_tohaigo_flg\s*=\s*false/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should exclude 論理削除済み purchasers by joining t_dokusya with deleted_at IS NULL (regression)', async () => {
      // Regression: zougenBaseQuery previously only read t_dokusya_rireki and
      // never checked whether the underlying t_dokusya row had been
      // soft-deleted via DokusyaService.remove() (task #57608-follow-up).
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const dokusyaJoinBound = qbMock.innerJoin.mock.calls.some(
        ([table, , cond]: any[]) =>
          table === 't_dokusya' &&
          typeof cond === 'string' &&
          /deleted_at\s+IS\s+NULL/i.test(cond),
      );
      expect(dokusyaJoinBound).toBe(true);
    });

    it('#57976: should NOT row-level exclude 廃店 (haiten_flg) on the m_hanbaiten join — filtering happens per-store in the mapper, not per-row in SQL', async () => {
      // Regression: zougenBaseQuery previously joined `m_hanbaiten h ON ...
      // AND h.haiten_flg = false`, which dropped the ENTIRE row whenever the
      // subscriber's CURRENT store was closed — even when the row was still
      // needed to report the departure from the (still open) PREVIOUS store.
      // The join must no longer carry a haiten_flg condition; suppression of
      // reports addressed to a closed store is done in groupZougenReports.
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery(), zSession());

      const haitenBoundOnJoin = qbMock.innerJoin.mock.calls.some(
        ([table, , cond]: any[]) =>
          table === 'm_hanbaiten' && typeof cond === 'string' && /haiten_flg/.test(cond),
      );
      expect(haitenBoundOnJoin).toBe(false);
    });

    it('#57976: keeps the departing (still-open) store\'s 減 entry when the destination store is 廃店, and creates no report for the closed destination', async () => {
      mockZougenPage([
        buildZougenRawRow({
          hanbaiten_id: 201,
          hanbaiten_code: 'H002',
          hanbaiten_name: '廃店予定店',
          haiten_flg: true,
          zenkai_hanbaiten_id: 200,
          zenkai_hanbaiten_code: 'H001',
          zenkai_hanbaiten_name: '千代田販売店',
          zenkai_haiten_flg: false,
          dokusya_busu: 0,
          zenkai_dokusya_busu: 3,
        }),
      ]);

      const result = await service.previewZougenHanbaiten(
        buildZougenQuery({ hanbaiten_id: undefined }),
        zSession(),
      );

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].hanbaiten_id).toBe(200);
      expect(result.reports[0].genbu).toHaveLength(1);
      expect(result.reports[0].genbu[0].busu).toBe('3 → 0');
      expect(result.reports[0].zoubu).toHaveLength(0);
      expect(result.reports.some((r) => r.hanbaiten_id === 201)).toBe(false);
    });

    it('should bind hanbaiten_id IN filter when hanbaiten_id is provided', async () => {
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery({ hanbaiten_id: [200, 201] }), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /hanbaiten_id/.test(sql),
      );
      expect(call).toBeDefined();
    });

    // 顧客要件2026-08（バグ修正）: 行単位で hanbaiten_id/zenkai_hanbaiten_id を
    // 見るだけだと、同一購読者の同日複数履歴の一部だけが条件に一致し、他方が
    // 欠落して groupZougenReports の rmin/rmax 集約が壊れる（フィルタする店舗
    // によって集計結果が食い違う）。EXISTS で (dokusya_id, joho) 単位に判定し、
    // 一致すればその日の全履歴行を取得する。
    it('should scope the hanbaiten filter via EXISTS on (dokusya_id, joho) so same-day sibling rows are not dropped', async () => {
      mockZougenPage([buildZougenRawRow()]);
      await service.previewZougenHanbaiten(buildZougenQuery({ hanbaiten_id: [200, 201] }), zSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /EXISTS/.test(sql) &&
          /r2\.dokusya_id\s*=\s*r\.dokusya_id/.test(sql) &&
          /r2\.joho_henko_tekiyo_date\s*=\s*r\.joho_henko_tekiyo_date/.test(sql),
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
  // ACSMS-API-028-002 — POST /api/v1/report/zougen-hanbaiten/export (PDF)
  // ═══════════════════════════════════════════════════════════════════
  describe('exportZougenHanbaitenPdf', () => {
    it('should return a PDF buffer + role-aware filename (CHUOKAI/JA本店 → no 管理支店) when data exists', async () => {
      // COVERS: 顧客要件2026-07 ファイル名 (JA本店/中央会) =
      //   増減連絡票_{JA名}_{JAコード}_{適用日YYYYMMDD}.pdf
      qbMock.getRawMany.mockResolvedValue([buildZougenRawRow()]);

      const result = await service.exportZougenHanbaitenPdf(
        buildZougenQuery({ tekiyo_date: '2026-05-01' }),
        zSession(),
        req,
      );

      expect(result).toEqual(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          filename: '増減連絡票_テストJA_JA001_20260501.pdf',
        }),
      );
      expect(pdfService.generatePdf).toHaveBeenCalledTimes(1);
    });

    it('should include 管理支店名/コード in the filename when the role is JA_KANRI_SHITEN', async () => {
      // COVERS: 顧客要件2026-07 ファイル名 (JA管理支店) =
      //   増減連絡票_{JA名}_{JAコード}_{管理支店名}_{管理支店コード}_{適用日YYYYMMDD}.pdf
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
        filename:
          '増減連絡票_テストJA_JA001_JA東京中央 本店管理支店_1AA3300001_20260501.pdf',
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
          baseName: '増減連絡票_テストJA_JA001_20260501',
          // DB/DL表示名はタイムスタンプ無し（S3キーのみ一意化）。
          displayName: '増減連絡票_テストJA_JA001_20260501',
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

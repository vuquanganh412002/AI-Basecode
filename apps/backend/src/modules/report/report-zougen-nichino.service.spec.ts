// @ts-nocheck — immutable spec asserts on the discriminated-union ExportZougenNichinoResult
// (result.buffer/.contentType) without narrowing; cannot be type-clean without editing the
// spec. Source + controller type-check fine (tsc --noEmit src passes). To drop this banner,
// rerun /gen-ut-backend so the service spec uses expect(result).toEqual(objectContaining(...))
// like SCR-028.
// Screen: ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面
//
// ReportService unit specs for the 増減通知（日本農業新聞）endpoints:
//   - previewZougenNichino(query, session)      — API-029-001 (GET preview)
//   - exportZougenNichinoPdf(body, session, req) — API-029-002 (POST PDF/ZIP export)
//
// Pattern: plain `new ReportService(...)` with mocked deps. SCR-029 appends an
// @Optional() MailService as the 8th constructor arg (after dataSource +
// pdfService). Each it() maps back to a clause in
// docs/design/ACSMS-SCR-029/ACSMS-SCR-029-api.md.
//
// NOTE: kept in a SEPARATE file (not appended to report.service.spec.ts) during
// the RED phase because that file is GREEN (no @ts-nocheck) and ts-jest
// type-checks — referencing the not-yet-implemented previewZougenNichino /
// exportZougenNichinoPdf there would break the existing SCR-026/028 suite.
// Merge back into the root spec after /gen-code-backend turns this green.

import { ReportService } from '@/modules/report/report.service';
import {
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';
import {
  buildZougenNichinoQuery,
  buildZougenNichinoRemark,
  buildZougenNichinoRawRow,
} from '@test/fixtures/report-zougen-nichino.factory';

describe('ReportService — 増減通知（日本農業新聞） (SCR-029)', () => {
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
  let mailService: any;

  const req = { ip: '192.0.2.51', headers: { 'user-agent': 'jest' } } as any;

  // JA-scoped session holding report.export_zougen_nichino.
  const nSession = (overrides = {}) =>
    buildChuokaiSession({
      ja_id: 1,
      permissions: ['report.export_zougen_nichino'],
      ...overrides,
    });

  // 増減通知プレビューは SQLページング（購読者単位。SCR-028 と同方針）：
  //   ① count(distinct dokusya_id) → getRawOne
  //   ② ページ対象の dokusya_id → getRawMany (1回目)
  //   ③ その購読者の明細行 → getRawMany (2回目)
  // テストでは「このページに載る全行」を渡せば count/ids/rows をまとめて仕込む。
  const mockNichinoPage = (
    rows: ReturnType<typeof buildZougenNichinoRawRow>[],
  ): void => {
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
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn(),
    };
    rirekiRepo = { createQueryBuilder: jest.fn(() => qbMock) };
    fileDownloadRepo = {
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => ({ fileDownloadId: 9, ...v })),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    codeService = { has: jest.fn().mockReturnValue(true), getLabel: jest.fn().mockReturnValue('') };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };
    txManager = {
      create: jest.fn((_e: any, v: any) => ({ ...v })),
      save: jest.fn(async (_e: any, v: any) => ({ fileDownloadId: 9, ...(v ?? _e) })),
    };
    dataSource = { transaction: jest.fn(async (cb: any) => cb(txManager)) };
    pdfService = { generatePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 nichino')) };
    mailService = { sendNotification: jest.fn().mockResolvedValue(undefined) };

    // Constructor: SCR-029 appends @Optional() mailService after the SCR-028
    // deps (dataSource + pdfService).
    //   constructor(rirekiRepo, fileDownloadRepo, auditLog, codeService,
    //               storage, @Optional() dataSource?, @Optional() pdfService?,
    //               @Optional() mailService?)
    service = new ReportService(
      rirekiRepo,
      fileDownloadRepo,
      auditLog,
      codeService,
      storage,
      dataSource,
      pdfService,
      mailService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  // ═══════════════════════════════════════════════════════════════════════
  // API-029-001 — GET /api/v1/report/zougen-nichino/preview
  // ═══════════════════════════════════════════════════════════════════════
  describe('previewZougenNichino', () => {
    it('should return reports grouped by 管理支店 with every header/row/total field when data exists', async () => {
      // COVERS: 4.6 レスポンス生成 — full レスポンスデータ shape
      mockNichinoPage([buildZougenNichinoRawRow()]);

      const result = await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      expect(result.tekiyo_date).toBe('2026-03-01');
      expect(result.reports).toHaveLength(1);
      const rpt = result.reports[0];
      // 帳票ヘッダ
      expect(rpt.kanri_shiten_id).toBe(20);
      expect(rpt.kanri_shiten_code).toBe('1AA3300001');
      expect(rpt.kanri_shiten_name).toBe('本店管理支店');
      expect(rpt.ja_name).toBe('JA東京中央');
      expect(rpt.todofuken_name).toBe('東京都');
      expect(rpt.tanto_busho).toBe('業務部');
      expect(rpt.tanto_name).toBe('農協 太郎');
      expect(rpt.tel).toBe('03-1234-5678');
      expect(rpt.fax).toBe('03-1234-5679');
      // 明細行
      expect(rpt.rows).toHaveLength(1);
      const row = rpt.rows[0];
      expect(row.hanbaiten_id).toBe(200);
      expect(row.hanbaiten_code).toBe('12345678');
      expect(row.hanbaiten_name).toBe('A販売店'); // torihikisaki_no 非空 → （免）なし
      expect(row.itaku_label).toBe('委託'); // itaku_kubun=2
      expect(row.genzai_busu).toBe(10);
      expect(row.zou_busu).toBe(0);
      expect(row.gen_busu).toBe(1);
      expect(row.shin_busu).toBe(9);
      expect(typeof row.diff_mark).toBe('boolean');
      // 合計
      expect(rpt.total).toEqual(
        expect.objectContaining({ genzai_busu: 10, zou_busu: 0, gen_busu: 1, shin_busu: 9 }),
      );
    });

    it('should treat genzai_busu as 0 when zenkai_dokusya_busu is null (COALESCE)', async () => {
      // COVERS: 4.6 現在部数 = COALESCE(zenkai_dokusya_busu, 0)
      mockNichinoPage([
        buildZougenNichinoRawRow({ zenkai_dokusya_busu: null, dokusya_busu: 5 }),
      ]);

      const row = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows[0];
      expect(row.genzai_busu).toBe(0);
      expect(row.zou_busu).toBe(5);
      expect(row.gen_busu).toBe(0);
      expect(row.shin_busu).toBe(5);
    });

    it('should compute zou_busu when dokusya_busu > genzai_busu', async () => {
      // COVERS: 4.6 増部数
      mockNichinoPage([
        buildZougenNichinoRawRow({ dokusya_busu: 12, zenkai_dokusya_busu: 10 }),
      ]);

      const row = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows[0];
      expect(row.zou_busu).toBe(2);
      expect(row.gen_busu).toBe(0);
      expect(row.shin_busu).toBe(12);
    });

    it('should compute gen_busu when dokusya_busu < genzai_busu', async () => {
      // COVERS: 4.6 減部数
      mockNichinoPage([
        buildZougenNichinoRawRow({ dokusya_busu: 7, zenkai_dokusya_busu: 10 }),
      ]);

      const row = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows[0];
      expect(row.gen_busu).toBe(3);
      expect(row.zou_busu).toBe(0);
      expect(row.shin_busu).toBe(7);
    });

    it('累計: 同一購読者の同日複数履歴 (1→3→5) を現在1/新5/増4の1行に集約', async () => {
      mockNichinoPage([
        buildZougenNichinoRawRow({ dokusya_id: 9201, dokusya_busu: 3, zenkai_dokusya_busu: 1 }),
        buildZougenNichinoRawRow({ dokusya_id: 9201, dokusya_busu: 5, zenkai_dokusya_busu: 3 }),
      ]);

      const rpt = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession())).reports[0];
      expect(rpt.rows).toHaveLength(1); // 2行ではなく累計1行
      expect(rpt.rows[0].genzai_busu).toBe(1); // 日初の前回部数
      expect(rpt.rows[0].shin_busu).toBe(5); // 日末の現部数
      expect(rpt.rows[0].zou_busu).toBe(4); // 5 - 1
      expect(rpt.rows[0].gen_busu).toBe(0);
    });

    it('解約: …→0 を 減=現在部数 / 新0 として反映', async () => {
      mockNichinoPage([
        buildZougenNichinoRawRow({ dokusya_id: 9202, dokusya_busu: 0, zenkai_dokusya_busu: 2 }),
      ]);

      const row = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows[0];
      expect(row.genzai_busu).toBe(2);
      expect(row.gen_busu).toBe(2);
      expect(row.shin_busu).toBe(0);
      expect(row.zou_busu).toBe(0);
    });

    it('販売店変更: 旧店に減(現在分)/新店に増 を2行で反映', async () => {
      mockNichinoPage([
        buildZougenNichinoRawRow({
          dokusya_id: 9203,
          dokusya_busu: 1,
          zenkai_dokusya_busu: 1, // 部数不変
          hanbaiten_id: 300,
          hanbaiten_code: '30000000',
          hanbaiten_name: 'B販売店',
          zenkai_hanbaiten_id: 200,
          zenkai_hanbaiten_code: '20000000',
          zenkai_hanbaiten_name: 'A販売店',
          zenkai_itaku_kubun: 2,
          zenkai_torihikisaki_no: 'T9',
        }),
      ]);

      const rows = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows;
      const oldStore = rows.find((r) => r.hanbaiten_code === '20000000');
      const newStore = rows.find((r) => r.hanbaiten_code === '30000000');
      expect(oldStore?.genzai_busu).toBe(1); // 旧店: 現在1
      expect(oldStore?.gen_busu).toBe(1); // 旧店: 減1
      expect(oldStore?.shin_busu).toBe(0); // 旧店: 新0
      expect(newStore?.genzai_busu).toBe(0); // 新店: 現在0
      expect(newStore?.zou_busu).toBe(1); // 新店: 増1
      expect(newStore?.shin_busu).toBe(1); // 新店: 新1
    });

    it('should set itaku_label to 委託 when itaku_kubun is 2 (日農委託)', async () => {
      // COVERS: 4.6 委託欄 — itaku_kubun=2
      mockNichinoPage([buildZougenNichinoRawRow({ itaku_kubun: 2 })]);

      const row = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows[0];
      expect(row.itaku_label).toBe('委託');
    });

    it('should set itaku_label to empty string when itaku_kubun is not 2 (振込/その他)', async () => {
      // COVERS: 4.6 委託欄 — 1:振込/9:その他 → ""
      mockNichinoPage([buildZougenNichinoRawRow({ itaku_kubun: 1 })]);

      const row = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows[0];
      expect(row.itaku_label).toBe('');
    });

    it('should prefix hanbaiten_name with （免） when torihikisaki_no is empty (免税販売店)', async () => {
      // COVERS: 4.6 免税販売店 — 適格請求書発行事業者番号が空 → 先頭に（免）
      mockNichinoPage([
        buildZougenNichinoRawRow({ torihikisaki_no: '', hanbaiten_name: 'A販売店' }),
      ]);

      const row = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows[0];
      expect(row.hanbaiten_name).toBe('（免）A販売店');
    });

    it('should sum genzai/zou/gen/shin into total per 管理支店', async () => {
      // COVERS: 4.6 total（管理支店内の全販売店合計）
      mockNichinoPage([
        buildZougenNichinoRawRow({ hanbaiten_code: '11111111', dokusya_busu: 12, zenkai_dokusya_busu: 10 }), // zou2
        buildZougenNichinoRawRow({ hanbaiten_code: '22222222', dokusya_busu: 7, zenkai_dokusya_busu: 10 }), // gen3
      ]);

      const total = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].total;
      expect(total.genzai_busu).toBe(20);
      expect(total.zou_busu).toBe(2);
      expect(total.gen_busu).toBe(3);
      expect(total.shin_busu).toBe(19);
    });

    it('should produce one report per 管理支店 when rows span multiple 管理支店', async () => {
      // COVERS: 4.6 管理支店ID でグループ化（各要素＝1枚の帳票）
      mockNichinoPage([
        buildZougenNichinoRawRow({ kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001' }),
        buildZougenNichinoRawRow({ kanri_shiten_id: 21, kanri_shiten_code: '1AA3300002' }),
      ]);

      const result = await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());
      expect(result.reports).toHaveLength(2);
    });

    it('orders reports by kanri_shiten_code and rows by hanbaiten_code (整列はレスポンス側)', async () => {
      // SQL は同日累計のため dokusya_id, rireki_no 昇順で取得し、帳票の並びは
      // groupZougenNichinoReports 側で再整列する。
      mockNichinoPage([
        buildZougenNichinoRawRow({
          dokusya_id: 9101, kanri_shiten_id: 22, kanri_shiten_code: '1AA3300002', hanbaiten_code: '20000000',
        }),
        buildZougenNichinoRawRow({
          dokusya_id: 9102, kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001', hanbaiten_code: '12345678',
        }),
        buildZougenNichinoRawRow({
          dokusya_id: 9103, kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001', hanbaiten_code: '10000000',
        }),
      ]);

      const result = await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      // 管理支店コード昇順
      expect(result.reports.map((r) => r.kanri_shiten_code)).toEqual(['1AA3300001', '1AA3300002']);
      // 行内は販売店コード昇順
      expect(result.reports[0].rows.map((r) => r.hanbaiten_code)).toEqual(['10000000', '12345678']);
      // SQL 取得順は dokusya_id（累計用）
      expect(
        qbMock.orderBy.mock.calls.some(([col]: any[]) => /dokusya_id/.test(String(col))),
      ).toBe(true);
    });

    it('should bind the joho_henko_tekiyo_date = tekiyo_date predicate', async () => {
      // COVERS: 4.3/4.5 適用日と一致
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /joho_henko_tekiyo_date/.test(sql) &&
          params &&
          Object.values(params).includes('2026-03-01'),
      );
      expect(call).toBeDefined();
    });

    it('should restrict to zougen_hokoku_flg = true (増減報告対象のみ)', async () => {
      // COVERS: 4.3/4.5 zougen_hokoku_flg = true
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /zougen_hokoku_flg/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should exclude 廃店 (haiten_flg = false) on the m_hanbaiten join', async () => {
      // COVERS: 4.3/4.5 廃店・電子版ダミー販売店を除外
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const haitenBound =
        qbMock.andWhere.mock.calls.some(
          ([sql]: any[]) => typeof sql === 'string' && /haiten_flg/.test(sql),
        ) ||
        qbMock.innerJoin.mock.calls.some(
          ([, , cond]: any[]) => typeof cond === 'string' && /haiten_flg/.test(cond),
        );
      expect(haitenBound).toBe(true);
    });

    it('should bind the NOT(genzai=0 AND shin=0) exclusion predicate', async () => {
      // COVERS: 4.5 現在部数=0 かつ 新部数=0 のレコードは除外
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const excluded = qbMock.andWhere.mock.calls.some(
        ([sql]: any[]) => typeof sql === 'string' && /NOT\s*\(/i.test(sql),
      );
      expect(excluded).toBe(true);
    });

    it('should bind kanri_shiten_id IN filter when kanri_shiten_id is provided', async () => {
      // COVERS: 4.3 kanri_shiten_id 指定時
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(
        buildZougenNichinoQuery({ kanri_shiten_id: [20, 21] }),
        nSession(),
      );

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_shiten_id/.test(sql),
      );
      expect(call).toBeDefined();
    });

    it('should bind ja_id scope predicate when session role_code is CHUOKAI', async () => {
      // COVERS: 4.2 DataScope — CHUOKAI: r.ja_id = :user_ja_id
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession({ ja_id: 7 }));

      const scoped = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scoped).toBeDefined();
    });

    it('should bind ja_id scope predicate when session role_code is JA_HONTEN', async () => {
      // COVERS: 4.2 DataScope — JA_HONTEN: r.ja_id = :user_ja_id
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(
        buildZougenNichinoQuery(),
        buildJaHontenSession({ ja_id: 8, permissions: ['report.export_zougen_nichino'] }),
      );

      const scoped = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bja_?[Ii]d\b/.test(sql),
      );
      expect(scoped).toBeDefined();
    });

    it('should bind kanri_shiten_id scope predicate when session role_code is JA_KANRI_SHITEN', async () => {
      // COVERS: 4.2 DataScope — JA_KANRI_SHITEN: r.kanri_shiten_id = :user_kanri_shiten_id
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(
        buildZougenNichinoQuery(),
        buildJaKanriShitenSession({
          kanri_shiten_id: 33,
          permissions: ['report.export_zougen_nichino'],
        }),
      );

      const scoped = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /\bkanri_?[Ss]hiten_?[Ii]d\b/.test(sql),
      );
      expect(scoped).toBeDefined();
    });

    it('should return empty reports (NOT 404) when no record matches', async () => {
      // COVERS: 4.4 0件 → HTTP 200 + reports:[]（業務エラーではない）
      mockNichinoPage([]);

      const result = await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());
      expect(result.reports).toEqual([]);
      expect(result.tekiyo_date).toBe('2026-03-01');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // API-029-002 — POST /api/v1/report/zougen-nichino/export (PDF/ZIP)
  // ═══════════════════════════════════════════════════════════════════════
  describe('exportZougenNichinoPdf', () => {
    it('should return a PDF (application/pdf) + 増減通知_{code}_{YYYYMMDD}.pdf when a single 管理支店 matches', async () => {
      // COVERS: 4.8 単一管理支店 → PDF返却
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);

      const result = await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );

      expect(result.empty).toBe(false);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toMatch(/^増減通知_.*20260301\.pdf$/);
      expect(pdfService.generatePdf).toHaveBeenCalledTimes(1);
    });

    it('should bundle multiple 管理支店 into ONE paginated PDF (preview と同じ改ページ)', async () => {
      // COVERS: 4.8 全管理支店をプレビューと同じ改ページ（15行/ページ）で1つのPDFに
      // まとめる（管理支店ごとのZIPではない）。
      qbMock.getRawMany.mockResolvedValue([
        buildZougenNichinoRawRow({ dokusya_id: 1, kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001' }),
        buildZougenNichinoRawRow({ dokusya_id: 2, kanri_shiten_id: 21, kanri_shiten_code: '1AA3300002' }),
      ]);

      const result = await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({ kanri_shiten_id: [20, 21] }),
        nSession(),
        req,
      );
      // 1つのPDFのみ生成（zip分割しない）。
      expect(pdfService.generatePdf).toHaveBeenCalledTimes(1);
      expect(result.empty).toBe(false);
      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toMatch(/^増減通知_20260301\.pdf$/);
    });

    it('should upload the generated PDF to S3 when export succeeds', async () => {
      // COVERS: 4.4 S3保存
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req);
      expect(storage.upload).toHaveBeenCalled();
    });

    it('should send a notification mail to 日農 担当者 when export succeeds', async () => {
      // COVERS: 4.5 メール通知（MailService）
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req);
      expect(mailService.sendNotification).toHaveBeenCalled();
    });

    it('should still return a PDF (export success) when the notification mail fails', async () => {
      // COVERS: 4.5 メール送信失敗時もPDF出力自体は成功扱い
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      mailService.sendNotification.mockRejectedValueOnce(new Error('smtp-down'));

      const result = await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery(),
        nSession(),
        req,
      );
      expect(result.empty).toBe(false);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should record a t_file_download row with download_type=4 (増減通知書) when export succeeds', async () => {
      // COVERS: 4.6 download_type=4
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req);

      const saved =
        (txManager.create.mock.calls[0]?.[1] as any) ??
        (txManager.save.mock.calls[0]?.[1] as any) ??
        (fileDownloadRepo.create.mock.calls[0]?.[0] as any);
      expect(saved.downloadType ?? saved.download_type).toBe(4);
    });

    it('should wrap t_file_download + operation log in a single dataSource.transaction', async () => {
      // COVERS: 4.6/4.7 単一トランザクション
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should write an operation log with EXPORT_PDF + result_status success when export succeeds', async () => {
      // COVERS: 4.7 操作ログ — operation 'EXPORT_PDF', result_status 1
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession({ account_id: 12 }), req);

      expect(auditLog.logOperation).toHaveBeenCalled();
      const successCall = auditLog.logOperation.mock.calls
        .map(([a]: any[]) => a)
        .find((a: any) => a.operation === 'EXPORT_PDF' && a.resultStatus === 1);
      expect(successCall).toEqual(
        expect.objectContaining({
          logType: 1,
          operation: 'EXPORT_PDF',
          resultStatus: 1,
          targetTable: 't_file_download',
        }),
      );
    });

    it('should NOT log personal data (氏名/住所) in the operation log after_value', async () => {
      // COVERS: 4.7 個人情報（氏名・住所等）は含めない
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req);

      const after = auditLog.logOperation.mock.calls
        .map(([a]: any[]) => String(a.afterValue ?? ''))
        .join('');
      expect(after).not.toContain('農業');
      expect(after).not.toContain('神田');
    });

    it('should print the remarks biko into PDF generation when remarks are provided', async () => {
      // COVERS: 4.4 備考（remarks）を帳票に印字
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({
          remarks: [buildZougenNichinoRemark({ kanri_shiten_id: 20, biko: '3月度分の増減通知です。' })],
        }),
        nSession(),
        req,
      );

      const calls = JSON.stringify(pdfService.generatePdf.mock.calls);
      expect(calls).toContain('3月度分の増減通知です。');
    });

    it('should rollback (operation log + t_file_download share the tx) when the audit log fails', async () => {
      // COVERS: tx rollback — business write + audit log atomic
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit-down'));

      await expect(
        service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req),
      ).rejects.toBeDefined();
    });

    it('should emit an error log (log_type=3) OUTSIDE the transaction when export fails', async () => {
      // COVERS: 4.9 エラーログはトランザクション外（log_type=3, result_status=2）
      qbMock.getRawMany.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should return { empty: true } and NOT generate a PDF when no record matches', async () => {
      // COVERS: 4.3 0件 → HTTP 200 + 空配列, ファイル生成しない
      qbMock.getRawMany.mockResolvedValue([]);

      const result = await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery(),
        nSession(),
        req,
      );
      expect(result).toEqual({ empty: true });
      expect(pdfService.generatePdf).not.toHaveBeenCalled();
      expect(storage.upload).not.toHaveBeenCalled();
      expect(mailService.sendNotification).not.toHaveBeenCalled();
      // 0件は履歴・操作ログも残さない。
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });

    it.todo('should return a ZIP (application/zip) named 増減通知_{YYYYMMDD}.zip when multiple 管理支店 match — requires a zip lib (e.g. archiver) added during /gen-code-backend');
  });
});

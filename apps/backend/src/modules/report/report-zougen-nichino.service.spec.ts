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

import { attachLogExport } from '@test/utils/audit-log-mock';
import { ReportService } from '@/modules/report/report.service';
import { MeiboReportService } from '@/modules/report/meibo-report.service';
import { ZougenReportService } from '@/modules/report/zougen-report.service';
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
  let qbMock: any;
  let auditLog: any;
  let codeService: any;
  let reportArchive: any;
  let dataSource: any;
  let pdfService: any;
  let reportNotification: any;

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
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    // logExport は実装と同じく logOperation へ委譲する（監査セマンティクス不変）。
    attachLogExport(auditLog);
    codeService = { has: jest.fn().mockReturnValue(true), getLabel: jest.fn().mockReturnValue('') };
    // SCR-029 はもうトランザクションを組まないが、constructor 位置維持のため
    // dataSource は引き続き渡す（実装では未使用）。
    dataSource = { transaction: jest.fn(async (cb: any) => cb({})) };
    pdfService = { generatePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 nichino')) };
    // SCR-029: メール通知は S3 保存後に notifyRoles() で fire-and-forget。
    // 戻り値（送信を試みた宛先数）を recipient_count に使う。
    reportNotification = {
      notifyRoles: jest.fn().mockResolvedValue(3),
    };
    reportArchive = {
      archive: jest.fn().mockResolvedValue({
        key: 'reports/zougen-nichino/1301002001/2026/増減通知_2026年03月01日_20260301120000.pdf',
        filename: '増減通知_2026年03月01日_20260301120000.pdf',
        fileDownloadId: 77,
      }),
    };

    // Facade wiring: SCR-029 export needs pdfService + reportNotification on the
    // ZougenReportService. dataSource is no longer used (kept in scope as a mock).
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
      reportNotification,
    );
    service = new ReportService(meibo, zougen);
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
      // 前回値(10)と現在値(12)に差があるため差異マーク◆が付く。
      expect(row.diff_mark).toBe(true);
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
      expect(row.diff_mark).toBe(true);
    });

    it('should set diff_mark=false when dokusya_busu equals zenkai_dokusya_busu (増減なし)', async () => {
      // COVERS: 4.6 差異マーク — 前回値と現在値が同じ行は◆を付けない。
      mockNichinoPage([
        buildZougenNichinoRawRow({ dokusya_busu: 10, zenkai_dokusya_busu: 10 }),
      ]);

      const row = (await service.previewZougenNichino(buildZougenNichinoQuery(), nSession()))
        .reports[0].rows[0];
      expect(row.zou_busu).toBe(0);
      expect(row.gen_busu).toBe(0);
      expect(row.diff_mark).toBe(false);
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

    it('should count only 承認済 electronic subscribers (電子版=2 → denshi_shonin_status=1)', async () => {
      // COVERS: 電子版(DokusyaShubetsu.DIGITAL=2)は承認済(1)のみ集計対象。
      // 承認待ち(0)/否認(2)の電子版は増減通知から除外する。
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

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
  // API-029-002 — POST /api/v1/report/zougen-nichino/export
  // S3 アーカイブ（t_file_download）+ 日農担当者へのメール通知のみ。
  // ブラウザへPDFは返さず { empty:false, fileName, recipientCount } を返す。
  // ═══════════════════════════════════════════════════════════════════════
  describe('exportZougenNichinoPdf', () => {
    it('should return { fileName, recipientCount } (NO buffer/contentType) when a 管理支店 matches', async () => {
      // COVERS: 4.8 出力結果はファイル名 + 通知宛先数（PDFはブラウザへ返さない）
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);

      const result = await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );

      expect(result.empty).toBe(false);
      expect(result.fileName).toBe('増減通知_2026年03月01日_20260301120000.pdf');
      expect(result.recipientCount).toBe(3);
      // PDFバッファ・Content-Type はもう返さない。
      expect(result.buffer).toBeUndefined();
      expect(result.contentType).toBeUndefined();
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
    });

    it('should archive the PDF to S3 via FileArchiveService with category=zougen-nichino (no subFolder)', async () => {
      // COVERS: 4.4 S3保存（共通 FileArchiveService）
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );
      expect(reportArchive.archive).toHaveBeenCalledTimes(1);
      const arg = reportArchive.archive.mock.calls[0][0];
      expect(arg).toEqual(
        expect.objectContaining({
          category: 'zougen-nichino',
          year: '2026',
          baseName: '増減通知_2026年03月01日',
          contentType: 'application/pdf',
          extension: '.pdf',
        }),
      );
      // subFolder は付与しない。
      expect(arg.subFolder).toBeUndefined();
    });

    it('should auto-send a notification mail to roles [1,2] (NICHINO_ADMIN/STAFF) when export succeeds', async () => {
      // COVERS: 4.5 メール通知（ReportNotificationService.notifyRoles）
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      await service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req);

      expect(reportNotification.notifyRoles).toHaveBeenCalledTimes(1);
      const [roleIds, mail] = reportNotification.notifyRoles.mock.calls[0];
      expect(roleIds).toEqual([1, 2]);
      expect(mail.subject).toContain('増減通知');
      expect(mail.body).toContain('ファイル管理画面');
    });

    it('should still succeed (S3 + audit) when no ReportNotificationService is injected — recipientCount=0', async () => {
      // COVERS: 4.5 通知サービス未注入でも出力自体は成功（fire-and-forget）
      const meiboNoNotify = new MeiboReportService(
        rirekiRepo,
        auditLog,
        codeService,
        reportArchive,
      );
      const zougenNoNotify = new ZougenReportService(
        rirekiRepo,
        auditLog,
        reportArchive,
        pdfService,
        // reportNotification omitted
      );
      const svc = new ReportService(meiboNoNotify, zougenNoNotify);
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);

      const result = await svc.exportZougenNichinoPdf(
        buildZougenNichinoQuery(),
        nSession(),
        req,
      );
      expect(result.empty).toBe(false);
      expect(result.recipientCount).toBe(0);
      expect(reportArchive.archive).toHaveBeenCalledTimes(1);
    });

    it('should write an operation log with EXPORT_PDF + result_status success, targetTable t_file_download', async () => {
      // COVERS: 4.7 操作ログ — operation 'EXPORT_PDF', result_status 1, t_file_download
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
          targetId: 77, // archived.fileDownloadId
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

    it('should emit an error log (log_type=3) OUTSIDE any transaction when export fails', async () => {
      // COVERS: 4.9 エラーログはトランザクション外（log_type=3, result_status=2）
      qbMock.getRawMany.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should propagate the error (no swallow) when the S3 archive fails', async () => {
      // COVERS: 4.9 S3保存失敗は出力失敗（throw）+ エラーログ
      qbMock.getRawMany.mockResolvedValue([buildZougenNichinoRawRow()]);
      reportArchive.archive.mockRejectedValueOnce(new Error('s3-down'));

      await expect(
        service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should return { empty: true } and NOT generate/archive/mail when no record matches', async () => {
      // COVERS: 4.3 0件 → HTTP 200 + 空配列, ファイル生成しない
      qbMock.getRawMany.mockResolvedValue([]);

      const result = await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery(),
        nSession(),
        req,
      );
      expect(result).toEqual({ empty: true });
      expect(pdfService.generatePdf).not.toHaveBeenCalled();
      expect(reportArchive.archive).not.toHaveBeenCalled();
      expect(reportNotification.notifyRoles).not.toHaveBeenCalled();
      // 0件は操作ログも残さない。
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });
  });
});

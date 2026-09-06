// @ts-nocheck — immutable spec asserts on the discriminated-union ExportZougenNichinoResult
// (result.buffer/.contentType) without narrowing; cannot be type-clean without editing the
// spec. Source + controller type-check fine (tsc --noEmit src passes). To drop this banner,
// rerun /gen-ut-backend so the service spec uses expect(result).toEqual(objectContaining(...))
// like ACSMS-SCR-028.
// Screen: ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面
//
// ReportService unit specs for the 増減通知（日本農業新聞）endpoints:
//   - previewZougenNichino(query, session)      — ACSMS-API-029-001 (GET preview)
//   - exportZougenNichinoPdf(body, session, req) — ACSMS-API-029-002 (POST PDF/ZIP export)
//
// Pattern: plain `new ReportService(...)` with mocked deps. ACSMS-SCR-029 appends an
// @Optional() MailService as the 8th constructor arg (after dataSource +
// pdfService). Each it() maps back to a clause in
// docs/design/ACSMS-SCR-029/ACSMS-SCR-029-api.md.
//
// NOTE: kept in a SEPARATE file (not appended to report.service.spec.ts) during
// the RED phase because that file is GREEN (no @ts-nocheck) and ts-jest
// type-checks — referencing the not-yet-implemented previewZougenNichino /
// exportZougenNichinoPdf there would break the existing ACSMS-SCR-026/028 suite.
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
import {
  formatGenBusu,
  groupZougenNichinoReports,
} from '@/modules/report/zougen-nichino.mapper';

describe('zougen-nichino.mapper — formatGenBusu (減部数の▲表示・顧客要件2026-07)', () => {
  it('prefixes 減部数 with ▲ when the value is positive', () => {
    expect(formatGenBusu(2)).toBe('▲2');
    expect(formatGenBusu(1)).toBe('▲1');
  });

  it('shows "0" (no ▲) when there is no 減部数', () => {
    expect(formatGenBusu(0)).toBe('0');
  });
});

describe('zougen-nichino.mapper — groupZougenNichinoReports (同一販売店の行集約・#59108)', () => {
  it('merges two different subscribers changing the same 販売店 on the same day into 1 row (片岡様フィードバック 2026-08-24)', () => {
    // 木場深川 (hanbaiten_id=300): 前日までに1部（8/29の+1が既に反映済み）→
    // 当日、新規購読者(9201)が+1、既存購読者(9202)が解約で-1 → net 0、最終1部。
    const rows = [
      buildZougenNichinoRawRow({
        dokusya_id: 9201,
        hanbaiten_id: 300,
        hanbaiten_code: '3130001000',
        hanbaiten_name: '木場深川',
        zenkai_hanbaiten_id: 300,
        dokusya_busu: 1,
        zenkai_dokusya_busu: 0,
      }),
      buildZougenNichinoRawRow({
        dokusya_id: 9202,
        hanbaiten_id: 300,
        hanbaiten_code: '3130001000',
        hanbaiten_name: '木場深川',
        zenkai_hanbaiten_id: 300,
        dokusya_busu: 0,
        zenkai_dokusya_busu: 1,
      }),
    ] as any;

    const reports = groupZougenNichinoReports(rows);

    expect(reports).toHaveLength(1);
    expect(reports[0].rows).toHaveLength(1);
    expect(reports[0].rows[0]).toMatchObject({
      hanbaiten_code: '3130001000',
      genzai_busu: 1,
      zou_busu: 1,
      gen_busu: 1,
      shin_busu: 1,
      diff_mark: true,
    });
    // total は集約前から常に正しい（addRow 側で合算済み）— 回帰確認。
    expect(reports[0].total).toEqual({
      genzai_busu: 1,
      zou_busu: 1,
      gen_busu: 1,
      shin_busu: 1,
    });
  });

  it('keeps different 販売店 as separate rows (no over-merging)', () => {
    const rows = [
      buildZougenNichinoRawRow({
        dokusya_id: 9301,
        hanbaiten_id: 300,
        hanbaiten_code: '3130001000',
        hanbaiten_name: '木場深川',
        zenkai_hanbaiten_id: 300,
        dokusya_busu: 1,
        zenkai_dokusya_busu: 0,
      }),
      buildZougenNichinoRawRow({
        dokusya_id: 9302,
        hanbaiten_id: 301,
        hanbaiten_code: '3130001010',
        hanbaiten_name: '日経・深川2',
        zenkai_hanbaiten_id: 301,
        dokusya_busu: 1,
        zenkai_dokusya_busu: 0,
      }),
    ] as any;

    const reports = groupZougenNichinoReports(rows);

    expect(reports).toHaveLength(1);
    expect(reports[0].rows.map((r) => r.hanbaiten_code)).toEqual(
      ['3130001000', '3130001010'],
    );
  });

  it('drops a merged 販売店 row whose 現在部数 and 新部数 are both 0 after a store-change split (#59108)', () => {
    // 購読者が販売店を移動(300→400)しつつ同時に0部(転出時解約相当)になるケース。
    // 生行フィルタは zenkai_dokusya_busu=5(≠0)で通過するため、classifyNichino の
    // 販売店変更分岐は転出元(300: 現在5/新0)と転入先(400: 現在0/新0)の2行を生成する。
    // 転入先は現在部数・新部数ともに0の空行になるため、集約後に除外されるべき
    // （「現在部数 または 新部数 が0でない店舗のみ掲載」— 顧客CR #59108）。
    const rows = [
      buildZougenNichinoRawRow({
        dokusya_id: 9401,
        hanbaiten_id: 400,
        hanbaiten_code: '4000000000',
        hanbaiten_name: '転入先店',
        zenkai_hanbaiten_id: 300,
        zenkai_hanbaiten_code: '3000000000',
        zenkai_hanbaiten_name: '転出元店',
        dokusya_busu: 0,
        zenkai_dokusya_busu: 5,
      }),
    ] as any;

    const reports = groupZougenNichinoReports(rows);

    expect(reports).toHaveLength(1);
    // 転出元(300)のみ残る。転入先(400)の現在0/新0の空行は除外される。
    expect(reports[0].rows).toHaveLength(1);
    expect(reports[0].rows[0]).toMatchObject({
      hanbaiten_code: '3000000000',
      genzai_busu: 5,
      zou_busu: 0,
      gen_busu: 5,
      shin_busu: 0,
    });
  });
});

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

  // 増減通知プレビューはグループ単位ページング（管理支店ごとに独立ページ・顧客要件
  // 2026-07・ACSMS-SCR-026 と同方針）。fetchZougenNichinoRows は当日の増減報告
  // 対象行（nichinoBaseQuery / getRawMany の奇数回目）と、動きの無い既存購読者の
  // 基礎行（nichinoBaselineQuery / getRawMany の偶数回目）の2クエリを実行する
  // （顧客CR #59108 片岡様フィードバック 2026-08-31）。previewZougenNichino を
  // ページ違いで複数回呼ぶテストもあるため、奇数回目=rows／偶数回目=空 で交互に
  // 返す（1回のみ呼ぶテストでも同じ結果になる）。既存テストは「当日の増減対象行
  // のみ」を検証するため、基礎行クエリは空がデフォルト — 基礎行の挙動そのものを
  // 検証するテストは mockNichinoPageWithBaseline を使う。
  const mockNichinoPage = (
    rows: ReturnType<typeof buildZougenNichinoRawRow>[],
  ): void => {
    qbMock.getRawMany.mockReset();
    let callCount = 0;
    qbMock.getRawMany.mockImplementation(async () => {
      callCount += 1;
      return callCount % 2 === 1 ? rows : [];
    });
  };

  // 当日の増減対象行 + 動きの無い既存購読者の基礎行の両方を個別に指定するテスト用。
  const mockNichinoPageWithBaseline = (
    changedRows: ReturnType<typeof buildZougenNichinoRawRow>[],
    baselineRows: ReturnType<typeof buildZougenNichinoRawRow>[],
  ): void => {
    qbMock.getRawMany.mockReset();
    qbMock.getRawMany.mockResolvedValueOnce(changedRows);
    qbMock.getRawMany.mockResolvedValueOnce(baselineRows);
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
    // ACSMS-SCR-029 はもうトランザクションを組まないが、constructor 位置維持のため
    // dataSource は引き続き渡す（実装では未使用）。
    dataSource = { transaction: jest.fn(async (cb: any) => cb({})) };
    pdfService = { generatePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 nichino')) };
    // ACSMS-SCR-029: メール通知は S3 保存後に notifyNichinoExport() で fire-and-forget。
    // 戻り値（送信を試みた宛先数）を recipient_count に使う（顧客要件2026-07で
    // 件名・本文に都道府県+発行アカウントを含める専用メソッドに変更）。
    reportNotification = {
      notifyRoles: jest.fn().mockResolvedValue(3),
      notifyNichinoExport: jest.fn().mockResolvedValue(3),
    };
    reportArchive = {
      // 表示名（displayName）はタイムスタンプ無し。S3キーは別途タイムスタンプ付き。
      archive: jest.fn().mockResolvedValue({
        key: 'reports/zougen-nichino/1301002001/2026/増減通知_JAテスト_1301002001_20260301_20260301120000.pdf',
        filename: '増減通知_JAテスト_1301002001_20260301.pdf',
        fileDownloadId: 77,
      }),
      // 顧客要件2026-07: ロール別ファイル名に JA名/JAコードを使うため resolveJa を追加。
      resolveJa: jest
        .fn()
        .mockResolvedValue({ code: '1301002001', name: 'JAテスト' }),
    };

    // Facade wiring: ACSMS-SCR-029 export needs pdfService + reportNotification on the
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
  // ACSMS-API-029-001 — GET /api/v1/report/zougen-nichino/preview
  // ═══════════════════════════════════════════════════════════════════════
  describe('previewZougenNichino', () => {
    it('should exclude 論理削除済み purchasers by joining t_dokusya with deleted_at IS NULL (regression)', async () => {
      // Regression: nichinoBaseQuery previously only read t_dokusya_rireki and
      // never checked whether the underlying t_dokusya row had been
      // soft-deleted via DokusyaService.remove() (task #57608-follow-up).
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const dokusyaJoinBound = qbMock.innerJoin.mock.calls.some(
        ([table, , cond]: any[]) =>
          table === 't_dokusya' &&
          typeof cond === 'string' &&
          /deleted_at\s+IS\s+NULL/i.test(cond),
      );
      expect(dokusyaJoinBound).toBe(true);
    });

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

    it('should produce one report per 管理支店 on its own page when rows span multiple 管理支店', async () => {
      // COVERS: 4.6 管理支店ID でグループ化（各ページ＝1管理支店・顧客要件 2026-07）。
      mockNichinoPage([
        buildZougenNichinoRawRow({ kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001' }),
        buildZougenNichinoRawRow({ kanri_shiten_id: 21, kanri_shiten_code: '1AA3300002' }),
      ]);

      // 各管理支店が独立ページ → total_pages=2 / group_count=2、1ページ=1管理支店。
      const p1 = await service.previewZougenNichino(
        buildZougenNichinoQuery({ page: 1 }),
        nSession(),
      );
      expect(p1.total_pages).toBe(2);
      expect(p1.group_count).toBe(2);
      expect(p1.reports).toHaveLength(1);
      expect(p1.reports[0].kanri_shiten_code).toBe('1AA3300001');
      expect(p1.group_page_no).toBe(1);
      expect(p1.group_total_pages).toBe(1);

      const p2 = await service.previewZougenNichino(
        buildZougenNichinoQuery({ page: 2 }),
        nSession(),
      );
      expect(p2.reports).toHaveLength(1);
      expect(p2.reports[0].kanri_shiten_code).toBe('1AA3300002');
      expect(p2.is_last_page).toBe(true);
    });

    it('orders pages by kanri_shiten_code and rows by hanbaiten_code (整列はレスポンス側)', async () => {
      // SQL は同日累計のため dokusya_id, rireki_no 昇順で取得し、帳票の並び（管理支店
      // ページ順・行内順）は groupZougenNichinoReports / paginate 側で再整列する。
      mockNichinoPage([
        buildZougenNichinoRawRow({
          dokusya_id: 9101, kanri_shiten_id: 22, kanri_shiten_code: '1AA3300002',
          hanbaiten_id: 201, hanbaiten_code: '20000000', zenkai_hanbaiten_id: 201,
        }),
        buildZougenNichinoRawRow({
          dokusya_id: 9102, kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001',
          hanbaiten_id: 202, hanbaiten_code: '12345678', zenkai_hanbaiten_id: 202,
        }),
        buildZougenNichinoRawRow({
          dokusya_id: 9103, kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001',
          hanbaiten_id: 203, hanbaiten_code: '10000000', zenkai_hanbaiten_id: 203,
        }),
      ]);

      // ページ1 = 管理支店コード最小（1AA3300001）、行内は販売店コード昇順。
      const p1 = await service.previewZougenNichino(
        buildZougenNichinoQuery({ page: 1 }),
        nSession(),
      );
      expect(p1.reports.map((r) => r.kanri_shiten_code)).toEqual(['1AA3300001']);
      expect(p1.reports[0].rows.map((r) => r.hanbaiten_code)).toEqual(['10000000', '12345678']);
      // ページ2 = 次の管理支店（1AA3300002）。
      const p2 = await service.previewZougenNichino(
        buildZougenNichinoQuery({ page: 2 }),
        nSession(),
      );
      expect(p2.reports.map((r) => r.kanri_shiten_code)).toEqual(['1AA3300002']);
      // SQL 取得順は dokusya_id（累計用）
      expect(
        qbMock.orderBy.mock.calls.some(([col]: any[]) => /dokusya_id/.test(String(col))),
      ).toBe(true);
    });

    // 顧客CR #59108 片岡様フィードバック 2026-08-31: 適用日8/31に砂町で増部したが、
    // 8/30時点で既に有る「木場深川」「日経・深川２」（当日の動きなし）が出力されず
    // 「部数の動きがあった販売店のみ」になっていた。要件定義書どおり、現在部数
    // または新部数がある販売店は動きの有無にかかわらず全て出力する。
    it('shows 販売店 with no change today alongside 販売店 with an actual change, matching the customer sample (砂町/木場深川/日経・深川２)', async () => {
      mockNichinoPageWithBaseline(
        // 当日の増減報告対象行: 砂町のみ増部（現在0→新1）。
        [
          buildZougenNichinoRawRow({
            dokusya_id: 9401,
            hanbaiten_id: 700,
            hanbaiten_code: '3130007000',
            hanbaiten_name: '砂町',
            zenkai_hanbaiten_id: 700,
            dokusya_busu: 1,
            zenkai_dokusya_busu: 0,
          }),
        ],
        // 基礎行（動きなし）: 木場深川・日経・深川２ は8/30時点の部数のまま。
        [
          buildZougenNichinoRawRow({
            dokusya_id: 9402,
            hanbaiten_id: 300,
            hanbaiten_code: '3130001000',
            hanbaiten_name: '木場深川',
            dokusya_busu: 1,
          }),
          buildZougenNichinoRawRow({
            dokusya_id: 9403,
            hanbaiten_id: 301,
            hanbaiten_code: '3130001010',
            hanbaiten_name: '日経・深川2',
            dokusya_busu: 1,
          }),
        ],
      );

      const result = await service.previewZougenNichino(
        buildZougenNichinoQuery({ tekiyo_date: '2026-08-31' }),
        nSession(),
      );

      expect(result.reports).toHaveLength(1);
      const rows = result.reports[0].rows;
      expect(rows).toHaveLength(3);
      const byCode = Object.fromEntries(rows.map((r) => [r.hanbaiten_code, r]));
      // 木場深川・日経・深川2: 動きなし → 現在=新=1、増減0、◆なし。
      expect(byCode['3130001000']).toMatchObject({
        genzai_busu: 1, zou_busu: 0, gen_busu: 0, shin_busu: 1, diff_mark: false,
      });
      expect(byCode['3130001010']).toMatchObject({
        genzai_busu: 1, zou_busu: 0, gen_busu: 0, shin_busu: 1, diff_mark: false,
      });
      // 砂町: 当日の実際の増部 → 現在0/増1/減0/新1、◆あり。
      expect(byCode['3130007000']).toMatchObject({
        genzai_busu: 0, zou_busu: 1, gen_busu: 0, shin_busu: 1, diff_mark: true,
      });
      // 合計（顧客サンプル通り）: 現在2/増1/減0/新3。
      expect(result.reports[0].total).toEqual({
        genzai_busu: 2, zou_busu: 1, gen_busu: 0, shin_busu: 3,
      });
    });

    it('excludes a subscriber already covered by the changed-today query from the baseline query (no double count)', async () => {
      // 同一 dokusya_id が当日の増減対象行にも基礎行にも重複計上されないことを
      // クエリ設計として確認する（nichinoBaselineQuery の NOT EXISTS r3）。
      mockNichinoPageWithBaseline(
        [buildZougenNichinoRawRow({ dokusya_id: 9501, dokusya_busu: 3, zenkai_dokusya_busu: 1 })],
        [], // baseline は当日変更された購読者を含まない前提（NOT EXISTS で除外済み）
      );

      const result = await service.previewZougenNichino(
        buildZougenNichinoQuery({ tekiyo_date: '2026-08-31' }),
        nSession(),
      );

      expect(result.reports[0].rows).toHaveLength(1);
      expect(result.reports[0].rows[0]).toMatchObject({ genzai_busu: 1, zou_busu: 2, shin_busu: 3 });
    });

    it('should bind the joho_henko_tekiyo_date <= tekiyo_date predicate on the baseline query', async () => {
      // nichinoBaselineQuery は当日ちょうどではなく「適用日以下」で有効な履歴を拾う。
      mockNichinoPageWithBaseline([], [buildZougenNichinoRawRow({ dokusya_busu: 1 })]);
      await service.previewZougenNichino(
        buildZougenNichinoQuery({ tekiyo_date: '2026-08-31' }),
        nSession(),
      );

      const call = qbMock.andWhere.mock.calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /joho_henko_tekiyo_date\s*<=\s*:tekiyo_date/.test(sql) &&
          params &&
          Object.values(params).includes('2026-08-31'),
      );
      expect(call).toBeDefined();
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

    /**
     * 顧客要件 2026-08: 集計対象は紙版(1)のみ。増減通知も部数の増減を伝える帳票で、
     * 電子版・併読は配達を伴わないため対象外（ACSMS-SCR-028 増減連絡票と同方針）。
     *
     * 以前は「電子版は承認済(denshi_shonin_status=1)のみ集計」だった。紙版限定は
     * それを包含するので、旧条件は残さず置き換えている。
     */
    it('should extract 紙版 (dokusya_shubetsu = 1) only', async () => {
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /dokusya_shubetsu\s*=/.test(sql),
      );
      expect(call).toBeDefined();
      expect(call[1]).toMatchObject({ paperShubetsu: 1 });
    });

    it('should no longer carry the 電子版承認済 condition (紙版限定が包含する)', async () => {
      // 常に真になる条件を残すと「電子版も入りうる」と誤読させるため。
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const stale = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /denshi_shonin_status\s*=/.test(sql),
      );
      expect(stale).toBeUndefined();
    });

    // 顧客要件2026-08: 増減通知（日本農業新聞）は統廃合フラグの影響を受けない
    // （SCR-028とは別クエリのnichinoBaseQueryを使うため・仕様変更なし）。
    it('should NOT filter by hanbaiten_tohaigo_flg — 増減通知（日本農業新聞）reflects all changes regardless of 販売店統廃合', async () => {
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const call = qbMock.andWhere.mock.calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' && /hanbaiten_tohaigo_flg/.test(sql),
      );
      expect(call).toBeUndefined();
    });

    it('#57976: should NOT exclude 廃店 (haiten_flg) — 増減通知（日本農業新聞）reports subscribers regardless of the current store\'s haiten_flg', async () => {
      // Regression: nichinoBaseQuery previously joined `m_hanbaiten h ON ...
      // AND h.haiten_flg = false`, silently dropping subscribers whose current
      // store had been closed. Unlike SCR-028 (販売店 report, which must not
      // address a report to a closed store), SCR-029 is the report TO 日本農業新聞
      // itself and must include every paper-subscription change regardless of
      // the store's 廃店 status (customer requirement #57976).
      mockNichinoPage([buildZougenNichinoRawRow()]);
      await service.previewZougenNichino(buildZougenNichinoQuery(), nSession());

      const haitenBoundOnJoin = qbMock.innerJoin.mock.calls.some(
        ([table, , cond]: any[]) =>
          table === 'm_hanbaiten' && typeof cond === 'string' && /haiten_flg/.test(cond),
      );
      expect(haitenBoundOnJoin).toBe(false);
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
  // ACSMS-API-029-002 — POST /api/v1/report/zougen-nichino/export
  // S3 アーカイブ（t_file_download）+ 日農担当者へのメール通知のみ。
  // ブラウザへPDFは返さず { empty:false, fileName, recipientCount } を返す。
  // ═══════════════════════════════════════════════════════════════════════
  describe('exportZougenNichinoPdf', () => {
    it('should return { fileName, recipientCount } (NO buffer/contentType) when a 管理支店 matches', async () => {
      // COVERS: 4.8 出力結果はファイル名 + 通知宛先数（PDFはブラウザへ返さない）
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

      const result = await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );

      expect(result.empty).toBe(false);
      // 顧客要件2026-07: 表示名は 増減通知_{JA名}_{JAコード}_{適用日}.pdf（タイムスタンプ無し）。
      expect(result.fileName).toBe('増減通知_JAテスト_1301002001_20260301.pdf');
      expect(result.recipientCount).toBe(3);
      // PDFバッファ・Content-Type はもう返さない。
      expect(result.buffer).toBeUndefined();
      expect(result.contentType).toBeUndefined();
      expect(pdfService.generatePdf).toHaveBeenCalledTimes(1);
    });

    it('should bundle multiple 管理支店 into ONE paginated PDF (preview と同じ改ページ)', async () => {
      // COVERS: 4.8 全管理支店をプレビューと同じ改ページ（15行/ページ）で1つのPDFに
      // まとめる（管理支店ごとのZIPではない）。
      qbMock.getRawMany.mockResolvedValueOnce([
        buildZougenNichinoRawRow({ dokusya_id: 1, kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001' }),
        buildZougenNichinoRawRow({ dokusya_id: 2, kanri_shiten_id: 21, kanri_shiten_code: '1AA3300002' }),
      ]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

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
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
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
          // CHUOKAI(=JA本店系) は管理支店をファイル名に含めない。
          baseName: '増減通知_JAテスト_1301002001_20260301',
          // 表示名(file_name)はタイムスタンプ無し、S3キーは別途タイムスタンプ付き。
          displayName: '増減通知_JAテスト_1301002001_20260301',
          contentType: 'application/pdf',
          extension: '.pdf',
        }),
      );
      // subFolder は付与しない。
      expect(arg.subFolder).toBeUndefined();
    });

    it('should build the filename with 管理支店名/コード when the exporter is JA_KANRI_SHITEN', async () => {
      // 顧客要件2026-07: JA管理支店ロールは自管理支店のみのスコープなので
      // 増減通知_{JA名}_{JAコード}_{管理支店名}_{管理支店コード}_{適用日} とする。
      qbMock.getRawMany.mockResolvedValueOnce([
        buildZougenNichinoRawRow({
          kanri_shiten_name: '本店管理支店',
          kanri_shiten_code: '1AA3300001',
        }),
      ]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        buildJaKanriShitenSession({
          ja_id: 1,
          kanri_shiten_id: 20,
          permissions: ['report.export_zougen_nichino'],
        }),
        req,
      );
      const arg = reportArchive.archive.mock.calls[0][0];
      expect(arg.baseName).toBe(
        '増減通知_JAテスト_1301002001_本店管理支店_1AA3300001_20260301',
      );
    });

    it('should auto-send a notification mail via notifyNichinoExport with 都道府県 + issuer + file/count when export succeeds', async () => {
      // COVERS: 4.5 メール通知（顧客要件2026-07: notifyNichinoExport）
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );

      expect(reportNotification.notifyNichinoExport).toHaveBeenCalledTimes(1);
      const params = reportNotification.notifyNichinoExport.mock.calls[0][0];
      expect(params).toEqual(
        expect.objectContaining({
          tekiyoDate: '2026-03-01',
          fileName: '増減通知_JAテスト_1301002001_20260301.pdf',
          recordCount: 1,
        }),
      );
      // 都道府県名は対象データ（管理支店）の todofuken_name を渡す。
      expect(typeof params.todofukenName).toBe('string');
      expect(params.session).toBeDefined();
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
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

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
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
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
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req);

      const after = auditLog.logOperation.mock.calls
        .map(([a]: any[]) => String(a.afterValue ?? ''))
        .join('');
      expect(after).not.toContain('農業');
      expect(after).not.toContain('神田');
    });

    it('should print the remarks biko into PDF generation when remarks are provided', async () => {
      // COVERS: 4.4 備考（remarks）を帳票に印字
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
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

    it('should render 減部数 with the ▲ minus sign in the PDF (顧客要件2026-07)', async () => {
      // dokusya_busu 7 < zenkai 10 → 減部数 3 → 帳票では「▲3」で表示する。
      qbMock.getRawMany.mockResolvedValueOnce([
        buildZougenNichinoRawRow({ dokusya_busu: 7, zenkai_dokusya_busu: 10 }),
      ]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );
      const calls = JSON.stringify(pdfService.generatePdf.mock.calls);
      expect(calls).toContain('▲3');
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
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      reportArchive.archive.mockRejectedValueOnce(new Error('s3-down'));

      await expect(
        service.exportZougenNichinoPdf(buildZougenNichinoQuery(), nSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should return { empty: true } and NOT generate/archive/mail when no record matches', async () => {
      // COVERS: 4.3 0件 → HTTP 200 + 空配列, ファイル生成しない
      qbMock.getRawMany.mockResolvedValueOnce([]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

      const result = await service.exportZougenNichinoPdf(
        buildZougenNichinoQuery(),
        nSession(),
        req,
      );
      expect(result).toEqual({ empty: true });
      expect(pdfService.generatePdf).not.toHaveBeenCalled();
      expect(reportArchive.archive).not.toHaveBeenCalled();
      expect(reportNotification.notifyNichinoExport).not.toHaveBeenCalled();
      // 0件は操作ログも残さない。
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ACSMS-API-029-003 — POST /api/v1/report/zougen-nichino/export-excel
  // レポートプレビューと同じ内容をExcelで出力する（顧客要件2026-08-26）。PDF出力と
  // 同じくブラウザへは返さず、S3アーカイブ + メール通知のみ行う。
  // ═══════════════════════════════════════════════════════════════════════
  describe('exportZougenNichinoExcel', () => {
    it('should return { fileName, recipientCount } (NO buffer) when a 管理支店 matches', async () => {
      reportArchive.archive.mockResolvedValueOnce({
        key: 'reports/zougen-nichino/1301002001/2026/増減通知_JAテスト_1301002001_20260301_20260301120000.xlsx',
        filename: '増減通知_JAテスト_1301002001_20260301.xlsx',
        fileDownloadId: 88,
      });
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

      const result = await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );

      expect(result.empty).toBe(false);
      expect(result.fileName).toBe('増減通知_JAテスト_1301002001_20260301.xlsx');
      expect(result.recipientCount).toBe(3);
      expect((result as any).buffer).toBeUndefined();
    });

    it('should build an Excel sheet mirroring the PDF layout: title, 明細見出し, 委託/販売店コード/販売店名/現在部数/増部数/減部数/新部数', async () => {
      // COVERS: 顧客要件2026-08-26「実際の報告書フォーマットに近い」プレビュー内容
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

      await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );

      const buffer = reportArchive.archive.mock.calls[0][0].buffer;
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as never);
      const ws = wb.worksheets[0];
      const text = ws
        .getSheetValues()
        .flat()
        .filter((v): v is string => typeof v === 'string')
        .join('\n');
      expect(text).toContain('日本農業新聞増減通知');
      expect(text).toContain('委託');
      expect(text).toContain('販売店コード');
      expect(text).toContain('販売店名');
      expect(text).toContain('現在部数');
      expect(text).toContain('増部数');
      expect(text).toContain('減部数');
      expect(text).toContain('新部数');
      expect(text).toContain('合計');
      expect(text).toContain('ページ数：1/1');
    });

    it('should print the remarks biko into the Excel when remarks are provided', async () => {
      // COVERS: 備考（remarks）を帳票に印字（PDF export と同じ）
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery({
          remarks: [buildZougenNichinoRemark({ kanri_shiten_id: 20, biko: '3月度分の増減通知です。' })],
        }),
        nSession(),
        req,
      );

      const buffer = reportArchive.archive.mock.calls[0][0].buffer;
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as never);
      const text = wb.worksheets[0]
        .getSheetValues()
        .flat()
        .filter((v): v is string => typeof v === 'string')
        .join('\n');
      expect(text).toContain('3月度分の増減通知です。');
    });

    it('should render 減部数 with the ▲ minus sign in the Excel (顧客要件2026-07と同じ表示規約)', async () => {
      qbMock.getRawMany.mockResolvedValueOnce([
        buildZougenNichinoRawRow({ dokusya_busu: 7, zenkai_dokusya_busu: 10 }),
      ]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );

      const buffer = reportArchive.archive.mock.calls[0][0].buffer;
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as never);
      const text = wb.worksheets[0]
        .getSheetValues()
        .flat()
        .filter((v): v is string => typeof v === 'string')
        .join('\n');
      expect(text).toContain('▲3');
    });

    it('should bundle multiple 管理支店 into ONE paginated Excel (preview/PDF と同じ改ページ)', async () => {
      qbMock.getRawMany.mockResolvedValueOnce([
        buildZougenNichinoRawRow({ dokusya_id: 1, kanri_shiten_id: 20, kanri_shiten_code: '1AA3300001' }),
        buildZougenNichinoRawRow({ dokusya_id: 2, kanri_shiten_id: 21, kanri_shiten_code: '1AA3300002' }),
      ]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

      const result = await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery({ kanri_shiten_id: [20, 21] }),
        nSession(),
        req,
      );
      expect(reportArchive.archive).toHaveBeenCalledTimes(1); // 1つのExcelのみ生成
      expect(result.empty).toBe(false);
    });

    it('should archive the Excel to S3 via FileArchiveService with category=zougen-nichino (no subFolder)', async () => {
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoExcel(
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
          baseName: '増減通知_JAテスト_1301002001_20260301',
          displayName: '増減通知_JAテスト_1301002001_20260301',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extension: '.xlsx',
          nichinoDownloadAllowedFlg: true,
        }),
      );
      expect(arg.subFolder).toBeUndefined();
    });

    it('should build the filename with 管理支店名/コード when the exporter is JA_KANRI_SHITEN', async () => {
      qbMock.getRawMany.mockResolvedValueOnce([
        buildZougenNichinoRawRow({
          kanri_shiten_name: '本店管理支店',
          kanri_shiten_code: '1AA3300001',
        }),
      ]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        buildJaKanriShitenSession({
          ja_id: 1,
          kanri_shiten_id: 20,
          permissions: ['report.export_zougen_nichino'],
        }),
        req,
      );
      const arg = reportArchive.archive.mock.calls[0][0];
      expect(arg.baseName).toBe(
        '増減通知_JAテスト_1301002001_本店管理支店_1AA3300001_20260301',
      );
    });

    it('should auto-send a notification mail via notifyNichinoExport when export succeeds', async () => {
      reportArchive.archive.mockResolvedValueOnce({
        key: 'reports/zougen-nichino/1301002001/2026/増減通知_JAテスト_1301002001_20260301_20260301120000.xlsx',
        filename: '増減通知_JAテスト_1301002001_20260301.xlsx',
        fileDownloadId: 88,
      });
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );

      expect(reportNotification.notifyNichinoExport).toHaveBeenCalledTimes(1);
      const params = reportNotification.notifyNichinoExport.mock.calls[0][0];
      expect(params).toEqual(
        expect.objectContaining({
          tekiyoDate: '2026-03-01',
          fileName: '増減通知_JAテスト_1301002001_20260301.xlsx',
          recordCount: 1,
        }),
      );
    });

    it('should still succeed (S3 + audit) when no ReportNotificationService is injected — recipientCount=0', async () => {
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
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

      const result = await svc.exportZougenNichinoExcel(
        buildZougenNichinoQuery(),
        nSession(),
        req,
      );
      expect(result.empty).toBe(false);
      expect(result.recipientCount).toBe(0);
      expect(reportArchive.archive).toHaveBeenCalledTimes(1);
    });

    it('should write an operation log with EXPORT_EXCEL + result_status success, targetTable t_file_download', async () => {
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoExcel(buildZougenNichinoQuery(), nSession({ account_id: 12 }), req);

      const successCall = auditLog.logOperation.mock.calls
        .map(([a]: any[]) => a)
        .find((a: any) => a.operation === 'EXPORT_EXCEL' && a.resultStatus === 1);
      expect(successCall).toEqual(
        expect.objectContaining({
          logType: 1,
          operation: 'EXPORT_EXCEL',
          resultStatus: 1,
          targetTable: 't_file_download',
        }),
      );
    });

    it('should NOT log personal data (氏名/住所) in the operation log after_value', async () => {
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      await service.exportZougenNichinoExcel(buildZougenNichinoQuery(), nSession(), req);

      const after = auditLog.logOperation.mock.calls
        .map(([a]: any[]) => String(a.afterValue ?? ''))
        .join('');
      expect(after).not.toContain('農業');
      expect(after).not.toContain('神田');
    });

    it('should emit an error log (log_type=3) when export fails', async () => {
      qbMock.getRawMany.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportZougenNichinoExcel(buildZougenNichinoQuery(), nSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
      const lastCall = auditLog.logError.mock.calls[0];
      expect(lastCall[1]).toBe('EXPORT_EXCEL');
    });

    it('should propagate the error (no swallow) when the S3 archive fails', async () => {
      qbMock.getRawMany.mockResolvedValueOnce([buildZougenNichinoRawRow()]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）
      reportArchive.archive.mockRejectedValueOnce(new Error('s3-down'));

      await expect(
        service.exportZougenNichinoExcel(buildZougenNichinoQuery(), nSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should return { empty: true } and NOT generate/archive/mail when no record matches', async () => {
      qbMock.getRawMany.mockResolvedValueOnce([]);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

      const result = await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery(),
        nSession(),
        req,
      );
      expect(result).toEqual({ empty: true });
      expect(reportArchive.archive).not.toHaveBeenCalled();
      expect(reportNotification.notifyNichinoExport).not.toHaveBeenCalled();
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });

    it('should build a production-scale Excel (2,000 購読者 across 100 管理支店) in well under a second, WITHOUT any mergeCells call (regression: SCR-028 mergeCells O(n²) hung the whole backend for 2+ minutes on real data)', async () => {
      // COVERS: zougen-hanbaiten Excel export で実際に発生した障害の再発防止。
      // このExcel builderは最初からセル結合を一切使わない設計にしたため、大量ページ
      // でも高速であることを実測で担保する。
      const rows = Array.from({ length: 2000 }, (_, i) =>
        buildZougenNichinoRawRow({
          dokusya_id: 40000 + i,
          dokusya_rireki_id: 41000 + i,
          kanri_shiten_id: 20 + (i % 100),
          kanri_shiten_code: `1AA${String(3300001 + (i % 100)).padStart(7, '0')}`,
          hanbaiten_id: 200 + (i % 100),
          hanbaiten_code: String(10000000 + i).slice(0, 8),
          hanbaiten_name: `販売店${i}`,
          dokusya_busu: 7,
          zenkai_dokusya_busu: 10,
        }),
      );
      qbMock.getRawMany.mockResolvedValueOnce(rows);
      qbMock.getRawMany.mockResolvedValue([]); // nichinoBaselineQuery（動きの無い既存購読者。既定は空 — 個別テストは mockNichinoPageWithBaseline を使用）

      const start = Date.now();
      const result = await service.exportZougenNichinoExcel(
        buildZougenNichinoQuery({ tekiyo_date: '2026-03-01' }),
        nSession(),
        req,
      );
      const elapsedMs = Date.now() - start;

      expect(result.empty).toBe(false);
      expect(elapsedMs).toBeLessThan(2000);

      const buffer = reportArchive.archive.mock.calls[0][0].buffer;
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as never);
      expect(wb.worksheets[0].model.merges ?? []).toHaveLength(0);
    });
  });
});

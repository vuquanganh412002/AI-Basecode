// Screen: ACSMS-SCR-021 — 配達手数料支払情報出力画面
//
// HaitatsuryoService unit specs for:
//   - previewHaitatsuryo(query, session)        — API-021-001 (GET preview)
//   - exportHaitatsuryoExcel(body, session, req) — API-021-002 (POST Excel export)
//
// Pattern: plain `new HaitatsuryoService(...)` with mocked deps. The 集計 is a
// raw aggregation via dataSource.query() (CTE + DISTINCT ON latest snapshot); the
// 税区分 (m_ja.zei_kubun) is fetched via jaRepo.findOne. Each it() maps back to a
// clause in docs/design/ACSMS-SCR-021/ACSMS-SCR-021-api.md.

import { HaitatsuryoService } from '@/modules/haitatsuryo/haitatsuryo.service';
import {
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';
import {
  buildHaitatsuryoQuery,
  buildHaitatsuryoAggRow,
} from '@test/fixtures/haitatsuryo.factory';

describe('HaitatsuryoService', () => {
  let service: HaitatsuryoService;
  let jaRepo: any;
  let dataSource: any;
  let txManager: any;
  let auditLog: any;
  let storage: any;

  const req = { ip: '192.0.2.60', headers: { 'user-agent': 'jest' } } as any;

  // JA-scoped session holding haitatsuryo.export.
  const hSession = (overrides = {}) =>
    buildChuokaiSession({
      ja_id: 1,
      permissions: ['haitatsuryo.export'],
      ...overrides,
    });

  /** Make dataSource.query return aggRows for the aggregation call. */
  function mockAgg(rows: any[]) {
    dataSource.query.mockResolvedValue(rows);
  }

  beforeEach(() => {
    jaRepo = { findOne: jest.fn().mockResolvedValue({ zeiKubun: 1 }) };
    txManager = {
      create: jest.fn((_e: any, v: any) => ({ ...v })),
      save: jest.fn(async (_e: any, v: any) => ({ fileDownloadId: 5, ...(v ?? _e) })),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([buildHaitatsuryoAggRow()]),
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };

    // constructor(jaRepo, dataSource, auditLog, storage)
    service = new HaitatsuryoService(jaRepo, dataSource, auditLog, storage);
  });

  afterEach(() => jest.restoreAllMocks());

  // ═══════════════════════════════════════════════════════════════════════
  // API-021-001 — GET /api/v1/haitatsuryo/preview
  // ═══════════════════════════════════════════════════════════════════════
  describe('previewHaitatsuryo', () => {
    it('should map every aggregated 販売店 field into data[] when rows exist', async () => {
      // COVERS: 4.5 レスポンスデータ — data[] full shape
      mockAgg([buildHaitatsuryoAggRow()]);

      const result = await service.previewHaitatsuryo(buildHaitatsuryoQuery(), hSession());

      expect(result.data).toHaveLength(1);
      const row = result.data[0];
      expect(row.target_month).toBe('202604');
      expect(row.hanbaiten_id).toBe(101);
      expect(row.hanbaiten_code).toBe('H001');
      expect(row.hanbaiten_name).toBe('東京中央販売店');
      expect(row.total_busu).toBe(120);
      expect(row.total_kingaku).toBe(588000);
      expect(row.haitatsuryo_shiharai_cycle).toBe(3);
      expect(row.bank_code).toBe('0001');
      expect(row.bank_name).toBe('みずほ銀行');
      expect(row.bank_branch_code).toBe('001');
      expect(row.bank_branch_name).toBe('本店');
      expect(row.yokin_shubetsu).toBe(1);
      expect(row.koza_no).toBe('1234567');
      expect(row.koza_meigi).toBe('ﾄｳｷｮｳﾁｭｳｵｳﾊﾝﾊﾞｲﾃﾝ');
      // 手数料（配達手数料単価、1部）: 588000 ÷ 120 = 4900
      expect(row.tesuryo).toBe(4900);
      expect(row.biko).toBe('');
    });

    it('should compute meta.total / grand_total_busu / grand_total_kingaku from the rows', async () => {
      // COVERS: 4.5 meta 集計サマリ
      mockAgg([
        buildHaitatsuryoAggRow({ hanbaiten_id: 101, total_busu: 120, total_kingaku: 588000 }),
        buildHaitatsuryoAggRow({ hanbaiten_id: 102, total_busu: 80, total_kingaku: 392000 }),
      ]);

      const result = await service.previewHaitatsuryo(buildHaitatsuryoQuery(), hSession());

      expect(result.meta.total).toBe(2);
      expect(result.meta.grand_total_busu).toBe(200);
      expect(result.meta.grand_total_kingaku).toBe(980000);
      // ページネーション既定値（page=1, per_page=20）。
      expect(result.meta.page).toBe(1);
      expect(result.meta.per_page).toBe(20);
      expect(result.meta.total_pages).toBe(1);
    });

    it('should slice data to the requested page while keeping meta totals over all rows', async () => {
      // COVERS: ページネーション（preview）— per_page=1, page=2 で2件目のみ返す。
      // grand_total_* と total は全件通算（ページ非依存）。
      mockAgg([
        buildHaitatsuryoAggRow({ hanbaiten_id: 101, hanbaiten_code: 'H001', total_busu: 120, total_kingaku: 588000 }),
        buildHaitatsuryoAggRow({ hanbaiten_id: 102, hanbaiten_code: 'H002', total_busu: 80, total_kingaku: 392000 }),
      ]);

      const result = await service.previewHaitatsuryo(
        buildHaitatsuryoQuery({ page: 2, per_page: 1 }),
        hSession(),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].hanbaiten_code).toBe('H002');
      expect(result.meta.total).toBe(2); // 全件数（ページ非依存）
      expect(result.meta.page).toBe(2);
      expect(result.meta.per_page).toBe(1);
      expect(result.meta.total_pages).toBe(2);
      expect(result.meta.grand_total_busu).toBe(200); // 全件通算
      expect(result.meta.grand_total_kingaku).toBe(980000);
    });

    it('should fetch zei_kubun from m_ja and reflect it in meta.zei_kubun when previewing', async () => {
      // COVERS: 4.3 税区分の取得（m_ja）
      jaRepo.findOne.mockResolvedValue({ zeiKubun: 1 });
      mockAgg([buildHaitatsuryoAggRow()]);

      const result = await service.previewHaitatsuryo(buildHaitatsuryoQuery(), hSession({ ja_id: 9 }));

      expect(jaRepo.findOne).toHaveBeenCalled();
      const arg = jaRepo.findOne.mock.calls[0][0];
      expect(JSON.stringify(arg)).toContain('9'); // ja_id bound to the m_ja lookup
      expect(result.meta.zei_kubun).toBe(1);
    });

    it('should pass zei_kubun=2 (外税) into the aggregation when m_ja.zei_kubun is 2', async () => {
      // COVERS: 4.3 外税 → kingaku_zeinuki 切替（パラメータで渡す）
      jaRepo.findOne.mockResolvedValue({ zeiKubun: 2 });
      mockAgg([buildHaitatsuryoAggRow()]);

      const result = await service.previewHaitatsuryo(
        buildHaitatsuryoQuery({ haitatsuryo_shiharai_cycle: undefined }),
        hSession({ ja_id: 7 }),
      );

      expect(result.meta.zei_kubun).toBe(2);
      const aggCall = dataSource.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /GROUP BY|t_dokusya|latest_dokusya/i.test(sql),
      );
      expect(aggCall).toBeDefined();
      expect(aggCall[1]).toContain(2); // zei_kubun param
    });

    it('should pass the haitatsuryo_shiharai_cycle filter into the aggregation when provided', async () => {
      // COVERS: 4.4 配達手数料支払サイクルで絞込
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.previewHaitatsuryo(buildHaitatsuryoQuery({ haitatsuryo_shiharai_cycle: 6 }), hSession());

      const aggCall = dataSource.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /GROUP BY|t_dokusya|latest_dokusya/i.test(sql),
      );
      expect(aggCall).toBeDefined();
      expect(aggCall[1]).toContain(6);
    });

    it('should bind the ja_id scope param when session role_code is CHUOKAI', async () => {
      // COVERS: 4.2 DataScope — CHUOKAI: d.ja_id = :user_ja_id
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.previewHaitatsuryo(buildHaitatsuryoQuery(), hSession({ ja_id: 7 }));

      const aggCall = dataSource.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ja_id/i.test(sql),
      );
      expect(aggCall).toBeDefined();
      expect(aggCall[1]).toContain(7);
    });

    it('should bind the ja_id scope param when session role_code is JA_HONTEN', async () => {
      // COVERS: 4.2 DataScope — JA_HONTEN: d.ja_id = :user_ja_id
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.previewHaitatsuryo(
        buildHaitatsuryoQuery(),
        buildJaHontenSession({ ja_id: 8, permissions: ['haitatsuryo.export'] }),
      );

      const aggCall = dataSource.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /ja_id/i.test(sql),
      );
      expect(aggCall).toBeDefined();
      expect(aggCall[1]).toContain(8);
    });

    it('should bind the kanri_shiten_id scope param when session role_code is JA_KANRI_SHITEN', async () => {
      // COVERS: 4.2 DataScope — JA_KANRI_SHITEN: + d.kanri_shiten_id = :user_kanri_shiten_id
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.previewHaitatsuryo(
        buildHaitatsuryoQuery(),
        buildJaKanriShitenSession({
          ja_id: 8,
          kanri_shiten_id: 33,
          permissions: ['haitatsuryo.export'],
        }),
      );

      const aggCall = dataSource.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_shiten_id/i.test(sql),
      );
      expect(aggCall).toBeDefined();
      expect(aggCall[1]).toContain(33);
    });

    it('should return empty data + meta.total=0 (NOT 404) when the aggregation returns 0 rows', async () => {
      // COVERS: 4.4 0件 → HTTP 200 + data:[]（業務エラーではない）
      mockAgg([]);

      const result = await service.previewHaitatsuryo(buildHaitatsuryoQuery(), hSession());
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.grand_total_busu).toBe(0);
      expect(result.meta.grand_total_kingaku).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // API-021-002 — POST /api/v1/haitatsuryo/export (Excel)
  // ═══════════════════════════════════════════════════════════════════════
  describe('exportHaitatsuryoExcel', () => {
    it('should return an Excel buffer + 配達手数料支払情報出力_{YYYY年MM月}.xlsx filename when data exists', async () => {
      // COVERS: 4.7 レスポンス生成 — ファイル名
      mockAgg([buildHaitatsuryoAggRow()]);

      const result = await service.exportHaitatsuryoExcel(
        buildHaitatsuryoQuery({ target_month: '2026-04-01' }),
        hSession(),
        req,
      );

      // 判別共用体（{empty:true} | {empty:false, buffer, ...}）なので
      // 直接 result.buffer ではなく objectContaining で検証する。
      expect(result).toEqual(
        expect.objectContaining({
          empty: false,
          buffer: expect.any(Buffer),
          filename: '配達手数料支払情報出力_2026年04月.xlsx',
        }),
      );
    });

    it('should upload the generated Excel to S3 when export succeeds', async () => {
      // COVERS: 4.4 S3 保存
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.exportHaitatsuryoExcel(buildHaitatsuryoQuery(), hSession(), req);
      expect(storage.upload).toHaveBeenCalledTimes(1);
    });

    it('should record a t_file_download row with download_type=2 when export succeeds', async () => {
      // COVERS: 4.5 t_file_download 登録 — download_type=2
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.exportHaitatsuryoExcel(buildHaitatsuryoQuery(), hSession(), req);

      const saved =
        (txManager.create.mock.calls[0]?.[1] as any) ??
        (txManager.save.mock.calls[0]?.[1] as any);
      expect(saved.downloadType ?? saved.download_type).toBe(2);
    });

    it('should wrap t_file_download + operation log in a single dataSource.transaction', async () => {
      // COVERS: 4.5/4.6 単一トランザクション
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.exportHaitatsuryoExcel(buildHaitatsuryoQuery(), hSession(), req);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should write an operation log with log_type=4 + CREATE + result_status success when export succeeds', async () => {
      // COVERS: 4.6 操作ログ — log_type=4, operation 'CREATE', result_status 1
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.exportHaitatsuryoExcel(buildHaitatsuryoQuery(), hSession({ account_id: 11 }), req);

      expect(auditLog.logOperation).toHaveBeenCalled();
      const args = auditLog.logOperation.mock.calls[0][0];
      expect(args).toEqual(
        expect.objectContaining({
          logType: 4,
          operation: 'CREATE',
          resultStatus: 1,
          targetTable: 't_file_download',
        }),
      );
    });

    it('should record the export conditions + counts (file_name) in the operation log after_value', async () => {
      // COVERS: 4.6 after_value — 出力条件と件数の JSON
      mockAgg([buildHaitatsuryoAggRow()]);
      await service.exportHaitatsuryoExcel(buildHaitatsuryoQuery(), hSession(), req);

      const args = auditLog.logOperation.mock.calls[0][0];
      const after = String(args.afterValue ?? '');
      expect(after).toContain('record_count');
      expect(after).toContain('haitatsuryo_shiharai');
    });

    it('should return { empty: true } and NOT generate an Excel / upload when 0 rows match', async () => {
      // COVERS: 4.3 0件 → HTTP 200 + 空配列, Excel 出力 / S3 保存 / DB 登録は実行しない
      mockAgg([]);

      const result = await service.exportHaitatsuryoExcel(
        buildHaitatsuryoQuery(),
        hSession(),
        req,
      );
      expect(result).toEqual({ empty: true });
      expect(storage.upload).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });

    it('should rollback (t_file_download + operation log share the tx) when the audit log fails', async () => {
      // COVERS: tx rollback — business write + audit log atomic
      mockAgg([buildHaitatsuryoAggRow()]);
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit-down'));

      await expect(
        service.exportHaitatsuryoExcel(buildHaitatsuryoQuery(), hSession(), req),
      ).rejects.toBeDefined();
    });

    it('should emit an error log (log_type=3) OUTSIDE the transaction when export fails', async () => {
      // COVERS: 4.8 エラーログはトランザクション外（log_type=3, result_status=2）
      dataSource.query.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportHaitatsuryoExcel(buildHaitatsuryoQuery(), hSession(), req),
      ).rejects.toBeDefined();
      expect(auditLog.logError).toHaveBeenCalled();
    });

  });
});

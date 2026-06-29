// Screen: ACSMS-SCR-020 — 口座振替データ出力画面
//
// KozaFurikaeService unit specs for:
//   - getInitialData(session)            — API-020-001 (GET initial data)
//   - exportCsv(body, session, req)      — API-020-002 (POST Zengin CSV export)
//
// Pattern: plain `new KozaFurikaeService(...)` with mocked deps (mirrors
// HaitatsuryoService). The export 集計 is a raw aggregation via
// dataSource.query(); the common ReportArchiveService stores the CSV to S3 and
// registers t_file_upload BEFORE a single transaction that updates m_ja /
// m_shiten, snapshots t_koza_furikae and writes the audit log. Error log
// (log_type=3) is emitted OUTSIDE the rolled-back tx.
// Each it() maps back to a clause in docs/design/ACSMS-SCR-020/ACSMS-SCR-020-api.md.

import { KozaFurikaeService } from '@/modules/koza-furikae/koza-furikae.service';
import {
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';
import {
  buildExportKozaFurikaeQuery,
  buildKozaFurikaeAggRow,
  buildJaJastemRow,
  buildShitenJastemRow,
} from '@test/fixtures/koza-furikae.factory';

describe('KozaFurikaeService', () => {
  let service: KozaFurikaeService;
  let jaRepo: any;
  let shitenRepo: any;
  let dataSource: any;
  let txManager: any;
  let auditLog: any;
  let reportArchive: any;

  const req = { ip: '192.0.2.70', headers: { 'user-agent': 'jest' } } as any;

  // JA-scoped session holding koza_furikae.export.
  const kSession = (overrides = {}) =>
    buildChuokaiSession({
      ja_id: 1,
      permissions: ['koza_furikae.export'],
      ...overrides,
    });

  beforeEach(() => {
    jaRepo = {
      findOne: jest.fn().mockResolvedValue(buildJaJastemRow()),
    };
    shitenRepo = {
      findOne: jest.fn().mockResolvedValue(buildShitenJastemRow()),
    };
    txManager = {
      create: jest.fn((_e: any, v: any) => ({ ...v })),
      save: jest.fn(async (_e: any, v: any) => ({ fileDownloadId: 5, ...(v ?? _e) })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      query: jest.fn().mockResolvedValue([{ file_download_id: 5 }]),
    };
    dataSource = {
      // default: aggregation returns 2 購読者 rows.
      query: jest.fn().mockResolvedValue([
        buildKozaFurikaeAggRow({ dokusya_id: 1, furikae_kingaku: 4900 }),
        buildKozaFurikaeAggRow({ dokusya_id: 2, koza_meigi: 'ｽｽﾞｷ ﾊﾅｺ', furikae_kingaku: 4900 }),
      ]),
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    // 共通 S3 アーカイブ + t_file_upload 登録（ReportModule から再利用）。
    reportArchive = {
      resolveJa: jest.fn().mockResolvedValue({ code: 'JA001', name: '' }),
      archive: jest.fn().mockResolvedValue({
        key: 'koza-furikae/JA001/2026/口座振替データ_JA001_2026年05月27日_20260522103000.csv',
        filename: '口座振替データ_JA001_2026年05月27日_20260522103000.csv',
        fileUploadId: 7,
      }),
    };

    // constructor(jaRepo, shitenRepo, dataSource, auditLog, reportArchive)
    service = new KozaFurikaeService(jaRepo, shitenRepo, dataSource, auditLog, reportArchive);
  });

  afterEach(() => jest.restoreAllMocks());

  // ═══════════════════════════════════════════════════════════════════════
  // API-020-001 — GET /api/v1/koza-furikae/initial
  // ═══════════════════════════════════════════════════════════════════════
  describe('getInitialData', () => {
    it('should map m_ja JASTEM 委託者 fields into data when the JA exists', async () => {
      // COVERS: 4.3 m_ja 取得 + 4.4 レスポンス生成
      const result = await service.getInitialData(kSession({ ja_id: 1 }));

      expect(result.data.ja_id).toBe(1);
      expect(result.data.jastem_itakusha_code).toBe('1234567890');
      expect(result.data.jastem_itakusha_name).toBe('ニホンノウギョウシンブン');
      expect(result.data.jastem_ja_code).toBe('1234');
      expect(result.data.jastem_ja_name).toBe('ニホンノウギョウ');
    });

    it('should map the last-used m_shiten JASTEM fields into data when a 金融機関支店 exists', async () => {
      // COVERS: 4.3 m_shiten (kinyu_shiten_flg=TRUE) 最終使用 取得
      const result = await service.getInitialData(kSession());

      expect(result.data.jastem_toriatsukai_tenpo_code).toBe('001');
      expect(result.data.jastem_tenpo_name).toBe('ホンテン');
      expect(result.data.jastem_tyokin_shubetsu).toBe('1');
      expect(result.data.jastem_koza_no).toBe('1234567');
    });

    it('should scope the m_ja lookup to the session ja_id when fetching initial data', async () => {
      // COVERS: 4.2 DataScope ja_id = user.ja_id
      await service.getInitialData(kSession({ ja_id: 9 }));

      const arg = jaRepo.findOne.mock.calls[0][0];
      expect(JSON.stringify(arg)).toContain('9');
    });

    it('should return empty 金融機関支店 fields with 貯金種目 "1" when no m_shiten is found', async () => {
      // COVERS: 4.4 金融機関支店レコードが無い場合 → 空文字 + 貯金種目 "1"
      shitenRepo.findOne.mockResolvedValue(null);

      const result = await service.getInitialData(kSession());

      expect(result.data.jastem_toriatsukai_tenpo_code).toBe('');
      expect(result.data.jastem_tenpo_name).toBe('');
      expect(result.data.jastem_koza_no).toBe('');
      expect(result.data.jastem_tyokin_shubetsu).toBe('1');
    });

    it('should query m_shiten with kinyu_shiten_flg=TRUE when fetching the last-used 金融機関支店', async () => {
      // COVERS: 4.3 WHERE kinyu_shiten_flg = TRUE
      await service.getInitialData(kSession());

      expect(shitenRepo.findOne).toHaveBeenCalled();
      const arg = shitenRepo.findOne.mock.calls[0][0];
      expect(JSON.stringify(arg)).toMatch(/kinyuShitenFlg|kinyu_shiten_flg/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // API-020-002 — POST /api/v1/koza-furikae/export
  // ═══════════════════════════════════════════════════════════════════════
  describe('exportCsv', () => {
    it('should return a Buffer + 口座振替データ_{ja_code}_{YYYY年MM月DD日}.csv filename + ASCII fallback + record count when データ exists', async () => {
      // COVERS: 4.4 CSV生成 + 4.9 レスポンス生成（ファイル名は ja_code + 引落日）
      const result = await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);

      expect(result).toEqual(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          // ダウンロード名はタイムスタンプ無し（hikiotoshi_date=2026-05-27）。
          filename: '口座振替データ_JA001_2026年05月27日.csv',
          asciiFilename: 'koza_furikae_20260527.csv',
          recordCount: 2,
        }),
      );
    });

    it('should archive the CSV via ReportArchiveService with category koza-furikae, empty rootPrefix and .csv extension', async () => {
      // COVERS: 4.4 共通S3アーカイブ（reports/ なし）+ t_file_upload 登録
      await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);

      expect(reportArchive.archive).toHaveBeenCalledTimes(1);
      expect(reportArchive.archive).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'koza-furikae',
          rootPrefix: '',
          year: '2026',
          baseName: '口座振替データ_JA001_2026年05月27日',
          extension: '.csv',
          contentType: 'text/csv; charset=Shift_JIS',
          recordCount: 2,
        }),
      );
    });

    it('should throw NO_TARGET_DATA when the aggregation returns 0 rows', async () => {
      // COVERS: 4.3 取得件数 0 → HTTP 404 (NO_TARGET_DATA)
      dataSource.query.mockResolvedValue([]);

      await expect(
        service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req),
      ).rejects.toMatchObject({ response: { error_code: 'NO_TARGET_DATA' } });
    });

    it('should NOT archive to S3 nor open a transaction when 0 rows are aggregated', async () => {
      // COVERS: 4.3 0件は CSV生成 / S3 / DB を行わない
      dataSource.query.mockResolvedValue([]);

      await expect(
        service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req),
      ).rejects.toBeDefined();

      expect(reportArchive.archive).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should archive the generated CSV to S3 before opening the DB transaction', async () => {
      // COVERS: 4.4 S3保存はトランザクション外で先に実行する
      const order: string[] = [];
      reportArchive.archive.mockImplementation(async () => {
        order.push('s3');
        return {
          key: 'koza-furikae/JA001/2026/口座振替データ_JA001_2026年05月27日_20260522103000.csv',
          filename: '口座振替データ_JA001_2026年05月27日_20260522103000.csv',
          fileUploadId: 7,
        };
      });
      dataSource.transaction.mockImplementation(async (cb: any) => {
        order.push('tx');
        return cb(txManager);
      });

      await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);

      expect(reportArchive.archive).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['s3', 'tx']);
    });

    it('should return HTTP 500 path (rethrow) and NOT open a transaction when the S3 archive fails', async () => {
      // COVERS: 4.4 S3アップロード失敗時はDB処理を行わない → 500
      reportArchive.archive.mockRejectedValue(new Error('s3-down'));

      await expect(
        service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req),
      ).rejects.toThrow();

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should perform the m_ja / m_shiten update + t_koza_furikae + 操作ログ inside a single transaction', async () => {
      // COVERS: 4.5〜4.8 単一トランザクション
      await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      // 監査ログはトランザクションの manager を受け取る（最終引数）。
      expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
      const managerArg = auditLog.logOperation.mock.calls[0][1];
      expect(managerArg).toBe(txManager);
    });

    it('should record the 操作ログ with log_type=1, operation CREATE, result_status=1 on success', async () => {
      // COVERS: 4.8 操作ログ記録
      await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);

      const params = auditLog.logOperation.mock.calls[0][0];
      expect(params.logType).toBe(1);
      expect(params.operation).toBe('CREATE');
      expect(params.resultStatus).toBe(1);
      expect(params.targetTable).toBe('t_file_upload');
    });

    it('should mask jastem_koza_no in the audit after_value when recording the 操作ログ', async () => {
      // COVERS: 4.8 機密情報（口座番号）はマスクすること
      await service.exportCsv(
        buildExportKozaFurikaeQuery({ jastem_koza_no: '7777777' }),
        kSession(),
        req,
      );

      const params = auditLog.logOperation.mock.calls[0][0];
      const afterStr =
        typeof params.afterValue === 'string'
          ? params.afterValue
          : JSON.stringify(params.afterValue);
      expect(afterStr).not.toContain('7777777');
      expect(afterStr).toContain('*');
    });

    it('should emit an error audit log (log_type=3) OUTSIDE the transaction when the transaction fails', async () => {
      // COVERS: 4.10 例外時 log_type=3 をトランザクション外で記録 + 再スロー
      dataSource.transaction.mockRejectedValue(new Error('db-down'));

      await expect(
        service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req),
      ).rejects.toThrow();

      expect(auditLog.logError).toHaveBeenCalledTimes(1);
      // logError(ctx, operation, err) — 末尾は Error（manager ではない）。
      // ロールバック後の独立接続で残すため tx の manager を渡さないことを担保。
      const lastArg = auditLog.logError.mock.calls[0].at(-1);
      expect(lastArg).toBeInstanceOf(Error);
    });

    it('should roll back (audit log failure aborts the whole export) when logOperation rejects', async () => {
      // COVERS: 4.5〜4.8 監査ログ失敗時は業務書き込みもロールバックされる
      auditLog.logOperation.mockRejectedValue(new Error('audit-down'));

      await expect(
        service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req),
      ).rejects.toThrow();

      // 監査失敗はトランザクション内なのでロールバック後 log_type=3 が残る。
      expect(auditLog.logError).toHaveBeenCalledTimes(1);
    });

    it('should bind ja_id into the aggregation params when the session role is CHUOKAI', async () => {
      // COVERS: 4.2 DataScope ja_id = user.ja_id
      await service.exportCsv(buildExportKozaFurikaeQuery(), kSession({ ja_id: 7 }), req);

      const aggCall = dataSource.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /t_dokusya|FROM t_dokusya/i.test(sql),
      );
      expect(aggCall).toBeDefined();
      expect(aggCall[1]).toContain(7);
    });

    it('should additionally bind kanri_shiten_id into the aggregation params when the session role is JA_KANRI_SHITEN', async () => {
      // COVERS: 4.2 DataScope JA_KANRI_SHITEN は kanri_shiten_id も絞込
      await service.exportCsv(
        buildExportKozaFurikaeQuery(),
        buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 3, permissions: ['koza_furikae.export'] }),
        req,
      );

      const aggCall = dataSource.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /t_dokusya/i.test(sql),
      );
      expect(aggCall).toBeDefined();
      expect(aggCall[1]).toContain(3);
    });

    it('should export for a JA_HONTEN session scoped to its own ja_id', async () => {
      // COVERS: 4.2 JA_HONTEN は ja_id = user.ja_id
      const result = await service.exportCsv(
        buildExportKozaFurikaeQuery(),
        buildJaHontenSession({ ja_id: 1, permissions: ['koza_furikae.export'] }),
        req,
      );

      expect(result.recordCount).toBe(2);
    });
  });
});

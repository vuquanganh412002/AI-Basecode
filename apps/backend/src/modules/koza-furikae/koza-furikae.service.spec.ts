// Screen: ACSMS-SCR-020 — 口座振替データ出力画面
//
// KozaFurikaeService unit specs for:
//   - getInitialData(session)            — API-020-001 (GET initial data)
//   - exportCsv(body, session, req)      — API-020-002 (POST Zengin CSV export)
//
// Pattern: plain `new KozaFurikaeService(...)` with mocked deps (mirrors
// HaitatsuryoService). The export 集計 is a raw aggregation via
// dataSource.query(); the common FileArchiveService stores the CSV to S3 and
// registers t_file_download BEFORE a single transaction that updates m_ja /
// m_shiten, snapshots t_koza_furikae and writes the audit log. Error log
// (log_type=3) is emitted OUTSIDE the rolled-back tx.
// Each it() maps back to a clause in docs/design/ACSMS-SCR-020/ACSMS-SCR-020-api.md.

import * as iconv from 'iconv-lite';

import { attachLogExport } from '@test/utils/audit-log-mock';
import { KozaFurikaeService } from '@/modules/koza-furikae/koza-furikae.service';
import {
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';
import {
  buildExportKozaFurikaeQuery,
  buildPreviewKozaFurikaeQuery,
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
      // default: 失効単価チェック(active_flg=FALSE)は 0 件 → error gate 通過。
      //          集計(active_flg=TRUE)は 2 購読者 rows。
      query: jest.fn((sql: string) =>
        typeof sql === 'string' && /active_flg\s*=\s*FALSE/i.test(sql)
          ? Promise.resolve([])
          : Promise.resolve([
              buildKozaFurikaeAggRow({ dokusya_id: 1, furikae_kingaku: 4900 }),
              buildKozaFurikaeAggRow({
                dokusya_id: 2,
                koza_meigi: 'ｽｽﾞｷ ﾊﾅｺ',
                furikae_kingaku: 4900,
              }),
            ]),
      ),
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    // logExport は実装と同じく logOperation へ委譲する（監査セマンティクス不変）。
    // 既存の logOperation 期待値をそのまま検証できるようにモックでも委譲する。
    attachLogExport(auditLog);
    // 共通 S3 アーカイブ + t_file_download 登録（ReportModule から再利用）。
    reportArchive = {
      resolveJa: jest.fn().mockResolvedValue({ code: 'JA001', name: '' }),
      archive: jest.fn().mockResolvedValue({
        key: 'koza-furikae/JA001/2026/口座振替データ_JA001_2026年05月27日_20260522103000',
        filename: '口座振替データ_JA001_2026年05月27日_20260522103000',
        fileDownloadId: 7,
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
  // API-020-003 — POST /api/v1/koza-furikae/preview (v1.1)
  // ═══════════════════════════════════════════════════════════════════════
  describe('previewData', () => {
    it('should aggregate and return the preview rows with meta.total when データ exists', async () => {
      // COVERS: v1.1 作成開始 = プレビュー表示（集計→一覧）
      const result = await service.previewData(buildPreviewKozaFurikaeQuery(), kSession());

      expect(result.meta.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(
        expect.objectContaining({ dokusya_id: 1, furikae_kingaku: 4900 }),
      );
      // koza_meigi は 預金者名（hikiotoshi_koza_meigi 優先・Zengin と同ロジック）。
      expect(result.data[1]).toEqual(
        expect.objectContaining({ dokusya_id: 2, furikae_kingaku: 4900 }),
      );
    });

    it('should throw NO_TARGET_DATA when the preview aggregation returns 0 rows', async () => {
      // COVERS: v1.1 プレビュー段で0件 → 404 (MSG-020-002)
      dataSource.query.mockResolvedValue([]);

      await expect(
        service.previewData(buildPreviewKozaFurikaeQuery(), kSession()),
      ).rejects.toMatchObject({ response: { error_code: 'NO_TARGET_DATA' } });
    });

    it('should NOT archive to S3, open a transaction, nor write an audit log when previewing', async () => {
      // COVERS: v1.1 プレビューは閲覧のみ（DB/S3/監査 書込なし）
      await service.previewData(buildPreviewKozaFurikaeQuery(), kSession());

      expect(reportArchive.archive).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });

    it('should throw INACTIVE_TANKA_REFERENCED at preview when a 購読者 references a 失効単価 (active_flg=FALSE)', async () => {
      // COVERS: v1.1 §4.3 ① 失効単価参照チェック（プレビュー時点で検出）
      // 総該当 3 件だが LIMIT 15 で全件返る想定。total_count は各行に載る。
      dataSource.query.mockImplementation((sql: string) =>
        /active_flg\s*=\s*FALSE/i.test(sql)
          ? Promise.resolve([
              {
                dokusya_id: 1,
                koza_meigi: 'ﾔﾏﾀﾞ ﾀﾛｳ',
                tanka_code: 'T001',
                tanka_name: '旧購読料',
                total_count: '3',
              },
            ])
          : Promise.resolve([buildKozaFurikaeAggRow({ dokusya_id: 1 })]),
      );

      await expect(
        service.previewData(buildPreviewKozaFurikaeQuery(), kSession()),
      ).rejects.toMatchObject({
        response: {
          error_code: 'INACTIVE_TANKA_REFERENCED',
          errors: [expect.objectContaining({ field: '1' })],
          total: 3,
        },
      });
    });

    it('should bind the session ja_id into the preview aggregation params', async () => {
      // COVERS: 4.2 DataScope ja_id = user.ja_id（preview も同一集計）
      await service.previewData(buildPreviewKozaFurikaeQuery(), kSession({ ja_id: 8 }));

      const aggCall = dataSource.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /t_dokusya/i.test(sql),
      );
      expect(aggCall).toBeDefined();
      expect(aggCall[1]).toContain(8);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // API-020-002 — POST /api/v1/koza-furikae/export
  // ═══════════════════════════════════════════════════════════════════════
  describe('exportCsv', () => {
    it('should return a Buffer + ZENOUTFD filename + ASCII fallback + record count when データ exists', async () => {
      // COVERS: 4.4 CSV生成 + 4.9 レスポンス生成（ファイル名は ja_code + 引落日）
      const result = await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);

      expect(result).toEqual(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          // ダウンロード名はタイムスタンプ無し（hikiotoshi_date=2026-05-27）。
          filename: 'ZENOUTFD',
          asciiFilename: 'ZENOUTFD',
          recordCount: 2,
        }),
      );
    });

    it('should output fixed-length 120-byte 全銀 records (header 91 / data / trailer zeros / end), not CSV', async () => {
      // COVERS: 4.4 全銀フォーマット固定長。docs/demo/ZENOUTFD サンプル準拠。
      const result = await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);
      const text = iconv.decode(result.buffer, 'Shift_JIS');
      const records = text.split('\r\n').filter((r) => r.length > 0);
      // 1:ヘッダ + 2:データ×2 + 8:トレーラ + 9:エンド = 5 レコード。
      expect(records).toHaveLength(5);
      // 各レコードは Shift_JIS で 120 バイト固定長（受入条件#8）。
      for (const rec of records) {
        expect(iconv.encode(rec, 'Shift_JIS').length).toBe(120);
      }
      const [header, d1, , trailer, end] = records;
      // ヘッダ: データ区分1 / 種別コード91 / コード区分0。
      expect(header.slice(0, 4)).toBe('1910');
      // データ: 区分2 / 引落金額(81-90)=4900 / 顧客番号(92-111)=購読者ID / 振替結果(112)=0。
      expect(d1[0]).toBe('2');
      expect(d1.slice(80, 90)).toBe('0000004900');
      expect(d1.slice(91, 111).trim()).toBe('1');
      expect(d1[111]).toBe('0');
      // トレーラ: 区分8 / 合計件数2 / 合計金額9800 / 振替済・不能はゼロ。
      expect(trailer[0]).toBe('8');
      expect(trailer.slice(1, 7)).toBe('000002');
      expect(trailer.slice(7, 19)).toBe('000000009800');
      expect(trailer.slice(19, 55)).toBe('0'.repeat(36));
      // エンド: 区分9。
      expect(end[0]).toBe('9');
    });

    it('should archive the CSV via FileArchiveService with category koza-furikae, empty rootPrefix and NO extension (全銀メディアは拡張子なし)', async () => {
      // COVERS: 4.4 共通S3アーカイブ（reports/ なし）+ t_file_download 登録。
      // 銀行提出ファイルに .txt は不要 → extension は空文字。
      await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);

      expect(reportArchive.archive).toHaveBeenCalledTimes(1);
      expect(reportArchive.archive).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'koza-furikae',
          rootPrefix: '',
          year: '2026',
          baseName: '口座振替データ_JA001_2026年05月27日',
          extension: '',
          contentType: 'text/plain; charset=Shift_JIS',
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

    it('should throw INACTIVE_TANKA_REFERENCED (error gate) and NOT archive/transact when a 購読者 references a 失効単価 (active_flg=FALSE)', async () => {
      // COVERS: 4.3 ① 失効単価参照チェック（顧客要件 2026-07）
      // 失効チェック(active_flg=FALSE)が該当者を返す → 出力を止める。
      dataSource.query.mockImplementation((sql: string) =>
        /active_flg\s*=\s*FALSE/i.test(sql)
          ? Promise.resolve([
              {
                dokusya_id: 1,
                koza_meigi: 'ﾔﾏﾀﾞ ﾀﾛｳ',
                tanka_code: 'T001',
                tanka_name: '旧購読料',
                total_count: '1',
              },
            ])
          : Promise.resolve([buildKozaFurikaeAggRow({ dokusya_id: 1 })]),
      );

      await expect(
        service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req),
      ).rejects.toMatchObject({
        response: { error_code: 'INACTIVE_TANKA_REFERENCED', total: 1 },
      });

      // 業務エラーなので S3 保存・DB トランザクション・エラーログは実行しない。
      expect(reportArchive.archive).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(auditLog.logError).not.toHaveBeenCalled();
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
          key: 'koza-furikae/JA001/2026/口座振替データ_JA001_2026年05月27日_20260522103000',
          filename: '口座振替データ_JA001_2026年05月27日_20260522103000',
          fileDownloadId: 7,
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

    it('should snapshot t_koza_furikae + 操作ログ inside a single transaction WITHOUT updating m_ja / m_shiten', async () => {
      // COVERS: 4.6〜4.8 単一トランザクション。顧客要件: JASTEM 情報は readonly 表示
      // のみで、出力時に m_ja / m_shiten へは書き戻さない。
      await service.exportCsv(buildExportKozaFurikaeQuery(), kSession(), req);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      // m_ja / m_shiten への更新は行わない（readonly）。t_koza_furikae は
      // manager.query で upsert するため manager.update は一切呼ばれない。
      expect(txManager.update).not.toHaveBeenCalled();
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
      expect(params.targetTable).toBe('t_file_download');
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

    // ─── v1.1: プレビューで編集した金額の反映 ─────────────────────────────
    it('should apply the edited 金額 from rows into the 全銀 CSV and t_koza_furikae, matched by dokusya_id', async () => {
      // COVERS: v1.1 金額編集 → dokusya_id 突合で上書き（Zengin & upsert に反映）
      const body = buildExportKozaFurikaeQuery({
        rows: [
          { dokusya_id: 1, furikae_kingaku: 8000 }, // 編集
          { dokusya_id: 2, furikae_kingaku: 4900 }, // 据え置き
        ],
      });

      const result = await service.exportCsv(body, kSession(), req);
      const text = iconv.decode(result.buffer, 'Shift_JIS');
      const records = text.split('\r\n').filter((r) => r.length > 0);
      const [, d1, d2, trailer] = records;
      // データ1の引落金額(81-90)=8000、合計金額(7-19)=12900。
      expect(d1.slice(80, 90)).toBe('0000008000');
      expect(d2.slice(80, 90)).toBe('0000004900');
      expect(trailer.slice(7, 19)).toBe('000000012900');
      // upsert にも編集金額（8000）が渡る（$5 = furikae_kingaku）。
      const upsertCall = txManager.query.mock.calls.find(
        ([sql]: any[]) => typeof sql === 'string' && /INSERT INTO t_koza_furikae/i.test(sql),
      );
      expect(upsertCall[1][4]).toBe(8000);
    });

    it('should IGNORE rows whose dokusya_id is not in the scoped aggregation (no cross-tenant / fake-id injection)', async () => {
      // COVERS: security.md Layer2/4 — client の dokusya_id は信用せず再集計と突合。
      // スコープに無い偽ID(999)は出力・upsert されず、実在行は DB 金額のまま。
      const body = buildExportKozaFurikaeQuery({
        rows: [
          { dokusya_id: 999, furikae_kingaku: 999_999 }, // 別テナント/偽ID
          { dokusya_id: 1, furikae_kingaku: 7000 }, // 実在行のみ上書きされる
        ],
      });

      const result = await service.exportCsv(body, kSession(), req);
      const text = iconv.decode(result.buffer, 'Shift_JIS');
      const records = text.split('\r\n').filter((r) => r.length > 0);
      // データ行は集計の2件のみ（偽ID行は追加されない）。
      const dataRecords = records.filter((r) => r[0] === '2');
      expect(dataRecords).toHaveLength(2);
      // 999999 は一切出現しない。
      expect(text).not.toContain('0000999999');
      // dokusya_id=1 は 7000 に上書き、dokusya_id=2 は据え置き 4900。
      expect(dataRecords[0].slice(80, 90)).toBe('0000007000');
      expect(dataRecords[1].slice(80, 90)).toBe('0000004900');
    });

    it('should keep the DB aggregation 金額 for rows not present in the edited rows[]', async () => {
      // COVERS: v1.1 未編集行は集計の DB 金額を採用（rows に無い行はそのまま）
      const body = buildExportKozaFurikaeQuery({
        rows: [{ dokusya_id: 1, furikae_kingaku: 5500 }], // dokusya_id=2 は編集していない
      });

      const result = await service.exportCsv(body, kSession(), req);
      const text = iconv.decode(result.buffer, 'Shift_JIS');
      const dataRecords = text
        .split('\r\n')
        .filter((r) => r.length > 0 && r[0] === '2');
      expect(dataRecords[0].slice(80, 90)).toBe('0000005500'); // 編集
      expect(dataRecords[1].slice(80, 90)).toBe('0000004900'); // DB金額
    });
  });
});

// FileDownloadService (SCR-022) の単体テスト。
//   - findAll: t_file_download を読み取り、DataScope を適用してマッピングする
//   - download / downloadZip: ファイルを配信し、t_log のみ記録する
//     （t_file_download への INSERT は行わない = 本リファクタの要点）
//   - getPreview: 署名付き URL を返す
//   - assertScope: NICHINO は全件、JA系は ja_id 一致 or NULL のみ、他は 404
import { FileDownloadService } from './file-download.service';

type Any = Record<string, unknown>;

function nichinoSession(overrides: Any = {}) {
  return {
    account_id: 1,
    login_id: 'nichino01',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    ja_id: null,
    kanri_shiten_id: null,
    permissions: ['file.download'],
    ...overrides,
  } as never;
}

function jaSession(overrides: Any = {}) {
  return {
    account_id: 9,
    login_id: 'honten01',
    role_id: 4,
    role_code: 'JA_HONTEN',
    ja_id: 5,
    kanri_shiten_id: null,
    permissions: ['file.download'],
    ...overrides,
  } as never;
}

const req = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as never;

function buildRow(overrides: Any = {}) {
  return {
    fileDownloadId: 100,
    jaId: 5,
    downloadDatetime: new Date('2026-07-01T00:00:00Z'),
    downloadType: 1,
    filePath: 'koza-furikae/JA001/2026/ZENOUTFD.txt',
    fileName: 'ZENOUTFD.txt',
    fileSize: 1234,
    recordCount: 10,
    targetMonth: '202607',
    scheduledDeleteDate: null,
    nichinoDownloadAllowedFlg: false,
    deletedAt: null,
    createdBy: '9',
    createdAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  };
}

describe('FileDownloadService', () => {
  let service: FileDownloadService;
  let repo: Any;
  let dataSource: Any;
  let auditLog: Any;
  let storage: Any;

  beforeEach(() => {
    repo = { findOne: jest.fn(), find: jest.fn() };
    dataSource = { query: jest.fn() };
    auditLog = { logOperation: jest.fn(), logError: jest.fn() };
    storage = {
      download: jest.fn().mockResolvedValue(Buffer.from('body')),
      getSignedUrl: jest.fn().mockResolvedValue('https://signed'),
    };
    service = new FileDownloadService(
      repo as never,
      dataSource as never,
      auditLog as never,
      storage as never,
    );
  });

  // ── findAll ───────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should query t_file_download and map rows to the DTO shape', async () => {
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '1' }])
        .mockResolvedValueOnce([
          {
            file_download_id: 100,
            ja_id: 5,
            ja_code: 'JA001',
            ja_name: 'テストJA',
            download_datetime: new Date('2026-07-01T00:00:00Z'),
            download_type: 3,
            file_name: 'zougen.pdf',
            file_size: 2048,
            record_count: 20,
            target_month: '202607',
            scheduled_delete_date: null,
            nichino_download_allowed_flg: true,
            deleted_at: null,
            created_by: '9',
            created_by_name: '本店 太郎',
            created_at: new Date('2026-07-01T00:00:00Z'),
          },
        ]);

      const res = await service.findAll({}, jaSession());

      // 両クエリとも t_file_download を参照する。
      const [countSql] = (dataSource.query as jest.Mock).mock.calls[0];
      const [dataSql] = (dataSource.query as jest.Mock).mock.calls[1];
      expect(countSql).toMatch(/FROM t_file_download fd/);
      expect(dataSql).toMatch(/FROM t_file_download fd/);
      expect(res.meta.total).toBe(1);
      expect(res.data[0]).toMatchObject({
        file_download_id: 100,
        download_type: 3,
        file_name: 'zougen.pdf',
        nichino_download_allowed_flg: true,
        created_by_name: '本店 太郎',
      });
    });

    it('should apply no DataScope filter for NICHINO_* (scope = TRUE)', async () => {
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);
      await service.findAll({}, nichinoSession());
      const [dataSql] = (dataSource.query as jest.Mock).mock.calls[1];
      expect(dataSql).toMatch(/TRUE/);
      expect(dataSql).not.toMatch(/fd\.ja_id IN/);
    });

    it('should scope by ja_id (or NULL) for JA-level roles', async () => {
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);
      await service.findAll({}, jaSession({ ja_id: 5 }));
      const [dataSql] = (dataSource.query as jest.Mock).mock.calls[1];
      expect(dataSql).toMatch(/fd\.ja_id IS NULL OR fd\.ja_id IN \(5\)/);
    });

    it('should exclude soft-deleted rows', async () => {
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);
      await service.findAll({}, nichinoSession());
      const [dataSql] = (dataSource.query as jest.Mock).mock.calls[1];
      expect(dataSql).toMatch(/fd\.deleted_at IS NULL/);
    });
  });

  // ── download ──────────────────────────────────────────────────────
  describe('download', () => {
    it('should serve the file and write ONE t_log without inserting t_file_download', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(buildRow());

      const res = await service.download(100, jaSession(), req);

      expect(storage.download).toHaveBeenCalledWith(
        'koza-furikae/JA001/2026/ZENOUTFD.txt',
      );
      // t_log は1回だけ、DOWNLOAD 操作で記録する。
      expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
      const logArg = (auditLog.logOperation as jest.Mock).mock.calls[0][0];
      expect(logArg.operation).toBe('DOWNLOAD');
      expect(logArg.targetTable).toBe('t_file_download');
      // t_file_download への保存(insert)は一切行わない。
      expect(repo.find).not.toHaveBeenCalled();
      expect(res).toMatchObject({
        fileName: 'ZENOUTFD.txt',
        contentType: 'text/plain',
        contentLength: 1234,
      });
    });

    it('should throw NotFound when the row does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.download(999, jaSession(), req)).rejects.toMatchObject(
        { response: expect.objectContaining({ error_code: 'NOT_FOUND' }) },
      );
    });

    it('should mask out-of-scope rows as NotFound for JA roles', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(buildRow({ jaId: 999 }));
      await expect(
        service.download(100, jaSession({ ja_id: 5 }), req),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'NOT_FOUND' }),
      });
      expect(storage.download).not.toHaveBeenCalled();
    });

    it('should allow NICHINO_* to download any JA row (flag allowed)', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(
        buildRow({ jaId: 999, nichinoDownloadAllowedFlg: true }),
      );
      await expect(
        service.download(100, nichinoSession(), req),
      ).resolves.toBeDefined();
    });

    it('should FORBID NICHINO_* from downloading a nichino_download_allowed_flg=false row', async () => {
      // 日農DL許可フラグ false → 日農(role1/2)は 403（FEの行無効化と対のサーバ強制）。
      (repo.findOne as jest.Mock).mockResolvedValue(
        buildRow({ nichinoDownloadAllowedFlg: false }),
      );
      await expect(
        service.download(100, nichinoSession(), req),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'FORBIDDEN' }),
      });
      expect(storage.download).not.toHaveBeenCalled();
    });

    it('should FORBID CHUOKAI (role3) from downloading a nichino_download_allowed_flg=false row', async () => {
      // 顧客要件: 日農(role1/2) に加え 中央会(CHUOKAI=role3) も flag=false のファイルを DL 不可。
      (repo.findOne as jest.Mock).mockResolvedValue(
        buildRow({ jaId: 5, nichinoDownloadAllowedFlg: false }),
      );
      await expect(
        service.download(100, jaSession({ role_code: 'CHUOKAI', ja_id: 5 }), req),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'FORBIDDEN' }),
      });
      expect(storage.download).not.toHaveBeenCalled();
    });

    it('should ALLOW JA_HONTEN / JA_KANRI_SHITEN to download a flag=false row', async () => {
      // フラグ制限は日農(1/2)+中央会(3)のみ。それ以外の JA系ロールはDL可能。
      (repo.findOne as jest.Mock).mockResolvedValue(
        buildRow({ jaId: 5, nichinoDownloadAllowedFlg: false }),
      );
      await expect(
        service.download(100, jaSession({ ja_id: 5 }), req),
      ).resolves.toBeDefined();
    });
  });

  // ── downloadZip ───────────────────────────────────────────────────
  describe('downloadZip', () => {
    it('should bundle files into a ZIP and log ONE t_log, no insert', async () => {
      (repo.find as jest.Mock).mockResolvedValue([
        buildRow({ fileDownloadId: 1, fileName: 'a.pdf' }),
        buildRow({ fileDownloadId: 2, fileName: 'b.pdf' }),
      ]);
      const res = await service.downloadZip([1, 2], jaSession(), req);
      expect(storage.download).toHaveBeenCalledTimes(2);
      expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
      expect(res.contentType).toBe('application/zip');
      expect(res.fileName).toMatch(/^一括ダウンロード_.*\.zip$/);
    });

    it('should reject the whole batch (NotFound) when any id is missing', async () => {
      (repo.find as jest.Mock).mockResolvedValue([buildRow({ fileDownloadId: 1 })]);
      await expect(
        service.downloadZip([1, 2], jaSession(), req),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'NOT_FOUND' }),
      });
    });

    it('should FORBID NICHINO_* when any bundled file has flag=false', async () => {
      (repo.find as jest.Mock).mockResolvedValue([
        buildRow({ fileDownloadId: 1, nichinoDownloadAllowedFlg: true }),
        buildRow({ fileDownloadId: 2, nichinoDownloadAllowedFlg: false }),
      ]);
      await expect(
        service.downloadZip([1, 2], nichinoSession(), req),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'FORBIDDEN' }),
      });
    });
  });

  // ── getPreview ────────────────────────────────────────────────────
  describe('getPreview', () => {
    it('should return a signed preview URL', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(buildRow());
      const res = await service.getPreview(100, jaSession());
      expect(storage.getSignedUrl).toHaveBeenCalledWith(
        'koza-furikae/JA001/2026/ZENOUTFD.txt',
      );
      expect(res.data).toEqual({
        preview_url: 'https://signed',
        file_name: 'ZENOUTFD.txt',
      });
    });

    it('should FORBID NICHINO_* preview when flag=false', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(
        buildRow({ nichinoDownloadAllowedFlg: false }),
      );
      await expect(
        service.getPreview(100, nichinoSession()),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'FORBIDDEN' }),
      });
    });
  });
});

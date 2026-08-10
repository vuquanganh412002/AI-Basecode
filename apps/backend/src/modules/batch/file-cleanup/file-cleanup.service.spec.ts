import { DataSource } from 'typeorm';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { FileDownload } from '@/database/entities/file-download.entity';
import { StorageService } from '@/modules/storage/storage.service';
import { FileCleanupService } from './file-cleanup.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

/** 実行サマリの t_log 書込み。呼ばれたことだけ検証できればよいのでスパイで足りる。 */
function auditMock(): { logOperation: jest.Mock } {
  return { logOperation: jest.fn().mockResolvedValue(undefined) };
}

interface QbMock {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  take: jest.Mock;
  getMany: jest.Mock;
}

interface RepoMock {
  createQueryBuilder: jest.Mock;
  softDelete: jest.Mock;
  metadata: { tableName: string };
  __qb: QbMock;
}

function makeRepo(tableName: string, pages: unknown[][]): RepoMock {
  const qb: QbMock = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  for (const p of pages) qb.getMany.mockResolvedValueOnce(p);
  qb.getMany.mockResolvedValue([]); // キュー消化後は空で終了。
  return {
    createQueryBuilder: jest.fn(() => qb),
    softDelete: jest.fn().mockResolvedValue({ affected: 0 }),
    metadata: { tableName },
    __qb: qb,
  };
}

describe('FileCleanupService', () => {
  let service: FileCleanupService;
  let storage: { delete: jest.Mock };
  let uploadRepo: RepoMock;
  let downloadRepo: RepoMock;

  function build(uploadPages: unknown[][], downloadPages: unknown[][]) {
    uploadRepo = makeRepo('t_file_upload', uploadPages);
    downloadRepo = makeRepo('t_file_download', downloadPages);
    const db = {
      getRepository: jest.fn((e: unknown) =>
        e === FileUpload ? uploadRepo : downloadRepo,
      ),
    };
    storage = { delete: jest.fn().mockResolvedValue(undefined) };
    service = new FileCleanupService(
      db as unknown as DataSource,
      storage as unknown as StorageService,
      auditMock() as unknown as AuditLogService,
    );
  }

  it('should delete S3 objects then soft-delete due rows (upload: file + error CSV, download: file)', async () => {
    build(
      [[{ fileUploadId: 1, filePath: 'up/1.xlsx', errorFilePath: 'up/1_err.csv' }]],
      [[{ fileDownloadId: 9, filePath: 'dl/9.pdf' }]],
    );

    await service.run();

    // 取込は本体 + エラーCSV の2キー、ダウンロードは本体のみ。
    expect(storage.delete).toHaveBeenCalledWith('up/1.xlsx');
    expect(storage.delete).toHaveBeenCalledWith('up/1_err.csv');
    expect(storage.delete).toHaveBeenCalledWith('dl/9.pdf');

    expect(uploadRepo.softDelete).toHaveBeenCalledWith([1]);
    expect(downloadRepo.softDelete).toHaveBeenCalledWith([9]);
  });

  it('should skip empty / whitespace S3 key fields (e.g. blank error_file_path)', async () => {
    build([[{ fileUploadId: 2, filePath: 'up/2.xlsx', errorFilePath: '' }]], []);

    await service.run();

    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith('up/2.xlsx');
    expect(uploadRepo.softDelete).toHaveBeenCalledWith([2]);
  });

  it('should NOT soft-delete a row whose S3 delete failed, but still process the others', async () => {
    build(
      [
        [
          { fileUploadId: 1, filePath: 'up/1.xlsx', errorFilePath: '' },
          { fileUploadId: 2, filePath: 'up/2.xlsx', errorFilePath: '' },
        ],
      ],
      [],
    );
    storage.delete.mockImplementation((key: string) => {
      if (key === 'up/1.xlsx') return Promise.reject(new Error('S3 down'));
      return Promise.resolve(undefined);
    });

    await service.run();

    // 失敗した1は論理削除しない（次回再試行）。2のみ論理削除。
    expect(uploadRepo.softDelete).toHaveBeenCalledWith([2]);
    expect(uploadRepo.softDelete).not.toHaveBeenCalledWith(
      expect.arrayContaining([1]),
    );
  });

  it('should be idempotent — no soft-delete and resolves when nothing is due', async () => {
    build([], []);

    await expect(service.run()).resolves.toBeUndefined();
    expect(storage.delete).not.toHaveBeenCalled();
    expect(uploadRepo.softDelete).not.toHaveBeenCalled();
    expect(downloadRepo.softDelete).not.toHaveBeenCalled();
  });

  it('should filter on scheduled_delete_date, deleted_at IS NULL, and a keyset cursor', async () => {
    build([[{ fileUploadId: 5, filePath: 'up/5.xlsx', errorFilePath: '' }]], []);

    await service.run();

    const conds = [
      uploadRepo.__qb.where.mock.calls[0][0],
      ...uploadRepo.__qb.andWhere.mock.calls.map((c) => c[0] as string),
    ];
    expect(conds).toEqual(
      expect.arrayContaining([
        'e.scheduledDeleteDate IS NOT NULL',
        'e.scheduledDeleteDate <= :cutoff',
        'e.deletedAt IS NULL',
        'e.fileUploadId > :cursor',
      ]),
    );
    // upload は当日(JST) YYYY-MM-DD をバインド。
    const cutoffCall = uploadRepo.__qb.andWhere.mock.calls.find(
      (c) => c[0] === 'e.scheduledDeleteDate <= :cutoff',
    );
    expect(cutoffCall?.[1]).toEqual({
      cutoff: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('should use NOW() (not a date param) for the timestamptz download cutoff', async () => {
    build([], [[{ fileDownloadId: 3, filePath: 'dl/3.pdf' }]]);

    await service.run();

    const conds = downloadRepo.__qb.andWhere.mock.calls.map((c) => c[0] as string);
    expect(conds).toContain('e.scheduledDeleteDate <= NOW()');
  });

  it('should page with the keyset cursor when a full chunk (500) is returned', async () => {
    const fullChunk = Array.from({ length: 500 }, (_, i) => ({
      fileUploadId: i + 1,
      filePath: `up/${i + 1}.xlsx`,
      errorFilePath: '',
    }));
    build([fullChunk, [{ fileUploadId: 501, filePath: 'up/501.xlsx', errorFilePath: '' }]], []);

    await service.run();

    // フルチャンク → 2回目取得 → 端数で終了 → 空で download へ。
    expect(uploadRepo.__qb.getMany).toHaveBeenCalledTimes(2);
    // 2回目のカーソルは1回目末尾の id(500)。
    const cursorCalls = uploadRepo.__qb.andWhere.mock.calls.filter(
      (c) => c[0] === 'e.fileUploadId > :cursor',
    );
    expect(cursorCalls.some((c) => c[1]?.cursor === 500)).toBe(true);
  });
});

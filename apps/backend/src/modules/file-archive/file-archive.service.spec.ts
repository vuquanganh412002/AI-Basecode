// Unit spec for FileArchiveService — plain `new` with mocked deps.
// Verifies the S3 key layout, the timestamped filename, ja_code resolution,
// and the t_file_download record shape (download_type / nichino flag /
// scheduled delete +5y).

import { FileArchiveService } from '@/modules/file-archive/file-archive.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { DownloadType } from '@/common/enums';
import { todayIsoJst } from '@/common/utils/datetime';

describe('FileArchiveService', () => {
  let service: FileArchiveService;
  let fileDownloadRepo: any;
  let jaRepo: any;
  let storage: any;

  const session = { account_id: 42 } as SessionPayload;

  const baseParams = () => ({
    buffer: Buffer.from('xlsx-bytes'),
    baseName: '販売店別購読者名簿_2026年01月',
    category: 'meibo',
    subFolder: 'hanbaiten',
    year: '2026',
    jaId: 1 as number | null,
    session,
    recordCount: 3,
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    downloadType: DownloadType.MEIBO,
  });

  beforeEach(() => {
    fileDownloadRepo = {
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => ({ fileDownloadId: 1, ...v })),
    };
    jaRepo = {
      findOne: jest.fn().mockResolvedValue({ jaCode: 'JA001', jaName: 'テストJA' }),
    };
    storage = { upload: jest.fn().mockResolvedValue('JA001/...') };
    service = new FileArchiveService(fileDownloadRepo, jaRepo, storage);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns a filename = baseName + 14-digit JST timestamp + .xlsx', async () => {
    const { filename } = await service.archive(baseParams());
    expect(filename).toMatch(/^販売店別購読者名簿_2026年01月_\d{14}\.xlsx$/);
  });

  // 顧客要件2026-07 — displayName 指定時: S3キーはタイムスタンプ付きで一意、
  // DB/DL表示名(file_name)はタイムスタンプ無しの表示名。
  it('separates a timestamped S3 key from a clean DB file_name when displayName is provided', async () => {
    const { key, filename } = await service.archive({
      ...baseParams(),
      baseName: '増減通知_JAテスト_JA001_20260301',
      displayName: '増減通知_JAテスト_JA001_20260301',
      extension: '.pdf',
    });
    // 返り値 filename（メール・監査ログ用）＝表示名（タイムスタンプ無し）。
    expect(filename).toBe('増減通知_JAテスト_JA001_20260301.pdf');
    // S3キーはタイムスタンプ付きで一意化。
    expect(key).toMatch(/増減通知_JAテスト_JA001_20260301_\d{14}\.pdf$/);
    // DBに保存する file_name は表示名（タイムスタンプ無し）。
    const saved = fileDownloadRepo.create.mock.calls[0][0];
    expect(saved.fileName).toBe('増減通知_JAテスト_JA001_20260301.pdf');
    expect(saved.filePath).toBe(key);
  });

  it('uploads to S3 under reports/{category}/{ja_code}/{subFolder}/{year}/{filename}', async () => {
    const { key } = await service.archive(baseParams());
    expect(storage.upload).toHaveBeenCalledTimes(1);
    const [uploadKey, body, contentType] = storage.upload.mock.calls[0];
    expect(uploadKey).toBe(key);
    expect(key).toMatch(
      /^reports\/meibo\/JA001\/hanbaiten\/2026\/販売店別購読者名簿_2026年01月_\d{14}\.xlsx$/,
    );
    expect(body).toBeInstanceOf(Buffer);
    expect(contentType).toBe(baseParams().contentType);
  });

  it('resolves ja_code from jaRepo by jaId', async () => {
    await service.archive(baseParams());
    expect(jaRepo.findOne).toHaveBeenCalledWith({
      where: { jaId: 1 },
      select: ['jaCode', 'jaName'],
    });
  });

  it('skips internal ja resolution and uses the provided jaCode for the S3 path', async () => {
    const { key } = await service.archive({ ...baseParams(), jaCode: 'JAOVR' });
    expect(jaRepo.findOne).not.toHaveBeenCalled();
    expect(key).toMatch(/^reports\/meibo\/JAOVR\/hanbaiten\/2026\//);
  });

  it('omits the subFolder segment from the S3 key when subFolder is absent', async () => {
    const params = baseParams();
    delete (params as { subFolder?: string }).subFolder;
    const { key } = await service.archive(params);
    // reports/{category}/{ja_code}/{year}/{filename} — サブフォルダ区切り無し。
    expect(key).toMatch(
      /^reports\/meibo\/JA001\/2026\/販売店別購読者名簿_2026年01月_\d{14}\.xlsx$/,
    );
  });

  it('returns the saved t_file_download id', async () => {
    fileDownloadRepo.save.mockResolvedValueOnce({ fileDownloadId: 99 });
    const { fileDownloadId } = await service.archive(baseParams());
    expect(fileDownloadId).toBe(99);
  });

  describe('resolveJa', () => {
    it('returns ja_code + ja_name for an existing JA', async () => {
      const ja = await service.resolveJa(1);
      expect(ja).toEqual({ code: 'JA001', name: 'テストJA' });
    });

    it('returns { code: "unknown", name: "" } when jaId is null', async () => {
      const ja = await service.resolveJa(null);
      expect(ja).toEqual({ code: 'unknown', name: '' });
      expect(jaRepo.findOne).not.toHaveBeenCalled();
    });

    it('falls back to { code: String(jaId), name: "" } when the JA row is not found', async () => {
      jaRepo.findOne.mockResolvedValueOnce(null);
      const ja = await service.resolveJa(7);
      expect(ja).toEqual({ code: '7', name: '' });
    });
  });

  it('falls back to "unknown" in the S3 path when jaId is null', async () => {
    const { key } = await service.archive({ ...baseParams(), jaId: null });
    expect(jaRepo.findOne).not.toHaveBeenCalled();
    expect(key).toMatch(/^reports\/meibo\/unknown\/hanbaiten\/2026\//);
  });

  it('falls back to String(jaId) when the JA row is not found', async () => {
    jaRepo.findOne.mockResolvedValue(null);
    const { key } = await service.archive({ ...baseParams(), jaId: 7 });
    expect(key).toMatch(/^reports\/meibo\/7\/hanbaiten\/2026\//);
  });

  it('saves a t_file_download record with download_type + S3 metadata', async () => {
    const { key, filename } = await service.archive(baseParams());

    expect(fileDownloadRepo.save).toHaveBeenCalledTimes(1);
    const saved = fileDownloadRepo.create.mock.calls[0][0];
    expect(saved).toEqual(
      expect.objectContaining({
        jaId: 1,
        downloadType: DownloadType.MEIBO,
        nichinoDownloadAllowedFlg: false, // 既定
        fileName: filename,
        filePath: key,
        fileSize: Buffer.from('xlsx-bytes').length,
        recordCount: 3,
        createdBy: '42',
      }),
    );
    expect(saved.downloadDatetime).toBeInstanceOf(Date);
    // t_file_download には status 列は無い。
    expect(saved).not.toHaveProperty('status');
  });

  it('passes through nichinoDownloadAllowedFlg=true and targetMonth', async () => {
    await service.archive({
      ...baseParams(),
      nichinoDownloadAllowedFlg: true,
      targetMonth: '202601',
    });
    const saved = fileDownloadRepo.create.mock.calls[0][0];
    expect(saved.nichinoDownloadAllowedFlg).toBe(true);
    expect(saved.targetMonth).toBe('202601');
  });

  it('sets scheduled_delete_date to today(JST) + 5 years (date-only)', async () => {
    await service.archive(baseParams());
    const saved = fileDownloadRepo.create.mock.calls[0][0];

    const [y, m, d] = todayIsoJst().split('-');
    const expected = `${Number(y) + 5}-${m}-${d}`;
    expect(saved.scheduledDeleteDate).toBe(expected);
  });

  it('defaults recordCount to 0 when omitted', async () => {
    const params = baseParams();
    delete (params as { recordCount?: number }).recordCount;
    await service.archive(params);
    const saved = fileDownloadRepo.create.mock.calls[0][0];
    expect(saved.recordCount).toBe(0);
  });
});

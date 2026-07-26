import { DataSource } from 'typeorm';
import { recomputeMaster } from '@/modules/dokusya/dokusya-history.writer';
import { DokusyaRecomputeService } from './dokusya-recompute.service';

jest.mock('@/modules/dokusya/dokusya-history.writer', () => ({
  recomputeMaster: jest.fn().mockResolvedValue(undefined),
}));

const mockRecomputeMaster = recomputeMaster as jest.Mock;

describe('DokusyaRecomputeService', () => {
  let service: DokusyaRecomputeService;
  let db: { query: jest.Mock; transaction: jest.Mock };
  const managerMock = {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecomputeMaster.mockResolvedValue(undefined);
    db = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(managerMock)),
    };
    service = new DokusyaRecomputeService(db as unknown as DataSource);
  });

  it('should recompute every non-deleted subscriber in a transaction, asOf=today', async () => {
    db.query.mockResolvedValueOnce([{ dokusya_id: '4' }, { dokusya_id: '9' }]);

    await service.run();

    const [sql] = db.query.mock.calls[0] as [string];
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).toContain('dokusya_id > $1');
    expect(mockRecomputeMaster).toHaveBeenCalledWith(
      managerMock,
      4,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(mockRecomputeMaster).toHaveBeenCalledWith(managerMock, 9, expect.any(String));
  });

  it('should page with a keyset cursor when a full chunk (500) is returned', async () => {
    const fullChunk = Array.from({ length: 500 }, (_, i) => ({
      dokusya_id: String(i + 1),
    }));
    db.query
      .mockResolvedValueOnce(fullChunk)
      .mockResolvedValueOnce([{ dokusya_id: '501' }]);

    await service.run();

    expect(db.query).toHaveBeenCalledTimes(2);
    expect(mockRecomputeMaster).toHaveBeenCalledTimes(501);
    // 2回目のカーソル = 1回目末尾の id(500)。
    expect(db.query.mock.calls[1][1]).toEqual([500]);
  });

  it('should continue with the rest when one subscriber fails (per-row isolation)', async () => {
    db.query.mockResolvedValueOnce([{ dokusya_id: '1' }, { dokusya_id: '2' }]);
    mockRecomputeMaster.mockImplementation((_m: unknown, id: number) =>
      id === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(undefined),
    );

    await expect(service.run()).resolves.toBeUndefined();
    expect(mockRecomputeMaster).toHaveBeenCalledTimes(2);
  });

  it('should resolve without calling recomputeMaster when there are no subscribers', async () => {
    db.query.mockResolvedValue([]);

    await service.run();

    expect(mockRecomputeMaster).not.toHaveBeenCalled();
  });
});

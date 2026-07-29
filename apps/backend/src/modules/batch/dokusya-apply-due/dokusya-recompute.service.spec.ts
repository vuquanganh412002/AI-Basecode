import { DataSource } from 'typeorm';
import { DokusyaShubetsu } from '@/common/enums/dokusya-shubetsu.enum';
import { recomputeMaster } from '@/modules/dokusya/dokusya-history.writer';
import { DokusyaRecomputeService } from './dokusya-recompute.service';

jest.mock('@/modules/dokusya/dokusya-history.writer', () => ({
  recomputeMaster: jest.fn().mockResolvedValue(undefined),
}));

const mockRecomputeMaster = recomputeMaster as jest.Mock;

describe('DokusyaRecomputeService', () => {
  let service: DokusyaRecomputeService;
  let db: { query: jest.Mock; transaction: jest.Mock };
  let managerMock: { findOne: jest.Mock };
  let denshiPush: { pushOnBatch: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecomputeMaster.mockResolvedValue(undefined);
    managerMock = { findOne: jest.fn().mockResolvedValue(null) };
    // run() は最初に collectDuePushTargets の SELECT を1回投げ、続いて chunk SELECT
    // を回す。既定は全て [] を返す（push 対象なし・購読者なし）。
    db = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(managerMock)),
    };
    denshiPush = { pushOnBatch: jest.fn().mockResolvedValue(undefined) };
    service = new DokusyaRecomputeService(
      db as unknown as DataSource,
      denshiPush as never,
    );
  });

  it('should recompute every non-deleted subscriber in a transaction, asOf=today', async () => {
    db.query
      .mockResolvedValueOnce([]) // collectDuePushTargets
      .mockResolvedValueOnce([{ dokusya_id: '4' }, { dokusya_id: '9' }]); // chunk

    await service.run();

    // chunk SELECT は2回目の query 呼び出し。
    const [sql] = db.query.mock.calls[1] as [string];
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
      .mockResolvedValueOnce([]) // collectDuePushTargets
      .mockResolvedValueOnce(fullChunk)
      .mockResolvedValueOnce([{ dokusya_id: '501' }]);

    await service.run();

    // 1(候補) + 2(chunk) = 3 回。
    expect(db.query).toHaveBeenCalledTimes(3);
    expect(mockRecomputeMaster).toHaveBeenCalledTimes(501);
    // 2番目の chunk のカーソル = 1番目末尾の id(500)。chunk は calls[1], calls[2]。
    expect(db.query.mock.calls[2][1]).toEqual([500]);
  });

  it('should continue with the rest when one subscriber fails (per-row isolation)', async () => {
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ dokusya_id: '1' }, { dokusya_id: '2' }]);
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

  it('到来した予約情報変更の購読者だけ update を push する', async () => {
    db.query
      .mockResolvedValueOnce([{ dokusya_id: '9' }]) // collectDuePushTargets → {9}
      .mockResolvedValueOnce([{ dokusya_id: '4' }, { dokusya_id: '9' }]); // chunk
    managerMock.findOne.mockResolvedValue({
      dokusyaId: 9,
      dokusyaShubetsu: DokusyaShubetsu.DIGITAL,
    });

    await service.run();

    // 4 は候補外 → push されない。9 のみ update を pushOnBatch（対象判定はファサード内）。
    expect(denshiPush.pushOnBatch).toHaveBeenCalledTimes(1);
    expect(denshiPush.pushOnBatch).toHaveBeenCalledWith(managerMock, {
      action: 'update',
      after: expect.objectContaining({ dokusyaId: 9 }),
    });
  });

  it('候補クエリは 電子版/併読・joho=当日・非解約・予約(created<当日) で絞る', async () => {
    db.query.mockResolvedValue([]);

    await service.run();

    const [sql] = db.query.mock.calls[0] as [string];
    expect(sql).toContain('d.dokusya_shubetsu IN ($1, $2)');
    expect(sql).toContain('r.joho_henko_tekiyo_date = $3');
    expect(sql).toContain('r.kaiyaku_flg = false');
    expect(sql).toContain('r.created_at::date < $3::date');
  });
});

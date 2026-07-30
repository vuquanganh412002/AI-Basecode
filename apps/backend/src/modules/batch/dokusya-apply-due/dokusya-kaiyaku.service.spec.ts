import { DataSource } from 'typeorm';
import { DokusyaShubetsu } from '@/common/enums/dokusya-shubetsu.enum';
import { ShiharaiHoho } from '@/common/enums/shiharai-hoho.enum';
import { insertKaiyaku } from '@/modules/dokusya/dokusya-history.writer';
import { DokusyaKaiyakuService } from './dokusya-kaiyaku.service';

jest.mock('@/modules/dokusya/dokusya-history.writer', () => ({
  insertKaiyaku: jest.fn().mockResolvedValue(undefined),
}));

const mockInsertKaiyaku = insertKaiyaku as jest.Mock;

describe('DokusyaKaiyakuService', () => {
  let service: DokusyaKaiyakuService;
  let db: { query: jest.Mock; transaction: jest.Mock };
  let managerMock: { findOne: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsertKaiyaku.mockResolvedValue(undefined);
    managerMock = { findOne: jest.fn().mockResolvedValue(null) };
    db = {
      query: jest.fn().mockResolvedValue([]),
      // transaction(cb) は cb(manager) を実行してその結果(promise)を返す。
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(managerMock)),
    };
    service = new DokusyaKaiyakuService(db as unknown as DataSource);
  });

  it('should extract paper(<=today) + digital(<=yesterday, non credit-card), excluding 併読', async () => {
    await service.run();

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('dokusya_shubetsu = $1 AND dokusya_chushi_date <= $3');
    expect(sql).toContain(
      'dokusya_shubetsu = $2 AND dokusya_chushi_date <= $4 AND shiharai_hoho <> $5',
    );
    expect(sql).toContain('deleted_at IS NULL');
    // 抽出は PAPER と DIGITAL の2枝のみ → 併読(BOTH) は該当せず除外。
    expect(params[0]).toBe(DokusyaShubetsu.PAPER);
    expect(params[1]).toBe(DokusyaShubetsu.DIGITAL);
    expect(params).not.toContain(DokusyaShubetsu.BOTH);
    expect(params[4]).toBe(ShiharaiHoho.CREDIT_CARD);
    // today($3) と yesterday($4) は JST の YYYY-MM-DD。
    expect(params[2]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params[3]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should call insertKaiyaku in a transaction per due subscriber, asOf=today', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '4' }, { dokusya_id: '7' }]);

    await service.run();

    expect(db.transaction).toHaveBeenCalledTimes(2);
    expect(mockInsertKaiyaku).toHaveBeenCalledWith(
      managerMock,
      4,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(mockInsertKaiyaku).toHaveBeenCalledWith(managerMock, 7, expect.any(String));
  });

  it('should continue with the rest when one subscriber fails (per-row isolation)', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '1' }, { dokusya_id: '2' }]);
    mockInsertKaiyaku.mockImplementation((_m: unknown, id: number) =>
      id === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(undefined),
    );

    await expect(service.run()).resolves.toBeUndefined();
    expect(mockInsertKaiyaku).toHaveBeenCalledTimes(2); // 2件目も試行される
  });

  it('should resolve without calling insertKaiyaku when nothing is due', async () => {
    db.query.mockResolvedValue([]);

    await service.run();

    expect(mockInsertKaiyaku).not.toHaveBeenCalled();
  });

  // 顧客要件 2026-07: 本バッチは自社クラウド内で完結し、電子版へは push しない。
  // 以前は解約確定後に cancel を push していたが、抽出条件（master の中止日）は
  // 解約後も真のままで push が insertKaiyaku の結果と無関係だったため、解約済みの
  // 購読者へ毎晩 cancel を送り続けていた（回帰防止）。
  it('電子版の行でも外部連携（push）を一切行わない', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '4' }]);
    managerMock.findOne.mockResolvedValue({
      dokusyaId: 4,
      dokusyaShubetsu: DokusyaShubetsu.DIGITAL,
      dokusyaChushiDate: '2026-08-31',
    });

    await service.run();

    // master 参照そのものが不要になった（push 用の findOne が消えた）。
    expect(managerMock.findOne).not.toHaveBeenCalled();
    expect(mockInsertKaiyaku).toHaveBeenCalledWith(managerMock, 4, expect.any(String));
  });

  // 外部呼び出しが無くなったので、同日に2回流しても DB 書込みは insertKaiyaku の
  // 冪等ガード任せで副作用ゼロ。行あたり1回ずつ呼ばれるだけであること。
  it('同日に2回実行しても行あたり insertKaiyaku 1回・外部呼び出し無し', async () => {
    db.query.mockResolvedValue([{ dokusya_id: '4' }]);
    managerMock.findOne.mockResolvedValue({
      dokusyaId: 4,
      dokusyaShubetsu: DokusyaShubetsu.DIGITAL,
      dokusyaChushiDate: '2026-08-31',
    });

    await service.run();
    await service.run();

    expect(mockInsertKaiyaku).toHaveBeenCalledTimes(2); // 2実行 × 1行
    expect(managerMock.findOne).not.toHaveBeenCalled();
  });
});

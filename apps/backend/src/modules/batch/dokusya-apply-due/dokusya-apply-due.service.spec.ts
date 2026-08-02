import { DataSource } from 'typeorm';
import { DokusyaApplyDueService } from './dokusya-apply-due.service';
import { DokusyaKaiyakuService } from './dokusya-kaiyaku.service';
import { DokusyaRecomputeService } from './dokusya-recompute.service';

/**
 * advisory lock を握れた体の QueryRunner モック。`locked` を false にすると
 * 「前回実行がまだ動いている」ケースを再現できる。
 */
function buildDb(locked = true) {
  const qr = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(async (sql: string) =>
      sql.includes('pg_try_advisory_lock') ? [{ locked }] : undefined,
    ),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const db = {
    createQueryRunner: jest.fn(() => qr),
  } as unknown as DataSource;
  return { db, qr };
}

const stage = (ok: number, ng: number, calls?: string[], label?: string) => ({
  run: jest.fn(async () => {
    if (calls && label) calls.push(label);
    return { ok, ng };
  }),
});

describe('DokusyaApplyDueService', () => {
  it('should run kaiyaku BEFORE recompute (order guarantee 解約 → 反映)', async () => {
    const calls: string[] = [];
    const kaiyaku = stage(1, 0, calls, 'kaiyaku');
    const recompute = stage(1, 0, calls, 'recompute');
    const { db } = buildDb();

    const service = new DokusyaApplyDueService(
      db,
      kaiyaku as unknown as DokusyaKaiyakuService,
      recompute as unknown as DokusyaRecomputeService,
    );

    await service.run();

    expect(calls).toEqual(['kaiyaku', 'recompute']);
    expect(kaiyaku.run).toHaveBeenCalledTimes(1);
    expect(recompute.run).toHaveBeenCalledTimes(1);
  });

  // ── 多重起動防止 ────────────────────────────────────────────────
  // 前回実行と重なると同じ購読者を2本の tx が処理し、片方が毎行
  // uq_t_dokusya_rireki 違反で落ちて ng が跳ね上がる（本物の障害と区別できない）。

  it('should skip both stages when the advisory lock is already held', async () => {
    const kaiyaku = stage(0, 0);
    const recompute = stage(0, 0);
    const { db, qr } = buildDb(false); // 前回実行が進行中

    const service = new DokusyaApplyDueService(
      db,
      kaiyaku as unknown as DokusyaKaiyakuService,
      recompute as unknown as DokusyaRecomputeService,
    );

    await service.run(); // skip は異常ではないので throw しない

    expect(kaiyaku.run).not.toHaveBeenCalled();
    expect(recompute.run).not.toHaveBeenCalled();
    expect(qr.release).toHaveBeenCalled(); // 接続は必ず返す
  });

  it('should release the lock and the connection even when a stage throws', async () => {
    const kaiyaku = { run: jest.fn().mockRejectedValue(new Error('boom')) };
    const recompute = stage(0, 0);
    const { db, qr } = buildDb();

    const service = new DokusyaApplyDueService(
      db,
      kaiyaku as unknown as DokusyaKaiyakuService,
      recompute as unknown as DokusyaRecomputeService,
    );

    await expect(service.run()).rejects.toThrow('boom');

    const unlocked = qr.query.mock.calls.some(([sql]: [string]) =>
      sql.includes('pg_advisory_unlock'),
    );
    expect(unlocked).toBe(true);
    expect(qr.release).toHaveBeenCalled();
  });

  // ── 失敗を成功として報告しない ──────────────────────────────────
  // 以前は ng をログに出すだけで exit code 0 だった。全件失敗しても
  // EventBridge / ECS は成功と見なし、誰も気づけなかった。

  it('should throw (→ exit 1) when any subscriber failed', async () => {
    const kaiyaku = stage(3, 2);
    const recompute = stage(10, 1);
    const { db } = buildDb();

    const service = new DokusyaApplyDueService(
      db,
      kaiyaku as unknown as DokusyaKaiyakuService,
      recompute as unknown as DokusyaRecomputeService,
    );

    await expect(service.run()).rejects.toThrow(/3 subscriber\(s\) failed/);
  });

  it('should still run recompute when kaiyaku had failures (段の失敗で次段を巻き添えにしない)', async () => {
    const kaiyaku = stage(0, 5);
    const recompute = stage(7, 0);
    const { db } = buildDb();

    const service = new DokusyaApplyDueService(
      db,
      kaiyaku as unknown as DokusyaKaiyakuService,
      recompute as unknown as DokusyaRecomputeService,
    );

    await expect(service.run()).rejects.toThrow();

    // 第1段が5件落ちても第2段は完走している（throw は集計後）。
    expect(recompute.run).toHaveBeenCalledTimes(1);
  });

  it('should resolve normally when every subscriber succeeded', async () => {
    const kaiyaku = stage(3, 0);
    const recompute = stage(9, 0);
    const { db } = buildDb();

    const service = new DokusyaApplyDueService(
      db,
      kaiyaku as unknown as DokusyaKaiyakuService,
      recompute as unknown as DokusyaRecomputeService,
    );

    await expect(service.run()).resolves.toBeUndefined();
  });
});

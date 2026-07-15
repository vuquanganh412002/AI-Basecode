// 電子版連携 Pha 2 — ワーカー（consumer）のユニットテスト。
//
// ここで守りたい不変条件:
//   - create 成功 → 電子版が採番した会員IDを必ず保存する（失うと以後送れない）
//   - 会員ID未採番の update は「待つ」（create の追い越しを防ぐ）
//   - 再送可 (E05/P99) と 再送不可 (V**/P**) を取り違えない
//   - 再送不可のときだけ t_log(ERROR) を書く（瞬断でログを埋めない）

import { Job, UnrecoverableError } from 'bullmq';

import { buildDokusya } from '@test/fixtures/dokusya.factory';
import type { Dokusya } from '@/database/entities/dokusya.entity';

import { DenshibanSyncException } from './denshiban-sync.exception';
import type { DenshibanSyncJob } from './denshiban-sync.service';
import { DenshibanSyncWorker } from './denshiban-sync.worker';

const NOW = new Date('2026-07-14T03:00:00Z'); // 2026-07-14 12:00 JST

function buildDenshiDokusya(overrides: Partial<Dokusya> = {}): Dokusya {
  return buildDokusya({
    dokusyaId: 42,
    kanriShitenId: 11,
    dokusyaShubetsu: 2,
    denshiKaiinId: 98765,
    dokusyaKaishiDate: '2026-07-14', // NOW と同日 → payment_start = '0'
    dokusyasoBunrui: '農業者',
    nogyosyaBunrui: '米',
    biko: '',
    ...overrides,
  });
}

function buildJob(overrides: Partial<DenshibanSyncJob> = {}): Job<DenshibanSyncJob> {
  return {
    id: 'job-1',
    attemptsMade: 0,
    data: {
      dokusya_id: 42,
      mode: 'create',
      operator_account_id: 7,
      operator_ja_id: 3,
      operator_kanri_shiten_id: 11,
      ...overrides,
    },
  } as Job<DenshibanSyncJob>;
}

interface Harness {
  worker: DenshibanSyncWorker;
  dokusyaRepo: { findOne: jest.Mock; update: jest.Mock };
  api: { send: jest.Mock };
  auditLog: { logError: jest.Mock };
}

function buildHarness(dokusya: Dokusya | null = buildDenshiDokusya()): Harness {
  const dokusyaRepo = {
    findOne: jest.fn().mockResolvedValue(dokusya),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const kanriShitenRepo = {
    findOne: jest.fn().mockResolvedValue({ kanriShitenCode: '1234567890' }),
  };
  const api = { send: jest.fn().mockResolvedValue({ statusCode: '0', id: '55555' }) };
  const auditLog = { logError: jest.fn().mockResolvedValue(undefined) };

  const worker = new DenshibanSyncWorker(
    dokusyaRepo as never,
    kanriShitenRepo as never,
    api as never,
    auditLog as never,
  );
  return { worker, dokusyaRepo, api, auditLog };
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('DenshibanSyncWorker — 正常系', () => {
  it('create 成功で電子版が採番した会員IDを保存する', async () => {
    const h = buildHarness(buildDenshiDokusya({ denshiKaiinId: null }));

    await h.worker.process(buildJob({ mode: 'create' }));

    expect(h.api.send).toHaveBeenCalledWith(
      expect.objectContaining({ action_kbn: 'create', jacd_execute: '1234567890' }),
    );
    expect(h.dokusyaRepo.update).toHaveBeenCalledWith(
      { dokusyaId: 42 },
      { denshiKaiinId: 55555 },
    );
  });

  it('payment_start は送信直前の時計で解決される（当日 → 0）', async () => {
    const h = buildHarness(
      buildDenshiDokusya({ denshiKaiinId: null, dokusyaKaishiDate: '2026-08-01' }),
    );

    await h.worker.process(buildJob({ mode: 'create' }));

    // NOW = 2026-07-14 JST → 翌月1日 = 2026-08-01 → '1'
    expect(h.api.send).toHaveBeenCalledWith(
      expect.objectContaining({ payment_start: '1' }),
    );
  });

  it('update は変更された項目だけ送る', async () => {
    const h = buildHarness(buildDenshiDokusya({ tatemonoMei: '新ビル' }));

    await h.worker.process(
      buildJob({
        mode: 'update',
        before: buildDenshiDokusya({ tatemonoMei: '旧ビル' }) as never,
      }),
    );

    const payload = h.api.send.mock.calls[0][0];
    expect(payload).toMatchObject({
      action_kbn: 'update',
      id: '98765',
      building: '新ビル',
    });
    // 変わっていない氏名は載らない（§C-3 差分送信）。
    expect(payload.first_name).toBeUndefined();
    // update に会員IDの再保存は無い。
    expect(h.dokusyaRepo.update).not.toHaveBeenCalled();
  });

  it('cancel は cancel_ym / notify_flg を載せる', async () => {
    const h = buildHarness();

    await h.worker.process(
      buildJob({ mode: 'cancel', cancel_ym: '202609', notify_flg: '1' }),
    );

    expect(h.api.send).toHaveBeenCalledWith({
      action_kbn: 'cancel',
      jacd_execute: '1234567890',
      id: '98765',
      cancel_ym: '202609',
      notify_flg: '1',
    });
  });
});

describe('DenshibanSyncWorker — 送信対象外', () => {
  it('行が消えていたら ack して終わる（再送しても復活しない）', async () => {
    const h = buildHarness(null);

    await expect(h.worker.process(buildJob())).resolves.toBeUndefined();
    expect(h.api.send).not.toHaveBeenCalled();
  });

  it('キュー滞留中に紙のみへ変わっていたら送らない', async () => {
    const h = buildHarness(buildDenshiDokusya({ dokusyaShubetsu: 1 }));

    await expect(h.worker.process(buildJob())).resolves.toBeUndefined();
    expect(h.api.send).not.toHaveBeenCalled();
  });
});

describe('DenshibanSyncWorker — 失敗の分岐', () => {
  it('会員ID未採番の update は待つ（再送可能なエラー）', async () => {
    const h = buildHarness(buildDenshiDokusya({ denshiKaiinId: null }));
    const job = buildJob({ mode: 'update', before: buildDenshiDokusya() as never });

    const err = await h.worker.process(job).catch((e: Error) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(UnrecoverableError);
    expect(h.api.send).not.toHaveBeenCalled();
    // 再送するので監査ログはまだ書かない。
    expect(h.auditLog.logError).not.toHaveBeenCalled();
  });

  it('待ちきれなければ DLQ に落として t_log(ERROR) を残す', async () => {
    const h = buildHarness(buildDenshiDokusya({ denshiKaiinId: null }));
    const job = buildJob({ mode: 'update', before: buildDenshiDokusya() as never });
    (job as { attemptsMade: number }).attemptsMade = 4; // 5回目 = 上限

    const err = await h.worker.process(job).catch((e: Error) => e);

    expect(err).toBeInstanceOf(UnrecoverableError);
    expect(h.auditLog.logError).toHaveBeenCalled();
  });

  it('E05（300秒超過）は再送させる — 監査ログは書かない', async () => {
    const h = buildHarness();
    h.api.send.mockRejectedValue(new DenshibanSyncException('E05', 'timeout'));

    const err = await h.worker.process(buildJob({ mode: 'approve' })).catch((e) => e);

    expect(err).toBeInstanceOf(DenshibanSyncException);
    expect(err).not.toBeInstanceOf(UnrecoverableError);
    expect(h.auditLog.logError).not.toHaveBeenCalled();
  });

  it('P01（メール重複）は再送せず DLQ + t_log(ERROR)', async () => {
    const h = buildHarness();
    h.api.send.mockRejectedValue(new DenshibanSyncException('P01', 'duplicate email'));

    const err = await h.worker.process(buildJob({ mode: 'approve' })).catch((e) => e);

    expect(err).toBeInstanceOf(UnrecoverableError);
    expect(h.auditLog.logError).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: 42, accountId: 7, table: 't_dokusya' }),
      'SYNC_DENSHIBAN',
      expect.objectContaining({ message: expect.stringContaining('P01') }),
    );
  });

  it('ネットワーク障害は再送させる', async () => {
    const h = buildHarness();
    h.api.send.mockRejectedValue(new Error('電子版APIに到達できません'));

    const err = await h.worker.process(buildJob({ mode: 'approve' })).catch((e) => e);

    expect(err).not.toBeInstanceOf(UnrecoverableError);
    expect(h.auditLog.logError).not.toHaveBeenCalled();
  });

  it('マッピング不能（購読開始日が2値で表現できない）は再送せず DLQ', async () => {
    const h = buildHarness(
      buildDenshiDokusya({ denshiKaiinId: null, dokusyaKaishiDate: '2026-07-20' }),
    );

    const err = await h.worker.process(buildJob({ mode: 'create' })).catch((e) => e);

    expect(err).toBeInstanceOf(UnrecoverableError);
    expect(h.api.send).not.toHaveBeenCalled();
    expect(h.auditLog.logError).toHaveBeenCalled();
  });

  it('create 成功なのに会員IDが返らないのは異常 — 再送せず気付かせる', async () => {
    const h = buildHarness(buildDenshiDokusya({ denshiKaiinId: null }));
    h.api.send.mockResolvedValue({ statusCode: '0', message: 'OK' });

    const err = await h.worker.process(buildJob({ mode: 'create' })).catch((e) => e);

    // 重複登録になるので再送は不可。人間が紐付ける。
    expect(err).toBeInstanceOf(UnrecoverableError);
    expect(h.dokusyaRepo.update).not.toHaveBeenCalled();
    expect(h.auditLog.logError).toHaveBeenCalled();
  });
});

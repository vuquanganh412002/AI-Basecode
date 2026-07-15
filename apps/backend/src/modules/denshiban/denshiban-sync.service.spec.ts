// 電子版連携 Pha 2 — trigger（producer）のユニットテスト。
//
// trigger の契約は2つだけ:
//   1. 電子版のみ (2) だけ積む。併読 (3)・紙のみ (1) は積まない。
//   2. 何があっても投げない（電子版の障害で cloud の業務を止めない）。

import type { Queue } from 'bullmq';

import { buildDokusya } from '@test/fixtures/dokusya.factory';
import type { SessionPayload } from '@/modules/auth/session.service';

import {
  DenshibanSyncService,
  JOB_NAME_DENSHIBAN_SYNC,
} from './denshiban-sync.service';

const SESSION = {
  account_id: 7,
  login_id: 'ja01',
  role_id: 4,
  role_code: 'JA_HONTEN',
  ja_id: 3,
  kanri_shiten_id: 11,
  shiten_id: null,
  permissions: [],
} as unknown as SessionPayload;

function buildQueue() {
  return { add: jest.fn().mockResolvedValue({ id: 'job-1' }) } as unknown as Queue;
}

describe('DenshibanSyncService.trigger', () => {
  it('電子版読者 (2) はジョブを積む', async () => {
    const queue = buildQueue();
    const dokusya = buildDokusya({ dokusyaId: 42, dokusyaShubetsu: 2 });

    await new DenshibanSyncService(queue).trigger({
      dokusya,
      mode: 'create',
      session: SESSION,
    });

    expect(queue.add).toHaveBeenCalledWith(
      JOB_NAME_DENSHIBAN_SYNC,
      expect.objectContaining({
        dokusya_id: 42,
        mode: 'create',
        operator_account_id: 7,
        operator_kanri_shiten_id: 11,
      }),
    );
  });

  it('併読 (3) は積まない — 電子版のみが同期対象（顧客決定）', async () => {
    const queue = buildQueue();

    await new DenshibanSyncService(queue).trigger({
      dokusya: buildDokusya({ dokusyaShubetsu: 3 }),
      mode: 'update',
      session: SESSION,
      before: buildDokusya({ dokusyaShubetsu: 3 }),
    });

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('紙のみ (1) は積まない — 電子版に会員が存在しない', async () => {
    const queue = buildQueue();

    await new DenshibanSyncService(queue).trigger({
      dokusya: buildDokusya({ dokusyaShubetsu: 1 }),
      mode: 'create',
      session: SESSION,
    });

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('update は変更前スナップショットをジョブに載せる', async () => {
    const queue = buildQueue();
    const before = buildDokusya({ dokusyaShubetsu: 2, shimeiSei: '旧姓' });

    await new DenshibanSyncService(queue).trigger({
      dokusya: buildDokusya({ dokusyaShubetsu: 2, shimeiSei: '新姓' }),
      mode: 'update',
      session: SESSION,
      before,
    });

    const job = (queue.add as jest.Mock).mock.calls[0][1];
    expect(job.before).toMatchObject({ shimeiSei: '旧姓' });
  });

  it('cancel_ym / notify_flg をそのまま渡す', async () => {
    const queue = buildQueue();

    await new DenshibanSyncService(queue).trigger({
      dokusya: buildDokusya({ dokusyaShubetsu: 2 }),
      mode: 'cancel',
      session: SESSION,
      cancelYm: '202609',
      notifyFlg: '1',
    });

    expect(queue.add).toHaveBeenCalledWith(
      JOB_NAME_DENSHIBAN_SYNC,
      expect.objectContaining({ cancel_ym: '202609', notify_flg: '1' }),
    );
  });

  it('Redis 障害でも投げない — 業務は止めない', async () => {
    const queue = {
      add: jest.fn().mockRejectedValue(new Error('Redis unreachable')),
    } as unknown as Queue;

    await expect(
      new DenshibanSyncService(queue).trigger({
        dokusya: buildDokusya({ dokusyaShubetsu: 2 }),
        mode: 'create',
        session: SESSION,
      }),
    ).resolves.toBeUndefined();
  });

  it('キュー未配線（テスト環境）でも投げない', async () => {
    await expect(
      new DenshibanSyncService(undefined).trigger({
        dokusya: buildDokusya({ dokusyaShubetsu: 2 }),
        mode: 'create',
        session: SESSION,
      }),
    ).resolves.toBeUndefined();
  });
});

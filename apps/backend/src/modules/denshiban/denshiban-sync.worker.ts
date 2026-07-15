import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { Repository } from 'typeorm';

import { AuditOperation } from '@/common/enums';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { QUEUE_DENSHIBAN_SYNC } from '@/modules/queue/queue-names.constants';

import { DenshibanApiService } from './denshiban-api.service';
import { toPaymentStart } from './denshiban-payment-start';
import {
  buildCommandPayload,
  buildCreatePayload,
  buildUpdatePayload,
  DenshibanMappingError,
  type BuildCtx,
  type DenshibanPayload,
} from './denshiban-payload.builder';
import { assertPayload } from './denshiban-payload.validator';
import {
  isDenshibanSubscriber,
  type DenshibanSyncJob,
} from './denshiban-sync.service';
import { DenshibanSyncException } from './denshiban-sync.exception';

/**
 * 電子版 会員情報送信ワーカー（Pha 2 の消費側）。
 *
 *   1. `t_dokusya` を **読み直す**（enqueue 後に更に更新されている可能性がある）
 *   2. `create` 未完了（`denshi_kaiin_id` が NULL）なら後続モードは**待つ**
 *   3. `m_kanri_shiten` から `jacd_execute` / `jacd` を解決（DB引きはここだけ）
 *   4. `toPaymentStart()` → `build*Payload()` → `assertPayload()` → `send()`
 *   5. `create` 成功 → 電子版が採番した会員IDを `denshi_kaiin_id` に保存
 *   6. 失敗 → `statusCode` で再送 or DLQ（`t_log` に ERROR を残す）
 *
 * **`concurrency: 1`** — 同一読者の `create` を `update` が追い越すと、電子版に
 * 存在しない会員への更新になり `P0x` で落ちる。BullMQ の per-job-key 直列化は
 * FlowProducer を要するので、ここは素直にキュー全体を直列にしている。同期対象は
 * 読者の登録・変更操作だけで秒間数件のオーダー、直列で十分間に合う。詰まりが
 * 見えたら「dokusya_id でシャーディングした複数キュー」が次の一手。
 */
@Processor(QUEUE_DENSHIBAN_SYNC, { concurrency: 1 })
export class DenshibanSyncWorker extends WorkerHost {
  private readonly logger = new Logger(DenshibanSyncWorker.name);

  private static readonly SCREEN_NAME = '電子版連携 (denshiban-sync worker)';
  private static readonly TABLE_NAME = 't_dokusya';

  /** `create` の完了待ちで諦めるまでの試行回数。 */
  private static readonly MAX_WAIT_FOR_CREATE_ATTEMPTS = 5;

  constructor(
    @InjectRepository(Dokusya)
    private readonly dokusyaRepo: Repository<Dokusya>,
    @InjectRepository(KanriShiten)
    private readonly kanriShitenRepo: Repository<KanriShiten>,
    private readonly api: DenshibanApiService,
    private readonly auditLog: AuditLogService,
  ) {
    super();
  }

  async process(job: Job<DenshibanSyncJob>): Promise<void> {
    const data = job.data;
    const ctx = { jobId: job.id, dokusya_id: data.dokusya_id, mode: data.mode };

    try {
      const payload = await this.buildPayload(job);
      if (!payload) return; // 送信対象外 — ack して終わり。

      const result = await this.api.send(payload);

      if (data.mode === 'create') {
        // 電子版が採番した会員ID。これを取り込まないと、以後の update / cancel が
        // 一切送れなくなる（`id` が必須）。
        await this.saveKaiinId(data.dokusya_id, result.id);
      }

      this.logger.log({ event: 'denshiban.sync.done', ...ctx });
    } catch (err) {
      await this.handleFailure(job, err as Error);
    }
  }

  // ── 組み立て ────────────────────────────────────────────────────────────

  /**
   * ジョブから送信ペイロードを作る。送信対象外なら `null`。
   *
   * @throws {Error} `create` 未完了で待つべきとき（BullMQ に再送させる）。
   * @throws {DenshibanMappingError} cloud のデータが電子版で表現できないとき。
   */
  private async buildPayload(
    job: Job<DenshibanSyncJob>,
  ): Promise<DenshibanPayload | null> {
    const data = job.data;

    // [read-back] enqueue 後に更に更新されている可能性があるので必ず読み直す。
    // `withDeleted` — 論理削除された読者にも「解約」を送る必要がある。cloud で
    // 消したことは、電子版側の会員を放置してよい理由にならない。
    const dokusya = await this.dokusyaRepo.findOne({
      where: { dokusyaId: data.dokusya_id },
      withDeleted: true,
    });
    if (!dokusya) {
      // 行が物理的に無い＝送る中身が無い。再送しても復活しないので ack する。
      this.logger.warn({
        event: 'denshiban.sync.skip.row_missing',
        dokusya_id: data.dokusya_id,
      });
      return null;
    }

    if (!isDenshibanSubscriber(dokusya.dokusyaShubetsu)) {
      // enqueue 後に「電子版のみ → 併読/紙のみ」へ変わったケース。producer 側の
      // 門番と二重になるが、キューの滞留中に状態が変わりうる以上ここでも見る。
      this.logger.warn({
        event: 'denshiban.sync.skip.not_digital_only',
        dokusya_id: data.dokusya_id,
        dokusya_shubetsu: dokusya.dokusyaShubetsu,
      });
      return null;
    }

    // [wait-for-create] `create` 以外は電子版の会員IDが要る。まだ NULL なのは
    // 「同じ読者の create ジョブがまだ通っていない」状態。エラーとして投げ、
    // BullMQ の指数バックオフで待つ（concurrency=1 なので通常は起きない —
    // create が Redis 障害等で失敗して後回しになった場合の保険）。
    if (data.mode !== 'create' && dokusya.denshiKaiinId == null) {
      if (job.attemptsMade + 1 >= DenshibanSyncWorker.MAX_WAIT_FOR_CREATE_ATTEMPTS) {
        throw new UnrecoverableError(
          `読者 ${data.dokusya_id} の電子版会員ID (denshi_kaiin_id) が未採番のままです。` +
            'create の同期が失敗している可能性があります。',
        );
      }
      throw new Error(
        `読者 ${data.dokusya_id} の電子版会員IDが未採番。create の完了を待って再送します。`,
      );
    }

    const buildCtx = await this.resolveCtx(job, dokusya);

    if (data.mode === 'create') {
      return buildCreatePayloadChecked(dokusya, buildCtx);
    }
    if (data.mode === 'update' || data.mode === 'reread') {
      if (!data.before) {
        // 差分が取れない = 何を送るべきか決められない。全項目送ると、他の端末が
        // 同時に入れた変更を巻き戻しかねない。落として気付かせる。
        throw new UnrecoverableError(
          `mode=${data.mode} には変更前スナップショット (before) が必要です。`,
        );
      }
      const before = data.before as unknown as Dokusya;
      const payload = buildUpdatePayload(before, dokusya, buildCtx, data.mode);
      assertPayload(payload);
      return payload;
    }
    // cancel / approve / unapprove
    const payload = buildCommandPayload(dokusya, buildCtx, data.mode);
    assertPayload(payload);
    return payload;
  }

  /**
   * `jacd_execute`（実行JA）と `jacd`（所属JA）を `m_kanri_shiten` から解決する。
   *
   * - `jacd_execute` = 操作者の管理支店コード。日農本部アカウント（管理支店を
   *   持たない）は代行入力なので、対象読者の管理支店コードを実行JAとして使う。
   * - `jacd` = 読者側の管理支店コード。実行JAと同じなら送らない（任意項目 —
   *   §A では JA 間移管のためのフィールド）。
   */
  private async resolveCtx(
    job: Job<DenshibanSyncJob>,
    dokusya: Dokusya,
  ): Promise<BuildCtx> {
    const data = job.data;

    const recordJacd = await this.kanriShitenCode(dokusya.kanriShitenId);
    const operatorJacd = data.operator_kanri_shiten_id
      ? await this.kanriShitenCode(data.operator_kanri_shiten_id)
      : null;

    const jacdExecute = operatorJacd ?? recordJacd;
    if (!jacdExecute) {
      throw new DenshibanMappingError(
        'kanri_shiten_id',
        `管理支店コード (jacd_execute) を解決できません（読者 ${dokusya.dokusyaId}）。`,
      );
    }

    const ctx: BuildCtx = {
      jacdExecute,
      jacd: recordJacd && recordJacd !== jacdExecute ? recordJacd : undefined,
      notifyFlg: data.notify_flg ?? '0',
      cancelYm: data.cancel_ym,
    };

    // [payment_start] 時計依存の唯一の変換。**送信直前のいま**で解決する — 電子版は
    // 0/1 を「受信した瞬間の日付」で解釈するため、enqueue 時刻で決めると月境界を
    // またいだ再送で購読開始日がずれる。
    if (data.mode === 'create' || data.mode === 'approve' || data.mode === 'unapprove') {
      ctx.paymentStart = toPaymentStart(dokusya.dokusyaKaishiDate);
    }

    return ctx;
  }

  private async kanriShitenCode(id: number | null): Promise<string | null> {
    if (id == null) return null;
    const row = await this.kanriShitenRepo.findOne({
      where: { kanriShitenId: id },
      withDeleted: true,
    });
    return row?.kanriShitenCode ?? null;
  }

  // ── 後始末 ──────────────────────────────────────────────────────────────

  /** `create` 成功時に電子版が採番した会員IDを保存する。 */
  private async saveKaiinId(dokusyaId: number, id: string | undefined): Promise<void> {
    const kaiinId = Number(id);
    if (!id || !Number.isInteger(kaiinId)) {
      // 成功応答なのに会員IDが無い＝仕様違反。電子版には会員ができているのに
      // cloud が紐付けを失う（以後 update / cancel が送れない）最悪の状態なので、
      // 黙って進めず落として運用者に見せる。再送は重複登録になるため不可。
      throw new UnrecoverableError(
        `電子版が create に成功しましたが会員ID (id) を返しませんでした（読者 ${dokusyaId}）。` +
          '電子版側の会員と手動で紐付けてください。',
      );
    }
    await this.dokusyaRepo.update({ dokusyaId }, { denshiKaiinId: kaiinId });
    this.logger.log({
      event: 'denshiban.sync.kaiin_id.saved',
      dokusya_id: dokusyaId,
      denshi_kaiin_id: kaiinId,
    });
  }

  /**
   * 失敗を `t_log`(ERROR) に残し、**再送するか DLQ に落とすか**を決めて投げ直す。
   *
   * - 再送可: そのまま投げる → BullMQ の指数バックオフ（既定 5 回）。
   * - 再送不可: `UnrecoverableError` に包む → 即 failed（= DLQ）。
   *
   * 再送不可の代表は `V**`（書式違反）と `P**`（業務違反）— データを直さない限り
   * 何度送っても同じ結果で、キューを無駄に温めるだけ。マッピング不能
   * （{@link DenshibanMappingError}）も同じ扱い。
   */
  private async handleFailure(job: Job<DenshibanSyncJob>, err: Error): Promise<void> {
    const data = job.data;
    const statusCode =
      err instanceof DenshibanSyncException ? err.statusCode : undefined;

    const unrecoverable =
      err instanceof UnrecoverableError ||
      err instanceof DenshibanMappingError ||
      (err instanceof DenshibanSyncException && !err.retryable);

    this.logger.error({
      event: 'denshiban.sync.failed',
      jobId: job.id,
      dokusya_id: data.dokusya_id,
      mode: data.mode,
      statusCode,
      unrecoverable,
      attempt: job.attemptsMade + 1,
      err: err.message,
    });

    // 監査ログ（t_log log_type=3）は「もう再送しない」ときだけ書く。再送のたびに
    // 積むと、一時的なネットワーク瞬断で運用者の画面がエラーで埋まる。
    if (unrecoverable) {
      await this.auditLog.logError(
        {
          accountId: data.operator_account_id,
          jaId: data.operator_ja_id,
          screen: DenshibanSyncWorker.SCREEN_NAME,
          table: DenshibanSyncWorker.TABLE_NAME,
          targetId: data.dokusya_id,
          ipAddress: '',
          userAgent: 'worker:denshiban-sync',
        },
        AuditOperation.SYNC_DENSHIBAN,
        new Error(
          `[${data.mode}]${statusCode ? ` statusCode=${statusCode}` : ''} ${err.message}`,
        ),
      );
      throw err instanceof UnrecoverableError
        ? err
        : new UnrecoverableError(err.message);
    }

    throw err;
  }
}

/** create のみ validator を通す薄いラッパ（分岐を1か所に集めるため）。 */
function buildCreatePayloadChecked(dokusya: Dokusya, ctx: BuildCtx): DenshibanPayload {
  const payload = buildCreatePayload(dokusya, ctx);
  assertPayload(payload);
  return payload;
}

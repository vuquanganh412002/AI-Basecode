import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';

import { DokusyaShubetsu } from '@/common/enums';
import type { Dokusya } from '@/database/entities/dokusya.entity';
import type { SessionPayload } from '@/modules/auth/session.service';
import { QUEUE_DENSHIBAN_SYNC } from '@/modules/queue/queue-names.constants';

import type { DenshibanMode } from './denshiban-payload.builder';

/**
 * 電子版への送信を **業務ロジックから依頼する唯一の入口**（Pha 2 の trigger）。
 *
 * `DokusyaService`（Pha 3）はこのサービスの {@link trigger} だけを呼ぶ。
 * ペイロードの組み立ても、暗号化も、リトライも、ここから先の関心事。
 *
 * 契約 — 呼び出し側が守るべき2点:
 *
 * 1. **COMMIT した後に呼ぶ**。トランザクションの中で呼ぶと、まだ見えない行を
 *    ワーカーが読みに行って「行が無い」で落ちる。
 * 2. **戻り値を待たなくてよい**。この関数は絶対に投げない — 電子版が落ちていても
 *    cloud 側の登録・更新は成立させる（同期は cloud の業務の従属物）。
 */
@Injectable()
export class DenshibanSyncService {
  private readonly logger = new Logger(DenshibanSyncService.name);

  /**
   * Queue は optional — BullMQ / Redis を立てずに `DokusyaService` の
   * ユニットテストを回せるようにするため（`NotificationQueueService` と同じ方針）。
   * 本番DIでは Global な `QueueModule` から実体が刺さる。
   */
  constructor(
    @Optional()
    @InjectQueue(QUEUE_DENSHIBAN_SYNC)
    private readonly queue?: Queue,
  ) {}

  /**
   * 送信ジョブを積む。**投げない**（エラーはログに落として飲み込む）。
   *
   * ここでやることは2つだけ:
   *   1. 送信対象かの門番 — 紙のみの読者 (`dokusya_shubetsu = 1`) は積まない。
   *   2. enqueue。DB引きも HTTP もしない（どちらもワーカーの仕事）。
   */
  async trigger(input: DenshibanSyncInput): Promise<void> {
    const { dokusya, mode, session } = input;

    // ── 門番: 電子版のみ (2) だけが同期対象 ──────────────────────────────
    // 併読 (3)・紙のみ (1) は同期しない（顧客決定 — 併読は電子版側で別登録）。
    if (!isDenshibanSubscriber(dokusya.dokusyaShubetsu)) {
      this.logger.debug({
        event: 'denshiban.sync.skip.not_digital_only',
        dokusya_id: dokusya.dokusyaId,
        dokusya_shubetsu: dokusya.dokusyaShubetsu,
        mode,
      });
      return;
    }

    const job: DenshibanSyncJob = {
      dokusya_id: dokusya.dokusyaId,
      mode,
      operator_account_id: session.account_id,
      operator_ja_id: session.ja_id,
      operator_kanri_shiten_id: session.kanri_shiten_id,
      cancel_ym: input.cancelYm,
      notify_flg: input.notifyFlg,
      // update / reread は「変わった項目だけ」送る仕様。変更前の姿は COMMIT 後に
      // DB から読み直せない（もう上書き済み）ので、ここでスナップショットを
      // ジョブに載せて運ぶ。
      before: input.before ? toSnapshot(input.before) : undefined,
    };

    try {
      if (!this.queue) {
        // BullMQ 未配線（ユニットテスト等）。落とさず、積めなかった事実だけ残す。
        this.logger.warn({ event: 'denshiban.sync.enqueue.no_queue', ...job });
        return;
      }
      const bullJob = await this.queue.add(JOB_NAME_DENSHIBAN_SYNC, job);
      this.logger.log({
        event: 'denshiban.sync.enqueue',
        jobId: bullJob.id,
        dokusya_id: job.dokusya_id,
        mode,
      });
    } catch (err) {
      // Redis 障害でも業務は止めない。ただし「同期が落ちた」ことは必ず見えるように。
      this.logger.error({
        event: 'denshiban.sync.enqueue.failed',
        dokusya_id: job.dokusya_id,
        mode,
        err: (err as Error).message,
      });
    }
  }
}

/** BullMQ のジョブ名（`Queue.add(name, data)` の name）。 */
export const JOB_NAME_DENSHIBAN_SYNC = 'sync-user-info';

/** 業務ロジック → {@link DenshibanSyncService.trigger} の引数。 */
export interface DenshibanSyncInput {
  /** 同期対象の読者（COMMIT 後の姿）。 */
  dokusya: Dokusya;
  mode: DenshibanMode;
  /** 操作者。`jacd_execute` と監査ログの主体になる。 */
  session: SessionPayload;
  /** 解約月 `YYYYMM` — `cancel` で必須。 */
  cancelYm?: string;
  /** 会員への通知フラグ。既定 `'0'`（通知しない）。 */
  notifyFlg?: '0' | '1';
  /** 変更前の姿 — `update` / `reread` で必須（差分送信のため）。 */
  before?: Dokusya;
}

/**
 * キューに載るジョブ本体。**ID と最小限の文脈だけ**を運ぶ（`before` は例外 —
 * 上書き後には復元できないため）。最新の姿はワーカーが DB から読み直す。
 */
export interface DenshibanSyncJob {
  dokusya_id: number;
  mode: DenshibanMode;
  operator_account_id: number | null;
  operator_ja_id: number | null;
  operator_kanri_shiten_id: number | null;
  cancel_ym?: string;
  notify_flg?: '0' | '1';
  before?: Record<string, unknown>;
}

/**
 * 電子版へ同期する読者種別 — **電子版のみ (DIGITAL=2) だけ**。
 *
 * 併読 (BOTH=3) と紙のみ (PAPER=1) は同期しない（顧客決定）。併読会員は
 * 電子版側で別経路で登録されるため cloud から push しない。種別コードは m_code
 * `DOKUSYA_SHUBETSU`（Group A）の {@link DokusyaShubetsu}。
 */
export function isDenshibanSubscriber(dokusyaShubetsu: number): boolean {
  return dokusyaShubetsu === DokusyaShubetsu.DIGITAL;
}

/**
 * TypeORM エンティティを JSON 化可能な素のオブジェクトにする。
 *
 * BullMQ のジョブ本体は JSON でシリアライズされるので、そのまま入れても実質
 * 同じものが入る。ここで明示的に spread しておくのは、エンティティに将来
 * 循環参照（relation）が生えたときに黙って壊れないようにするため。
 */
function toSnapshot(entity: Dokusya): Record<string, unknown> {
  return { ...entity } as unknown as Record<string, unknown>;
}

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_FILE_UPLOAD_NOTIFICATION } from '@/modules/queue/queue-names.constants';

/**
 * SCR-023 §4.7 — ファイルアップロード通知キューの producer。
 *
 * 顧客レビュー(2026-05): 同期メール送信は ALB timeout・部分失敗のロールバック曖昧化・
 * "ブラウザを閉じた" データ損失のリスク。顧客指示のフロー:
 *   POST /file-upload → 行保存 + ジョブ enqueue(JA 毎) → HTTP 202、worker が別プロセスで消費・送信。
 *
 * 本サービスは producer 側(worker は file-upload-notification.worker.ts)。job 名は
 * BullMQ 慣習の kebab-case。payload は ID のみ持ち、worker が行を再読して最新状態を得る
 * (enqueue〜処理間に soft-delete されたケースに対応)。
 *
 * "1 job per JA"(多 JA を 1 job にまとめない)は意図的設計 — リトライ隔離のため
 * (JA-X の SES throttle が JA-Y のメール再送を強制しない。review スレッド参照)。
 */
export interface FileUploadNotificationJob {
  file_upload_id: number;
  ja_id: number;
  uploaded_by: number;
}

export interface NotificationQueue {
  enqueue(job: FileUploadNotificationJob): Promise<{ jobId: string }>;
}

/** BullMQ job 名 — `Queue.add(name, data)` の name 引数。 */
export const JOB_NAME_SEND_NOTIFICATION = 'send-notification';

@Injectable()
export class NotificationQueueService implements NotificationQueue {
  private readonly logger = new Logger(NotificationQueueService.name);

  // Queue は @Optional — unit test が BullMQ + Redis なしで起動できるように。
  // 本番 DI は global QueueModule の @InjectQueue で実 Queue を注入。null 時は
  // enqueue() が log + 疑似 jobId を返し呼び出し側の契約を維持。
  constructor(
    @Optional()
    @InjectQueue(QUEUE_FILE_UPLOAD_NOTIFICATION)
    private readonly queue?: Queue,
  ) {}

  async enqueue(job: FileUploadNotificationJob): Promise<{ jobId: string }> {
    if (!this.queue) {
      // [no-queue-fallback] test や BullMQ 未配線時、enqueue 予定を log し
      // spec の .enqueue 検証を通しつつ infra 欠如を可視化。
      const jobId = `local-${Date.now()}-${job.file_upload_id}`;
      this.logger.warn({
        event: 'notification.enqueue.no-queue',
        jobId,
        file_upload_id: job.file_upload_id,
        ja_id: job.ja_id,
      });
      return { jobId };
    }
    const bullJob = await this.queue.add(JOB_NAME_SEND_NOTIFICATION, job);
    this.logger.log({
      event: 'notification.enqueue',
      jobId: bullJob.id,
      file_upload_id: job.file_upload_id,
      ja_id: job.ja_id,
    });
    return { jobId: String(bullJob.id) };
  }
}

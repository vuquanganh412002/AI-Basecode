import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_FILE_UPLOAD_NOTIFICATION } from '@/modules/queue/queue-names.constants';

/**
 * SCR-023 §4.7 — producer for the file-upload notification queue.
 *
 * Customer review (2026-05): synchronous mail-send risks ALB timeout,
 * partial-failure rollback ambiguity, and "user-closed-browser"
 * data loss. Per customer guidance the flow MUST be:
 *
 *   POST /file-upload → save row + enqueue job (per JA) → HTTP 202
 *   Worker (separate process loop) consumes the queue, sends mail
 *
 * This service is the PRODUCER side. Worker lives in
 * `file-upload-notification.worker.ts`. Job name kebab-case to match
 * BullMQ convention; payload carries only IDs — worker re-reads the
 * row to get the latest state (handles edge cases where the row was
 * soft-deleted between enqueue and processing).
 *
 * Splitting "1 job per JA" (not "1 job covers many JAs") was an
 * explicit design choice — see review thread on retry isolation: a
 * SES throttle hit for JA-X must not force a retry of JA-Y mails.
 */
export interface FileUploadNotificationJob {
  file_upload_id: number;
  ja_id: number;
  uploaded_by: number;
}

export interface NotificationQueue {
  enqueue(job: FileUploadNotificationJob): Promise<{ jobId: string }>;
}

/** BullMQ job name — used as the `name` arg to `Queue.add(name, data)`. */
export const JOB_NAME_SEND_NOTIFICATION = 'send-notification';

@Injectable()
export class NotificationQueueService implements NotificationQueue {
  private readonly logger = new Logger(NotificationQueueService.name);

  // Queue is optional so service-layer unit tests can boot the service
  // without standing up BullMQ + Redis. Production DI wires the real
  // Queue via `@InjectQueue(QUEUE_FILE_UPLOAD_NOTIFICATION)` from the
  // global `QueueModule`. When null, `enqueue()` logs + returns a fake
  // jobId so callers see the same contract.
  constructor(
    @Optional()
    @InjectQueue(QUEUE_FILE_UPLOAD_NOTIFICATION)
    private readonly queue?: Queue,
  ) {}

  async enqueue(job: FileUploadNotificationJob): Promise<{ jobId: string }> {
    if (!this.queue) {
      // [no-queue-fallback] In tests or when BullMQ isn't wired, log
      // the would-be enqueue so spec assertions on `.enqueue` still
      // pass and observability hints at the missing infra.
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

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { AuditOperation } from '@/common/enums';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { IsNull, Repository } from 'typeorm';

import { Account } from '@/database/entities/account.entity';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { Ja } from '@/database/entities/ja.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { MailService } from '@/modules/mail/mail.service';
import { QUEUE_FILE_UPLOAD_NOTIFICATION } from '@/modules/queue/queue-names.constants';

import type { FileUploadNotificationJob } from './notification-queue.service';

/**
 * SCR-023 §6.5 — file-upload notification worker (consumer).
 *
 * Drains the `file-upload-notification` BullMQ queue. Each job
 * corresponds to ONE file × ONE JA (split by producer); see
 * `notification-queue.service.ts` for the reasoning behind the
 * per-JA split (retry isolation).
 *
 * State machine on `t_file_upload.notification_status`:
 *
 *      [1] 未送信  ──┐ worker picks job
 *                    ▼
 *      [2] 送信中  ──┐ try recipients
 *                    │
 *                    ├──► all ok ─────► [3] 完了    + notified_at = NOW()
 *                    │
 *                    ├──► some fail ──► [4] 一部失敗 + notified_at = NOW()
 *                    │                                  + per-failure log to t_log (3)
 *                    │
 *                    └──► all fail ───► throw → BullMQ retries (status stays 2)
 *
 * Idempotency [resume-after-crash]: re-entry to a job already at
 * `notification_status = 3` short-circuits — handles the edge where
 * a worker crashes after sending the last mail but before ack'ing
 * BullMQ; on resume we must NOT re-send the whole list.
 *
 * Recipient lookup (spec §6.5): every active `m_account` row tied
 * to `ja_id` contributes up to 4 addresses (`email`, `sub_email_1`,
 * `sub_email_2`, `sub_email_3`). All addresses union-deduped — one
 * physical inbox gets exactly one mail regardless of how many of
 * those slots happen to repeat it.
 *
 * `concurrency: 5` — five jobs in flight at once. Per-JA serial
 * order isn't required (the §6.5 wording was about NOT batching
 * many JAs into one mailgun call, not about strict global serial).
 * If SES throttling shows up in CloudWatch, drop to 1-2 — the value
 * is intentionally a knob.
 */
@Processor(QUEUE_FILE_UPLOAD_NOTIFICATION, { concurrency: 5 })
export class FileUploadNotificationWorker extends WorkerHost {
  private readonly logger = new Logger(FileUploadNotificationWorker.name);

  // [audit-screen-name] Matches the SCR-023 screen identifier used by
  // the upload controller's own audit rows, so a t_log query filtered
  // by gamen_name correlates upload + notification phases of the
  // same business action.
  private static readonly SCREEN_NAME = 'ファイルアップロード画面 (ACSMS-SCR-023)';
  private static readonly TABLE_NAME = 't_file_upload';

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileUploadRepo: Repository<FileUpload>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Ja)
    private readonly jaRepo: Repository<Ja>,
    private readonly mailService: MailService,
    private readonly auditLog: AuditLogService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<FileUploadNotificationJob>): Promise<void> {
    const { file_upload_id, ja_id, uploaded_by } = job.data;
    const ctx = { jobId: job.id, file_upload_id, ja_id };

    // [load-row] Soft-deleted rows must be skipped — operator may
    // have deleted the upload between enqueue and processing. Ack
    // (no throw) so BullMQ doesn't retry forever.
    const row = await this.fileUploadRepo.findOne({
      where: { fileUploadId: file_upload_id, deletedAt: IsNull() },
    });
    if (!row) {
      this.logger.warn({ event: 'notification.skip.row_missing', ...ctx });
      return;
    }

    // [idempotency] Re-entry to a completed row: short-circuit.
    // Status 3 means a prior worker run finished the job; the BullMQ
    // ACK simply never landed (crash, network blip). Re-sending
    // would spam every recipient.
    if (row.notificationStatus === 3) {
      this.logger.log({ event: 'notification.skip.already_complete', ...ctx });
      return;
    }

    // [status-2-marker] Flip to 送信中 so the UI badge updates while
    // the worker grinds through recipients. A list-screen reload
    // mid-job shows "送信中" rather than the stale "未送信".
    await this.fileUploadRepo.update(
      { fileUploadId: file_upload_id },
      { notificationStatus: 2 },
    );

    // [ja-lookup] template needs ja_name; JA missing means data
    // corruption (FK broken) — record + throw to surface in alarms.
    const ja = await this.jaRepo.findOne({
      where: { jaId: ja_id, deletedAt: IsNull() },
    });
    if (!ja) {
      this.logger.error({ event: 'notification.ja_missing', ...ctx });
      await this.markFailed(file_upload_id);
      throw new Error(`JA ${ja_id} not found for file_upload_id ${file_upload_id}`);
    }

    // [recipients] Each m_account row contributes up to 4 emails —
    // primary + 3 sub. Filter blanks, dedupe via Set.
    const accounts = await this.accountRepo.find({
      where: { jaId: ja_id, deletedAt: IsNull() },
    });
    const allEmails = accounts.flatMap((a) => [
      a.email,
      a.subEmail1,
      a.subEmail2,
      a.subEmail3,
    ]);
    const recipients = Array.from(
      new Set(allEmails.filter((e) => typeof e === 'string' && e.trim().length > 0)),
    );

    if (recipients.length === 0) {
      // [no-recipients] Defensive — a JA with zero subscribers
      // shouldn't normally trip this branch, but we treat it as
      // "vacuously complete" rather than a failure so the row exits
      // 送信中 immediately. Operator can re-seed accounts and resend
      // manually if needed.
      this.logger.warn({ event: 'notification.no_recipients', ...ctx });
      await this.markComplete(file_upload_id);
      return;
    }

    // [uploader-lookup] best-effort — uploader may have been
    // deactivated; fall back to login_id literal so the mail body
    // still names a real source.
    const uploader = await this.accountRepo.findOne({
      where: { accountId: uploaded_by },
    });
    const uploaderLoginId = uploader?.loginId ?? '(unknown)';

    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ?? '';
    const downloadUrl = `${frontendUrl}/file-download`;

    // [send-loop] Serial within a job so SES isn't slammed by a
    // single JA with hundreds of recipients. BullMQ concurrency
    // covers parallelism across jobs (= across JAs).
    const failedEmails: string[] = [];
    for (const email of recipients) {
      try {
        await this.mailService.sendFileUploadNotification(email, {
          jaName: ja.jaName,
          fileName: row.fileName,
          uploadDatetime: row.uploadDatetime,
          uploaderLoginId,
          downloadUrl,
        });
      } catch (err) {
        failedEmails.push(email);
        this.logger.error({
          event: 'mail.send.failed',
          ...ctx,
          email_masked: maskEmail(email),
          err: (err as Error).message,
        });
      }
    }

    const total = recipients.length;
    const failed = failedEmails.length;
    const allFailed = failed === total;

    if (allFailed) {
      // [all-failed] Let BullMQ retry the WHOLE job — likely a
      // transient SMTP / SES outage. Status stays 2 (送信中) so the
      // UI keeps showing "in progress" rather than flapping to 4
      // between retry attempts.
      this.logger.error({ event: 'notification.all_failed', ...ctx, total });
      throw new Error(`All ${total} recipients failed for file_upload_id ${file_upload_id}`);
    }

    if (failed > 0) {
      // [partial-failure] 4 = 一部失敗. Record the per-recipient
      // failures into t_log (log_type=3) so operators can see WHICH
      // addresses bounced without scraping CloudWatch.
      await this.markPartial(file_upload_id);
      await this.auditLog.logError(
        {
          accountId: uploaded_by,
          jaId: ja_id,
          screen: FileUploadNotificationWorker.SCREEN_NAME,
          table: FileUploadNotificationWorker.TABLE_NAME,
          targetId: file_upload_id,
          ipAddress: '',
          userAgent: 'worker:file-upload-notification',
        },
        AuditOperation.SEND_NOTIFICATION,
        new Error(
          `${failed}/${total} recipients failed: ${failedEmails.map(maskEmail).join(', ')}`,
        ),
      );
    } else {
      await this.markComplete(file_upload_id);
    }

    this.logger.log({
      event: 'notification.processed',
      ...ctx,
      total,
      failed,
      status: failed > 0 ? 4 : 3,
    });
  }

  private async markComplete(fileUploadId: number): Promise<void> {
    await this.fileUploadRepo.update(
      { fileUploadId },
      { notificationStatus: 3, notifiedAt: new Date() },
    );
  }

  private async markPartial(fileUploadId: number): Promise<void> {
    await this.fileUploadRepo.update(
      { fileUploadId },
      { notificationStatus: 4, notifiedAt: new Date() },
    );
  }

  /** Used when JA lookup fails — mark partial + let BullMQ retry. */
  private async markFailed(fileUploadId: number): Promise<void> {
    await this.markPartial(fileUploadId);
  }
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '***';
  return `${name[0]}***@${domain}`;
}

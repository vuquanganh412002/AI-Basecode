import { Processor, WorkerHost } from '@nestjs/bullmq';
import { AuditOperation } from '@/common/enums';
import { Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { IsNull, Repository } from 'typeorm';

import { collectAccountEmails } from '@/common/utils/account-emails';
import { NotificationStatus } from '@/common/constants/notification-status.constant';
import { JobFailureException } from '@/common/exceptions/job-failure.exception';
import { DEFAULT_FRONTEND_URL } from '@/config/config-defaults.constant';
import { Account } from '@/database/entities/account.entity';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { Ja } from '@/database/entities/ja.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { MailService } from '@/modules/mail/mail.service';
import { QUEUE_FILE_UPLOAD_NOTIFICATION } from '@/modules/queue/queue-names.constants';

import type { FileUploadNotificationJob } from './notification-queue.service';

/**
 * ACSMS-SCR-023 §6.5 — ファイルアップロード通知 worker(consumer)。
 *
 * `file-upload-notification` BullMQ キューを処理。1 ジョブ = 1 file × 1 JA
 * (producer が分割。per-JA 分割=リトライ隔離の理由は notification-queue.service.ts)。
 *
 * `t_file_upload.notification_status` 状態遷移:
 *   [1]未送信 → worker 取得 → [2]送信中 → 全成功 [3]完了(+notified_at)
 *                                        → 一部失敗 [4]一部失敗(+notified_at, 失敗毎に t_log(3))
 *                                        → 全失敗 throw → BullMQ リトライ(status は 2 維持)
 *
 * 冪等性 [resume-after-crash]: status=3 での再入は short-circuit。最後のメール
 * 送信後 BullMQ ack 前に worker crash した場合の再送を防ぐ。
 *
 * 宛先(spec §6.5): ja_id 紐づく active m_account 各行が最大 4 アドレス
 * (email, sub_email_1..3)を寄与。全アドレス union-dedupe で 1 受信箱 1 通。
 *
 * `concurrency: 5` — 同時 5 ジョブ。per-JA 直列順は不要(§6.5 は多 JA を 1 mail
 * 呼び出しにまとめない意図で、厳密グローバル直列ではない)。CloudWatch で SES
 * throttle が出たら 1-2 へ下げる調整ノブ。
 */
@Processor(QUEUE_FILE_UPLOAD_NOTIFICATION, { concurrency: 5 })
export class FileUploadNotificationWorker extends WorkerHost {
  private readonly logger = new Logger(FileUploadNotificationWorker.name);

  // [audit-screen-name] upload controller の監査行と同じ ACSMS-SCR-023 画面識別子。
  // gamen_name で絞れば upload + notification フェーズを相関できる。
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
    // [optional-config] 既存 spec は ConfigService を provide せずに worker を
    // 組み立てるため任意注入。未注入時は DEFAULT_FRONTEND_URL へフォールバック。
    @Optional() private readonly configService?: ConfigService,
  ) {
    super();
  }

  /**
   * メール本文へ載せるダウンロード画面(ACSMS-SCR-022)の絶対 URL。ファイル名で絞り込んだ
   * 状態で開くので、受信者は一覧を探さずに該当行へ着地する。
   *
   * API の直リンク(`/api/v1/file-download/:id/download`)にしないのは、未ログイン
   * だと 401 JSON が返るだけでログイン導線が無いため。画面 URL ならルーターガードが
   * `?redirect=` を付けてログインへ回し、認証後に元の URL へ戻す。
   */
  private buildDownloadUrl(fileName: string): string {
    const base =
      this.configService?.get<string>('app.frontendUrl') ?? DEFAULT_FRONTEND_URL;
    if (!base) return '';
    // 末尾スラッシュの有無で `//file-download` にならないよう正規化。
    let normalized = base;
    while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    return `${normalized}/file-download?file_name=${encodeURIComponent(fileName)}`;
  }

  async process(job: Job<FileUploadNotificationJob>): Promise<void> {
    const { file_upload_id, ja_id, uploaded_by } = job.data;
    const ctx = { jobId: job.id, file_upload_id, ja_id };

    // [load-row] soft-delete 行はスキップ(enqueue〜処理間に operator が削除した
    // 可能性)。無限リトライを避けるため throw せず ack。
    const row = await this.fileUploadRepo.findOne({
      where: { fileUploadId: file_upload_id, deletedAt: IsNull() },
    });
    if (!row) {
      this.logger.warn({ event: 'notification.skip.row_missing', ...ctx });
      return;
    }

    // [idempotency] 完了行への再入は short-circuit。status=3 は前回完了済で
    // BullMQ ACK が届かなかった(crash/network)だけ。再送は全宛先へスパムになる。
    if (row.notificationStatus === NotificationStatus.COMPLETE) {
      this.logger.log({ event: 'notification.skip.already_complete', ...ctx });
      return;
    }

    // [status-2-marker] 送信中 へ更新し、処理中に UI バッジを反映
    // (途中リロードで stale "未送信" でなく "送信中" 表示)。
    await this.fileUploadRepo.update(
      { fileUploadId: file_upload_id },
      { notificationStatus: NotificationStatus.SENDING },
    );

    // [ja-lookup] template に ja_name 必要。JA 欠落は FK 破損=データ破損 →
    // 記録 + throw で alarm に上げる。
    const ja = await this.jaRepo.findOne({
      where: { jaId: ja_id, deletedAt: IsNull() },
    });
    if (!ja) {
      this.logger.error({ event: 'notification.ja_missing', ...ctx });
      await this.markFailed(file_upload_id);
      throw new JobFailureException(
        QUEUE_FILE_UPLOAD_NOTIFICATION,
        `JA ${ja_id} not found for file_upload_id ${file_upload_id}`,
      );
    }

    // [recipients] 各 m_account 行が最大 4 email(primary + sub 3)を寄与。
    // 空除外・dedupe は共有 util。
    const accounts = await this.accountRepo.find({
      where: { jaId: ja_id, deletedAt: IsNull() },
    });
    const recipients = collectAccountEmails(accounts);

    if (recipients.length === 0) {
      // [no-recipients] 防御的。宛先 0 の JA は通常起きないが、失敗でなく
      // "vacuously complete" 扱いにし 送信中 を即抜ける。必要なら operator が
      // account 再投入 + 手動再送。
      this.logger.warn({ event: 'notification.no_recipients', ...ctx });
      await this.markComplete(file_upload_id);
      return;
    }

    // [uploader-lookup] best-effort。uploader が無効化済でも login_id へ
    // フォールバックし mail 本文が実在の送信元を示す。
    const uploader = await this.accountRepo.findOne({
      where: { accountId: uploaded_by },
    });
    const uploaderLoginId = uploader?.loginId ?? '(unknown)';
    // 件名に ログインID + アカウント名 を表示する（顧客要件2026-07）。
    const uploaderAccountName = uploader?.accountName ?? '';

    // [send-loop] ジョブ内は直列。1 JA に数百宛先でも SES を叩き潰さない。
    // ジョブ間(=JA 間)の並列は BullMQ concurrency が担当。
    const failedEmails: string[] = [];
    // 宛先ごとに同じ URL なのでループ外で 1 回だけ組み立てる。
    const downloadUrl = this.buildDownloadUrl(row.fileName);
    for (const email of recipients) {
      try {
        await this.mailService.sendFileUploadNotification(email, {
          jaName: ja.jaName,
          fileName: row.fileName,
          uploadDatetime: row.uploadDatetime,
          uploaderLoginId,
          uploaderAccountName,
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
      // [all-failed] BullMQ にジョブ全体をリトライさせる(一時的 SMTP/SES 障害の
      // 可能性)。status は 2(送信中)維持で、リトライ間に 4 へちらつかせない。
      this.logger.error({ event: 'notification.all_failed', ...ctx, total });
      throw new JobFailureException(
        QUEUE_FILE_UPLOAD_NOTIFICATION,
        `All ${total} recipients failed for file_upload_id ${file_upload_id}`,
      );
    }

    if (failed > 0) {
      // [partial-failure] 4 = 一部失敗。宛先毎の失敗を t_log(log_type=3)へ記録し、
      // CloudWatch を漁らずどのアドレスが bounce したか分かるように。
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
      status: failed > 0
        ? NotificationStatus.PARTIAL_FAILURE
        : NotificationStatus.COMPLETE,
    });
  }

  private async markComplete(fileUploadId: number): Promise<void> {
    await this.fileUploadRepo.update(
      { fileUploadId },
      { notificationStatus: NotificationStatus.COMPLETE, notifiedAt: new Date() },
    );
  }

  private async markPartial(fileUploadId: number): Promise<void> {
    await this.fileUploadRepo.update(
      { fileUploadId },
      {
        notificationStatus: NotificationStatus.PARTIAL_FAILURE,
        notifiedAt: new Date(),
      },
    );
  }

  /** JA lookup 失敗時 — partial にして BullMQ にリトライさせる。 */
  private async markFailed(fileUploadId: number): Promise<void> {
    await this.markPartial(fileUploadId);
  }
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '***';
  return `${name[0]}***@${domain}`;
}

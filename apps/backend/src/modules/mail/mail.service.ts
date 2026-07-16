import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailProvider } from './interfaces/mail-provider.interface';
import { SmtpMailProvider } from './providers/smtp.provider';
import { SesMailProvider } from './providers/ses.provider';
import { renderFileUploadNotificationMail } from './templates/file-upload-notification.template';
import { renderOtpMail } from './templates/otp.template';
import { renderPasswordResetMail } from './templates/password-reset.template';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private provider!: MailProvider;
  private mailFrom!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Provider selection is driven by NODE_ENV: every environment except `local`
    // sends via the SES API (the ECS task role authenticates the SDK), while
    // `local` uses SMTP/Mailhog. An explicit MAIL_PROVIDER overrides this —
    // docker-compose sets MAIL_PROVIDER=smtp to keep Mailhog under
    // NODE_ENV=development without flipping the rest of the local config.
    const explicitProvider = this.configService.get<string>('mail.provider');
    const nodeEnv = this.configService.get<string>('nodeEnv') ?? 'development';
    const useSes = explicitProvider
      ? explicitProvider === 'ses'
      : nodeEnv.trim().toLowerCase() !== 'local';

    // 受信トレイに表示される送信者名。MAIL_FROM はアドレスのみを保持し、
    // 表示名は MAIL_FROM_NAME（既定 'AGRINEWS'）で付与する。既に MAIL_FROM が
    // "Name <addr>" 形式（'<' を含む）の場合はそのまま尊重する。
    const fromAddress = this.configService.get<string>('mail.from') ?? 'noreply@agrinews.jp';
    const fromName = this.configService.get<string>('mail.fromName') ?? 'AGRINEWS';
    this.mailFrom =
      fromName && !fromAddress.includes('<')
        ? `"${fromName}" <${fromAddress}>`
        : fromAddress;

    if (useSes) {
      this.provider = new SesMailProvider({
        region: this.configService.get<string>('mail.region') ?? 'ap-northeast-1',
        from: this.mailFrom,
        configurationSet: this.configService.get<string>('mail.configurationSet'),
      });
      this.logger.log({ event: 'mail.init', provider: 'ses', nodeEnv });
    } else {
      this.provider = new SmtpMailProvider({
        host: this.configService.get<string>('mail.host') ?? 'localhost',
        port: this.configService.get<number>('mail.port') ?? 1025,
        user: this.configService.get<string>('mail.user') ?? '',
        pass: this.configService.get<string>('mail.pass') ?? '',
        from: this.mailFrom,
      });
      this.logger.log({ event: 'mail.init', provider: 'smtp', nodeEnv });
    }
  }

  /** Send the 6-digit MFA OTP. Template lives in `templates/otp.template.ts`. */
  async sendOtp(
    email: string,
    accountName: string,
    otpCode: string,
  ): Promise<void> {
    const { subject, text } = renderOtpMail({ accountName, otpCode });
    await this.provider.sendMail({ to: email, subject, text });
    this.logger.log({ event: 'mail.otp.sent', email: this.maskEmail(email) });
  }

  /**
   * Send the password reset link. Template lives in
   * `templates/password-reset.template.ts`. `expiryMinutes` flows from
   * `auth.service.ts` (`RESET_TOKEN_EXPIRY_MINUTES`) so the body label
   * stays in sync with the real token TTL.
   */
  async sendPasswordReset(
    email: string,
    accountName: string,
    resetUrl: string,
    expiryMinutes: number,
  ): Promise<void> {
    const { subject, text } = renderPasswordResetMail({
      accountName,
      resetUrl,
      expiryMinutes,
    });
    await this.provider.sendMail({ to: email, subject, text });
    this.logger.log({ event: 'mail.password_reset.sent', email: this.maskEmail(email) });
  }

  /**
   * SCR-023 — ファイルアップロード完了通知メール。Worker
   * (`file-upload-notification.worker.ts`) が、対象 JA に紐付く
   * `m_account.email` および `sub_email_1/2/3` 全てに対して 1 回ずつ
   * 呼び出す（重複排除は worker 側で実施）。
   */
  async sendFileUploadNotification(
    email: string,
    input: {
      jaName: string;
      fileName: string;
      uploadDatetime: Date;
      uploaderLoginId: string;
      uploaderAccountName: string;
    },
  ): Promise<void> {
    const { subject, text } = renderFileUploadNotificationMail(input);
    await this.provider.sendMail({ to: email, subject, text });
    this.logger.log({
      event: 'mail.file_upload_notification.sent',
      email: this.maskEmail(email),
    });
  }

  /**
   * 汎用通知メール。件名は呼び出し側が完成形で渡す（システム名プレフィックスは
   * 付与しない）。SCR-029 増減通知では件名に【都道府県】【発行アカウント】を含め、
   * システム名【クラウド版購読者管理システム】は本文先頭に置く（顧客要件2026-07）。
   */
  async sendNotification(email: string, subject: string, content: string): Promise<void> {
    await this.provider.sendMail({
      to: email,
      subject,
      html: content,
    });
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***';
    return `${name[0]}***@${domain}`;
  }
}

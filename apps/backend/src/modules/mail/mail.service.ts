import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_MAIL_FROM,
  DEFAULT_MAIL_FROM_NAME,
  DEFAULT_MAIL_HOST,
} from '@/config/config-defaults.constant';
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
    // NODE_ENV で選択: `local` 以外は SES API（ECS task role で認証）、
    // `local` は SMTP/Mailhog。MAIL_PROVIDER 明示指定が優先（docker-compose は
    // NODE_ENV=development のまま Mailhog を使うため smtp を指定）。
    const explicitProvider = this.configService.get<string>('mail.provider');
    const nodeEnv = this.configService.get<string>('nodeEnv') ?? 'development';
    const useSes = explicitProvider
      ? explicitProvider === 'ses'
      : nodeEnv.trim().toLowerCase() !== 'local';

    // 送信者名。MAIL_FROM はアドレスのみ、表示名は MAIL_FROM_NAME（既定
    // 'AGRINEWS'）で付与。既に "Name <addr>" 形式（'<' 含む）ならそのまま。
    const fromAddress = this.configService.get<string>('mail.from') ?? DEFAULT_MAIL_FROM;
    const fromName = this.configService.get<string>('mail.fromName') ?? DEFAULT_MAIL_FROM_NAME;
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
        host: this.configService.get<string>('mail.host') ?? DEFAULT_MAIL_HOST,
        port: this.configService.get<number>('mail.port') ?? 1025,
        user: this.configService.get<string>('mail.user') ?? '',
        pass: this.configService.get<string>('mail.pass') ?? '',
        from: this.mailFrom,
      });
      this.logger.log({ event: 'mail.init', provider: 'smtp', nodeEnv });
    }
  }

  /** 6桁 MFA OTP 送信。文面は `templates/otp.template.ts`。 */
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
   * パスワードリセットリンク送信。文面は
   * `templates/password-reset.template.ts`。`expiryMinutes` は
   * `auth.service.ts` の `RESET_TOKEN_EXPIRY_MINUTES` から渡り、本文の
   * 有効期限表示が実 TTL と同期する。
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
   * SCR-023 ファイルアップロード完了通知。Worker
   * (`file-upload-notification.worker.ts`) が対象 JA の `m_account.email`
   * + `sub_email_1/2/3` 各宛先へ 1 回ずつ呼ぶ（重複排除は worker 側）。
   */
  async sendFileUploadNotification(
    email: string,
    input: {
      jaName: string;
      fileName: string;
      uploadDatetime: Date;
      uploaderLoginId: string;
      uploaderAccountName: string;
      downloadUrl: string;
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
   * 汎用通知メール。件名は呼び出し側が完成形で渡す（システム名プレフィックス
   * 無し）。SCR-029 増減通知は件名に【都道府県】【発行アカウント】、システム名
   * 【クラウド版購読者管理システム】は本文先頭（顧客要件2026-07）。
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

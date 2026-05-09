import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailProvider } from './interfaces/mail-provider.interface';
import { SmtpMailProvider } from './providers/smtp.provider';
import { SesMailProvider } from './providers/ses.provider';
import { renderOtpMail } from './templates/otp.template';
import { renderPasswordResetMail } from './templates/password-reset.template';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private provider!: MailProvider;
  private mailFrom!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const providerType = this.configService.get<string>('mail.provider');
    this.mailFrom = this.configService.get<string>('mail.from') ?? 'noreply@agrinews.jp';

    if (providerType === 'ses') {
      this.provider = new SesMailProvider({
        region: this.configService.get<string>('mail.region') ?? 'ap-northeast-1',
        from: this.mailFrom,
      });
      this.logger.log({ event: 'mail.init', provider: 'ses' });
    } else {
      this.provider = new SmtpMailProvider({
        host: this.configService.get<string>('mail.host') ?? 'localhost',
        port: this.configService.get<number>('mail.port') ?? 1025,
        user: this.configService.get<string>('mail.user') ?? '',
        pass: this.configService.get<string>('mail.pass') ?? '',
        from: this.mailFrom,
      });
      this.logger.log({ event: 'mail.init', provider: 'smtp' });
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

  async sendNotification(email: string, subject: string, content: string): Promise<void> {
    await this.provider.sendMail({
      to: email,
      subject: `【クラウド版購読者管理システム】${subject}`,
      html: content,
    });
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***';
    return `${name[0]}***@${domain}`;
  }
}

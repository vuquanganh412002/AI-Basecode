import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailProvider } from './interfaces/mail-provider.interface';
import { SmtpMailProvider } from './providers/smtp.provider';
import { SesMailProvider } from './providers/ses.provider';

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

  async sendOtp(email: string, otpCode: string): Promise<void> {
    await this.provider.sendMail({
      to: email,
      subject: '【agrinews】ログイン認証コード',
      html: `<p>認証コード: <strong>${otpCode}</strong></p><p>有効期限: 5分</p>`,
    });
    this.logger.log({ event: 'mail.otp.sent', email: this.maskEmail(email) });
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.provider.sendMail({
      to: email,
      subject: '【agrinews】パスワードリセット',
      html: `<p>以下のリンクからパスワードをリセットしてください。</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>有効期限: 30分</p>`,
    });
    this.logger.log({ event: 'mail.password_reset.sent', email: this.maskEmail(email) });
  }

  async sendNotification(email: string, subject: string, content: string): Promise<void> {
    await this.provider.sendMail({
      to: email,
      subject: `【agrinews】${subject}`,
      html: content,
    });
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***';
    return `${name[0]}***@${domain}`;
  }
}

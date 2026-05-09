import * as nodemailer from 'nodemailer';
import { MailProvider } from '../interfaces/mail-provider.interface';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export class SmtpMailProvider implements MailProvider {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: SmtpConfig) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void> {
    const payload: nodemailer.SendMailOptions = {
      from: this.from,
      to: options.to,
      subject: options.subject,
    };
    if (options.text) payload.text = options.text;
    if (options.html) payload.html = options.html;
    await this.transporter.sendMail(payload);
  }
}

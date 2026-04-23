import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { MailProvider } from '../interfaces/mail-provider.interface';

interface SesConfig {
  region: string;
  from: string;
}

export class SesMailProvider implements MailProvider {
  private readonly client: SESClient;
  private readonly from: string;

  constructor(config: SesConfig) {
    this.client = new SESClient({ region: config.region });
    this.from = config.from;
  }

  async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        Source: this.from,
        Destination: { ToAddresses: [options.to] },
        Message: {
          Subject: { Data: options.subject, Charset: 'UTF-8' },
          Body: { Html: { Data: options.html, Charset: 'UTF-8' } },
        },
      }),
    );
  }
}

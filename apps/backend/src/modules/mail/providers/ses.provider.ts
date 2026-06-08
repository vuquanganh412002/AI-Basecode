import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { MailProvider } from '@/modules/mail/interfaces/mail-provider.interface';

interface SesConfig {
  region: string;
  from: string;
  /**
   * SES configuration set applied to every send. Attributes the message to the
   * set so its CloudWatch event destination + SNS bounce/complaint/reject
   * notifications (provisioned in Terraform module.ses) capture this traffic,
   * and the set's suppression list is honoured. Undefined → SES sends without a
   * configuration set (no per-set metrics).
   */
  configurationSet?: string;
}

export class SesMailProvider implements MailProvider {
  private readonly client: SESClient;
  private readonly from: string;
  private readonly configurationSet?: string;

  constructor(config: SesConfig) {
    this.client = new SESClient({ region: config.region });
    this.from = config.from;
    this.configurationSet = config.configurationSet;
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void> {
    const body: { Html?: { Data: string; Charset: string }; Text?: { Data: string; Charset: string } } = {};
    if (options.html) body.Html = { Data: options.html, Charset: 'UTF-8' };
    if (options.text) body.Text = { Data: options.text, Charset: 'UTF-8' };
    await this.client.send(
      new SendEmailCommand({
        Source: this.from,
        Destination: { ToAddresses: [options.to] },
        Message: {
          Subject: { Data: options.subject, Charset: 'UTF-8' },
          Body: body,
        },
        // Undefined when no set is configured — the SDK omits the field entirely.
        ConfigurationSetName: this.configurationSet,
      }),
    );
  }
}

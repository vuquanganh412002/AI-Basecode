export interface MailProvider {
  sendMail(options: { to: string; subject: string; html: string }): Promise<void>;
}

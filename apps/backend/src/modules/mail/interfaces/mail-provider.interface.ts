export interface MailProvider {
  /**
   * `text` is the plain-text fallback that mail clients without HTML
   * rendering (or anti-phishing previews) will display. Setting both
   * `text` and `html` produces a proper multipart/alternative email.
   * Pass only `html` for HTML-only sends; pass only `text` for plain.
   */
  sendMail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void>;
}

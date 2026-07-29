export interface MailProvider {
  /**
   * `text` は HTML 非対応クライアント向けフォールバック。両方指定で
   * multipart/alternative になる。片方のみの指定も可。
   */
  sendMail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void>;
}

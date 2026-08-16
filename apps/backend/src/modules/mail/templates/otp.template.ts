/**
 * MFA 認証コード通知メールテンプレート（顧客確認済みプレーンテキスト）。
 * 文面は顧客指定文字列。改行は `\n`。仕様書の区切り線は視覚サンプルの
 * ため本文には含めない。
 *
 * `otpExpiryMinutes` は `auth.service.ts` の `OTP_EXPIRY_MINUTES` から渡り、
 * 本文の有効期限表示が実 TTL と同期する（password-reset.template.ts と同じ
 * 方式）。
 */

interface OtpTemplateInput {
  accountName: string;
  otpCode: string;
  otpExpiryMinutes: number;
}

interface RenderedMail {
  subject: string;
  text: string;
}

const SUBJECT = '【クラウド版購読者管理システム】認証コードのお知らせ';

export function renderOtpMail({
  accountName,
  otpCode,
  otpExpiryMinutes,
}: OtpTemplateInput): RenderedMail {
  const text = [
    `${accountName}　様`,
    '',
    `認証コード: ${otpCode}`,
    '',
    `有効期限: ${otpExpiryMinutes}分`,
    '',
    '※このメールに心当たりがない場合は無視してください。',
  ].join('\n');
  return { subject: SUBJECT, text };
}

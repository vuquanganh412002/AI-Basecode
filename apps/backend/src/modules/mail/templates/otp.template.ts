/**
 * MFA 認証コード通知メール — テンプレート (customer-confirmed plain text).
 *
 * 件名・本文の文面はカスタマー指定の文字列に揃える。改行は `\n`
 * で組み立て、separator dashes はカスタマーがマウント版仕様書に
 * 書いた区切り線を意味するため、メール本文には含めない（仕様書上の
 * 視覚的サンプル）。
 */

interface OtpTemplateInput {
  accountName: string;
  otpCode: string;
}

interface RenderedMail {
  subject: string;
  text: string;
}

const SUBJECT = '【クラウド版購読者管理システム】認証コードのお知らせ';

export function renderOtpMail({
  accountName,
  otpCode,
}: OtpTemplateInput): RenderedMail {
  const text = [
    `${accountName}　様`,
    '',
    `認証コード: ${otpCode}`,
    '',
    '有効期限: 5分',
    '',
    '※このメールに心当たりがない場合は無視してください。',
  ].join('\n');
  return { subject: SUBJECT, text };
}

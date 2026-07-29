/**
 * パスワードリセットメールテンプレート（顧客確認済みプレーンテキスト）。
 * `expiryMinutes` は `auth.service.ts` の `RESET_TOKEN_EXPIRY_MINUTES` を
 * 受け取り、60 の倍数なら「N時間」、他は「N分」表示。constant 変更だけで
 * 本文の有効期限も追従する。
 */

interface PasswordResetTemplateInput {
  accountName: string;
  resetUrl: string;
  expiryMinutes: number;
}

interface RenderedMail {
  subject: string;
  text: string;
}

const SUBJECT = '【クラウド版購読者管理システム】パスワードリセット';

function formatExpiry(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60}時間`;
  }
  return `${minutes}分`;
}

export function renderPasswordResetMail({
  accountName,
  resetUrl,
  expiryMinutes,
}: PasswordResetTemplateInput): RenderedMail {
  const text = [
    `${accountName}　様`,
    '',
    '以下のリンクからパスワードをリセットしてください。',
    '',
    resetUrl,
    '',
    `有効期限: ${formatExpiry(expiryMinutes)}`,
    '',
    '※このメールに心当たりがない場合は無視してください。',
  ].join('\n');
  return { subject: SUBJECT, text };
}

/**
 * SCR-023 ファイルアップロード通知メール (DRAFT — 顧客レビュー待ち)。
 *
 * 1 ファイル × 1 JA について当該 JA 全アカウントの `m_account.email` +
 * `sub_email_1/2/3` へ送信（重複排除済み）。1 アカウント最大 4 アドレスの
 * ため宛名は「ご担当者様」。
 *
 * 受信者は SCR-022（ダウンロード画面）から取得する想定。顧客要件2026-07:
 * ダウンロード URL は本文に含めない（環境依存の絶対 URL・遷移案内不要）。
 */

import { formatDateTimeMinutesJst } from '@/common/utils/datetime';

interface FileUploadNotificationInput {
  jaName: string;
  fileName: string;
  uploadDatetime: Date;
  uploaderLoginId: string;
  /** アップロード者アカウント名（顧客要件2026-07: 件名に ログインID + アカウント名）。 */
  uploaderAccountName: string;
}

interface RenderedMail {
  subject: string;
  text: string;
}

const SUBJECT_PREFIX = '【クラウド版購読者管理システム】';

export function renderFileUploadNotificationMail({
  jaName,
  fileName,
  uploadDatetime,
  uploaderLoginId,
  uploaderAccountName,
}: FileUploadNotificationInput): RenderedMail {
  // 件名: システム名 +【発行アカウント(ログインID + アカウント名)】+ タイトル
  // （顧客要件2026-07）。アカウント名が空なら login のみ。
  const uploader = `${uploaderLoginId} ${uploaderAccountName}`.trim();
  const subject = `${SUBJECT_PREFIX}【${uploader}】ファイルアップロードのお知らせ`;
  const text = [
    'ご担当者様',
    '',
    '下記のファイルがアップロードされました。',
    '',
    `JA名　　　　: ${jaName}`,
    `ファイル名　: ${fileName}`,
    `アップロード日時: ${formatDateTimeMinutesJst(uploadDatetime)}`,
    `アップロード者: ${uploaderLoginId}`,
    '',
    '※このメールは送信専用です。返信されてもご対応できません。',
  ].join('\n');
  return { subject, text };
}

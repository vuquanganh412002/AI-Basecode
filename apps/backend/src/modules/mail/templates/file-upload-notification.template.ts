/**
 * SCR-023 — ファイルアップロード通知メール (DRAFT — customer review pending).
 *
 * 1 ファイル × 1 JA に対して、当該 JA に紐付く全アカウントの
 * `m_account.email` および `sub_email_1/2/3` を宛先に送信する
 * （重複排除済み）。1 アカウントが 4 アドレスを持つ場合があるため、
 * 宛名は個別氏名ではなく「ご担当者様」を使用する。
 *
 * 受信者は SCR-022（ファイルダウンロード画面）からファイルを取得
 * する想定。顧客要件2026-07: ダウンロード画面への URL リンクは本文に
 * 含めない（環境依存の絶対 URL を載せない・遷移案内も不要との要望）。
 */

import { formatDateTimeMinutesJst } from '@/common/utils/datetime';

interface FileUploadNotificationInput {
  jaName: string;
  fileName: string;
  uploadDatetime: Date;
  uploaderLoginId: string;
  /** アップロード者のアカウント名（顧客要件2026-07: 件名に ログインID + アカウント名 を表示）。 */
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
  // 件名: システム名 + 【発行アカウント(ログインID + アカウント名)】+ タイトル
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

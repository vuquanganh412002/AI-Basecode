/**
 * SCR-023 — ファイルアップロード通知メール (DRAFT — customer review pending).
 *
 * 1 ファイル × 1 JA に対して、当該 JA に紐付く全アカウントの
 * `m_account.email` および `sub_email_1/2/3` を宛先に送信する
 * （重複排除済み）。1 アカウントが 4 アドレスを持つ場合があるため、
 * 宛名は個別氏名ではなく「ご担当者様」を使用する。
 *
 * 受信者は SCR-022（ファイルダウンロード画面）からファイルを取得
 * する想定。本文末尾のリンクは `app.frontendUrl` 設定値（ECS task
 * definition で AWS Secrets Manager から注入）を参照する。
 */

import { formatDateTimeMinutesJst } from '@/common/utils/datetime';

interface FileUploadNotificationInput {
  jaName: string;
  fileName: string;
  uploadDatetime: Date;
  uploaderLoginId: string;
  downloadUrl: string;
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
  downloadUrl,
}: FileUploadNotificationInput): RenderedMail {
  const subject = `${SUBJECT_PREFIX}ファイルアップロードのお知らせ`;
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
    '下記のURLよりファイルダウンロード画面にアクセスし、内容をご確認ください。',
    downloadUrl,
    '',
    '※このメールは送信専用です。返信されてもご対応できません。',
  ].join('\n');
  return { subject, text };
}

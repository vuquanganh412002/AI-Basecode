/**
 * ACSMS-SCR-023 ファイルアップロード通知メール (DRAFT — 顧客レビュー待ち)。
 *
 * 1 ファイル × 1 JA について当該 JA 全アカウントの `m_account.email` +
 * `sub_email_1/2/3` へ送信（重複排除済み）。1 アカウント最大 4 アドレスの
 * ため宛名は「ご担当者様」。
 *
 * 受信者は ACSMS-SCR-022（ダウンロード画面）から取得する。顧客要件2026-08 で本文に
 * ダウンロード用リンクを載せる方針へ変更（2026-07 は「URL を含めない」だった）。
 * リンク先は API の直リンクではなく FE のダウンロード画面 + `file_name` 絞込:
 * API 直リンクは未ログインだと 401 JSON が出るだけだが、画面リンクなら
 * ルーターガードが `?redirect=` 付きでログインへ回し、認証後そのまま該当
 * ファイルの行に着地する。
 */

import { formatDateTimeMinutesJst } from '@/common/utils/datetime';

interface FileUploadNotificationInput {
  jaName: string;
  fileName: string;
  uploadDatetime: Date;
  uploaderLoginId: string;
  /** アップロード者アカウント名（顧客要件2026-07: 件名に ログインID + アカウント名）。 */
  uploaderAccountName: string;
  /**
   * ダウンロード画面(ACSMS-SCR-022)への絶対 URL（当該ファイル名で絞込済）。
   * 空文字のときは行ごと省略する（FRONTEND_URL 未設定環境で
   * `undefined/file-download` のような壊れたリンクを出さないため）。
   */
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
  uploaderAccountName,
  downloadUrl,
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
    // URL が無い環境では見出しごと落とす（空行だけ残る方が不自然なため）。
    ...(downloadUrl
      ? ['', '下記のリンクからダウンロードしてください。', downloadUrl]
      : []),
    '',
    '※このメールは送信専用です。返信されてもご対応できません。',
  ].join('\n');
  return { subject, text };
}

/**
 * `t_file_upload.notification_status` — {@link FileUploadNotificationWorker}
 * が駆動する通知状態機械（ACSMS-SCR-023 §6.5）。
 *
 *      [1] 未送信 → [2] 送信中 → [3] 完了            (全宛先成功)
 *                            ↘ [4] 一部失敗          (一部宛先失敗)
 *
 * `m_code.code_category='FILE_UPLOAD_STATUS'`(処理状態 1:処理中/2:完了/3:エラー)
 * とは別物。この状態機械は BE 専用で m_code 行も FE mirror も無く、一覧画面の
 * バッジは別レスポンス項目から描画。定数は worker の分岐を意図で読ませるため
 * 1..4 リテラルを置換したもので、バリデーション allow-list ではない。
 */
export const NotificationStatus = {
  /** 未送信 — enqueue 済、未取得。 */
  NOT_SENT: 1,
  /** 送信中 — worker が宛先を処理中。 */
  SENDING: 2,
  /** 完了 — 全宛先へ送信成功。 */
  COMPLETE: 3,
  /** 一部失敗 — 1 件以上の宛先で失敗。 */
  PARTIAL_FAILURE: 4,
} as const;
export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

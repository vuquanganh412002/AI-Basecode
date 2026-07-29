/**
 * `t_file_upload.status` — ファイル処理状態（SCR-023）。
 *
 * `m_code.code_category='FILE_UPLOAD_STATUS'`(1:処理中/2:完了/3:エラー)の mirror。
 * 顧客がラベルを実行時に改名しても状態集合は処理パイプラインで固定なので、
 * この定数で set 箇所・検索 allow-list の 1..3 リテラルを置換する。
 *
 * {@link NotificationStatus}(`notification_status`。別のメール通知状態機械)
 * とは別物。
 */
export const FileUploadStatus = {
  /** 処理中 — 行 INSERT 済、処理未完。 */
  PROCESSING: 1,
  /** 完了 — 処理成功。 */
  COMPLETE: 2,
  /** エラー — 処理失敗。 */
  ERROR: 3,
} as const;
export type FileUploadStatus =
  (typeof FileUploadStatus)[keyof typeof FileUploadStatus];

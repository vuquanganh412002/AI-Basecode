/**
 * `t_file_upload.status` — file processing state (SCR-023).
 *
 * Mirror of `m_code.code_category='FILE_UPLOAD_STATUS'` (1:処理中 / 2:完了 /
 * 3:エラー). The customer may rename the labels at runtime, but the set of
 * states is fixed by the processing pipeline, so these named constants
 * replace the bare 1..3 literals at the set-sites and the search allow-list.
 *
 * DISTINCT from {@link NotificationStatus} (`notification_status`), which is
 * the separate mail-notification state machine.
 */
export const FileUploadStatus = {
  /** 処理中 — row inserted, processing not finished. */
  PROCESSING: 1,
  /** 完了 — processed successfully. */
  COMPLETE: 2,
  /** エラー — processing failed. */
  ERROR: 3,
} as const;
export type FileUploadStatus =
  (typeof FileUploadStatus)[keyof typeof FileUploadStatus];

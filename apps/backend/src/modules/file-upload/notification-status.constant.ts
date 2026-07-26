/**
 * `t_file_upload.notification_status` — internal notification state machine
 * driven by {@link FileUploadNotificationWorker} (SCR-023 §6.5).
 *
 *      [1] 未送信 → [2] 送信中 → [3] 完了            (all recipients ok)
 *                            ↘ [4] 一部失敗          (some recipients fail)
 *
 * DISTINCT from `m_code.code_category='FILE_UPLOAD_STATUS'` (the processing
 * status 1:処理中 / 2:完了 / 3:エラー). This state machine is BE-only — it
 * has no `m_code` row and no FE mirror; the list screen renders its badge
 * from a separate response field. Named constants replace bare 1..4 literals
 * so the worker's branching reads by intent; this is NOT a validation
 * allow-list.
 */
export const NotificationStatus = {
  /** 未送信 — enqueued, not yet picked up. */
  NOT_SENT: 1,
  /** 送信中 — worker is iterating recipients. */
  SENDING: 2,
  /** 完了 — every recipient sent successfully. */
  COMPLETE: 3,
  /** 一部失敗 — at least one recipient failed. */
  PARTIAL_FAILURE: 4,
} as const;
export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

/**
 * Audit-log operation verb stored in `t_log.operation`.
 *
 * Convention (`.claude/rules/nestjs.md` §Audit Log): a BARE verb — never
 * prefixed with the entity or screen (`'JA_CREATE'` is forbidden; screen
 * context lives in `gamen_name`, entity in `target_table`). String-valued
 * so the DB column reads as the literal and log greps stay sane.
 *
 * BE-only: the FE never writes audit logs, so there is no FE mirror /
 * enum-sync pair. `operation` is an OPEN string vocabulary (this lists the
 * canonical verbs across the codebase; some callers compute it dynamically,
 * e.g. hanbaiten's IMPORT_*), so `AuditLogService` types the field as
 * `string` — this object is a convenience namespace for the named verbs,
 * not a closed union. Prefer a member over a raw literal at call sites.
 */
export const AuditOperation = {
  /** Row created. */
  CREATE: 'CREATE',
  /** Row updated. */
  UPDATE: 'UPDATE',
  /** Row (soft-)deleted. */
  DELETE: 'DELETE',
  /** File downloaded (signed-URL fetch). */
  DOWNLOAD: 'DOWNLOAD',
  /** Generic export. */
  EXPORT: 'EXPORT',
  /** CSV export (口座振替データ等). */
  EXPORT_CSV: 'EXPORT_CSV',
  /** Excel export (配達手数料支払情報等). */
  EXPORT_EXCEL: 'EXPORT_EXCEL',
  /** PDF export (帳票). */
  EXPORT_PDF: 'EXPORT_PDF',
  /** Excel import — new rows. */
  IMPORT_NEW: 'IMPORT_NEW',
  /** Excel import — full update of existing rows. */
  IMPORT_UPDATE_ALL: 'IMPORT_UPDATE_ALL',
  /** Excel import — partial update of selected columns. */
  IMPORT_UPDATE_PARTIAL: 'IMPORT_UPDATE_PARTIAL',
  /** Async notification mail send (worker). */
  SEND_NOTIFICATION: 'SEND_NOTIFICATION',
  /** 電子版（顧客システム）への会員情報送信。 */
  SYNC_DENSHIBAN: 'SYNC_DENSHIBAN',
  /** Scheduled / batch job. */
  CRON: 'CRON',
  /** Password reset completed. */
  PASSWORD_RESET: 'PASSWORD_RESET',
  /** Password-reset email requested. */
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
} as const;
export type AuditOperation =
  (typeof AuditOperation)[keyof typeof AuditOperation];

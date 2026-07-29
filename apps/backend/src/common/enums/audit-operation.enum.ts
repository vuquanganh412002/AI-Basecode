/**
 * `t_log.operation` 監査操作動詞。
 *
 * 規約 (`.claude/rules/nestjs.md` §Audit Log): BARE 動詞のみ — entity/screen
 * を前置しない (`'JA_CREATE'` 禁止; screen は `gamen_name`、entity は
 * `target_table`)。
 *
 * BE-only (FE は監査ログを書かない → FE mirror / enum-sync なし)。`operation`
 * は OPEN な文字列語彙 (一部は動的生成、例 hanbaiten IMPORT_*) なので
 * `AuditLogService` は `string` 型。ここは名前付き動詞の便宜 namespace で
 * closed union ではない。呼び出し側は生リテラルより member を優先。
 */
export const AuditOperation = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  DOWNLOAD: 'DOWNLOAD',
  EXPORT: 'EXPORT',
  /** CSV export (口座振替データ等). */
  EXPORT_CSV: 'EXPORT_CSV',
  /** Excel export (配達手数料支払情報等). */
  EXPORT_EXCEL: 'EXPORT_EXCEL',
  /** PDF export (帳票). */
  EXPORT_PDF: 'EXPORT_PDF',
  IMPORT_NEW: 'IMPORT_NEW',
  IMPORT_UPDATE_ALL: 'IMPORT_UPDATE_ALL',
  IMPORT_UPDATE_PARTIAL: 'IMPORT_UPDATE_PARTIAL',
  SEND_NOTIFICATION: 'SEND_NOTIFICATION',
  CRON: 'CRON',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
} as const;
export type AuditOperation =
  (typeof AuditOperation)[keyof typeof AuditOperation];

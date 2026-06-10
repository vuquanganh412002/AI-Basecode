/**
 * Log-type discriminator stored in `t_log.log_type`.
 *
 * Mirror of `m_code.code_category = 'LOG_TYPE'` (see seeder.md §5).
 * The DB column stays integer; this constant gives branching logic and
 * test code a self-documenting name. Display labels live in `m_code`
 * and can be edited at runtime — only the *values* are fixed here.
 *
 * Adding / removing a value requires a code change + migration.
 * Renaming the label (e.g. ERROR → ERROR_INTERNAL on the customer side)
 * does NOT require a redeploy — change `m_code.code_name` and reload
 * the cache.
 *
 * Naming convention: PascalCase identifier (TS type-like) + UPPER_SNAKE_CASE
 * members (project's `naming-conventions.md` rule for fixed constants).
 *
 * Keep in sync with `apps/frontend/src/constants/enums/log-type.ts`.
 * The integration test `enum-sync.spec.ts` fails CI if they drift.
 */
export const LogType = {
  /** 利用者操作ログ */
  USER_OPERATION: 1,
  /** システムログ */
  SYSTEM: 2,
  /** エラーログ */
  ERROR: 3,
  /** ファイル操作ログ（アップロード／ダウンロード） */
  FILE_OPERATION: 4,
} as const;
export type LogType = (typeof LogType)[keyof typeof LogType];

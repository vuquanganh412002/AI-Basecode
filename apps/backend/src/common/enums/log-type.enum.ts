/**
 * ログ種別。`t_log.log_type`。
 * Mirror of `m_code.code_category = 'LOG_TYPE'` (seeder.md §5)。
 * 値のみ固定 (分岐/テストに自己説明的な名前を与える)、label は `m_code` で
 * runtime 編集可。値の追加/削除は code 変更 + migration。label rename
 * (例 ERROR→ERROR_INTERNAL) は redeploy 不要 (`m_code.code_name` 変更 + reload)。
 *
 * `apps/frontend/src/constants/enums/log-type.ts` と同期。
 * `enum-sync.spec.ts` が drift 時 CI fail。
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

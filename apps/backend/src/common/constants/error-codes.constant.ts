/**
 * Error code constants — single source of truth for API error responses.
 *
 * Keep in sync with `apps/frontend/src/constants/error-codes.ts`.
 * When adding a new code, update both files AND the FE error-handler switch.
 */
export const ErrorCode = {
  // ─── Common (all screens) ───────────────────────────────────────────────
  BAD_REQUEST: 'BAD_REQUEST',                     // 400 — malformed request
  VALIDATION_ERROR: 'VALIDATION_ERROR',           // 400 — field-level validation failed (body carries `errors[]`)
  DUPLICATE_CODE: 'DUPLICATE_CODE',               // 400 — unique constraint violation
  UNAUTHORIZED: 'UNAUTHORIZED',                   // 401 — session expired
  FORBIDDEN: 'FORBIDDEN',                         // 403 — no permission
  DATA_SCOPE_VIOLATION: 'DATA_SCOPE_VIOLATION',   // 403 — has permission but data out of scope
  NOT_FOUND: 'NOT_FOUND',                         // 404 — resource not found
  CONFLICT: 'CONFLICT',                           // 409 — state conflict (delete blocked, etc.)
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',         // 429 — rate limited
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR', // 500

  // ─── SCR-019 — 販売店Excelデータ取込 ──────────────────────────────────
  IMPORT_VALIDATION_ERROR: 'IMPORT_VALIDATION_ERROR', // 400 — row-level errors with errors[].row
  FILE_FORMAT_ERROR: 'FILE_FORMAT_ERROR',             // 400 — Excel parsing / unsupported format
  ROW_LIMIT_EXCEEDED: 'ROW_LIMIT_EXCEEDED',           // 400 — >500 rows in one import
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Default Japanese messages for each error code.
 * Override per-exception when a more specific message applies.
 */
export const ErrorMessage: Record<ErrorCode, string> = {
  BAD_REQUEST: 'リクエストパラメータが不正です。',
  VALIDATION_ERROR: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
  DUPLICATE_CODE: '同一のコードが既に登録されています。',
  UNAUTHORIZED: 'セッションが切れました。再度ログインしてください。',
  FORBIDDEN: 'この画面へのアクセス権限がありません。',
  DATA_SCOPE_VIOLATION: 'このデータへのアクセス権限がありません。',
  NOT_FOUND: '指定されたデータが見つかりません。',
  CONFLICT: '関連データが存在するため処理を実行できません。',
  TOO_MANY_REQUESTS:
    'リクエスト回数が上限を超えました。しばらくしてから再度お試しください。',
  INTERNAL_SERVER_ERROR:
    'システムエラーが発生しました。しばらくしてから再度お試しください。',
  IMPORT_VALIDATION_ERROR:
    'Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。',
  FILE_FORMAT_ERROR:
    'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。',
  ROW_LIMIT_EXCEEDED: '取込データ行数の上限（500行）を超えています。',
};

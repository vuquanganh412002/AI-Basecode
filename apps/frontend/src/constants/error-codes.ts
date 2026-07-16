/**
 * Error code constants — mirror of `apps/backend/src/common/constants/error-codes.constant.ts`.
 *
 * Keep both files in sync. When adding a new code:
 *  1. Add it here AND in the backend constant
 *  2. Add a case to the `handleApiError` switch in `src/api/error-handler.ts`
 */
export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_CODE: 'DUPLICATE_CODE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  DATA_SCOPE_VIOLATION: 'DATA_SCOPE_VIOLATION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',

  // ─── SCR-001 login-screen specific ─────────────────────────────────────
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  INVALID_MFA_TOKEN: 'INVALID_MFA_TOKEN',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  OTP_RESEND_LIMIT: 'OTP_RESEND_LIMIT',
  OTP_RESEND_COOLDOWN: 'OTP_RESEND_COOLDOWN',

  // ─── SCR-019 — 販売店Excelデータ取込 ─────────────────────────────────
  IMPORT_VALIDATION_ERROR: 'IMPORT_VALIDATION_ERROR',
  // FILE_FORMAT_ERROR shared with SCR-023 (different message per screen,
  // BE-owned — FE just routes on the code).
  FILE_FORMAT_ERROR: 'FILE_FORMAT_ERROR',
  ROW_LIMIT_EXCEEDED: 'ROW_LIMIT_EXCEEDED',

  // ─── SCR-023 — ファイルアップロード画面 ───────────────────────────────
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  TARGET_JA_REQUIRED: 'TARGET_JA_REQUIRED',

  // ─── SCR-011 — 購読者情報登録画面 ─────────────────────────────────────
  // 403 — account lacks paper_flg/denshi_flg for the row's 購読種別.
  SHUBETSU_PERMISSION_DENIED: 'SHUBETSU_PERMISSION_DENIED',

  // ─── SCR-020 — 口座振替データ出力画面 ─────────────────────────────────
  // 409 — 出力対象に失効単価(active_flg=false)を参照する購読者が存在。
  // body.errors[] = { field: dokusya_id, message: 購読者名 + 単価 } を
  // SCR-020 のビューで一覧提示し、手動で単価変更へ誘導する。
  INACTIVE_TANKA_REFERENCED: 'INACTIVE_TANKA_REFERENCED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard API error response body from backend's GlobalExceptionFilter.
 */
export interface ApiErrorResponse {
  error_code: ErrorCode | string;
  message: string;
  errors?: { field: string; message: string }[];
}

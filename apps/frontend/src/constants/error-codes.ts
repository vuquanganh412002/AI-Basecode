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
  FILE_FORMAT_ERROR: 'FILE_FORMAT_ERROR',
  ROW_LIMIT_EXCEEDED: 'ROW_LIMIT_EXCEEDED',
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

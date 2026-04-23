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

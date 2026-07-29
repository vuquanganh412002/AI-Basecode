/**
 * エラーコード定数 — `apps/backend/src/common/constants/error-codes.constant.ts` のミラー。
 *
 * 両ファイルを同期させること。新コード追加時:
 *  1. ここと BE の定数の両方に追加
 *  2. `src/api/error-handler.ts` の `handleApiError` switch に case を追加
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

  // ─── SCR-001 ログイン画面固有 ─────────────────────────────────────
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
  // FILE_FORMAT_ERROR は SCR-023 と共有（メッセージは画面ごとに異なり BE 管理 —
  // FE はコードで振り分けるだけ）。
  FILE_FORMAT_ERROR: 'FILE_FORMAT_ERROR',
  ROW_LIMIT_EXCEEDED: 'ROW_LIMIT_EXCEEDED',

  // ─── SCR-023 — ファイルアップロード画面 ───────────────────────────────
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  TARGET_JA_REQUIRED: 'TARGET_JA_REQUIRED',

  // ─── SCR-011 — 購読者情報登録画面 ─────────────────────────────────────
  // 403 — 該当行の 購読種別 に対する paper_flg/denshi_flg 権限がアカウントに無い。
  SHUBETSU_PERMISSION_DENIED: 'SHUBETSU_PERMISSION_DENIED',

  // ─── SCR-020 — 口座振替データ出力画面 ─────────────────────────────────
  // 409 — 出力対象に失効単価(active_flg=false)を参照する購読者が存在。
  // body.errors[] = { field: dokusya_id, message: 購読者名 + 単価 } を
  // SCR-020 のビューで一覧提示し、手動で単価変更へ誘導する。
  INACTIVE_TANKA_REFERENCED: 'INACTIVE_TANKA_REFERENCED',

  // ─── SCR-011/014/016 — 電子版連携(push) ───────────────────────────────
  // 502 — cloud → 電子版 updateUserInfo push 失敗（同期 Saga のため cloud 側
  // 書き込みもロールバック済み）。message をそのままトースト表示する。
  //
  // ※ 電子版が拒否した場合、error_code は先方のコード（V15 / P01 / E03 … 顧客
  //   提供 Excel「エラーコード一覧」の定義）がそのまま入る。48 種あり、FE 側で
  //   分岐する要件も無いためここには列挙しない — error-handler の default 節が
  //   message をトーストするので表示は成立する。本定数は「電子版まで到達せず
  //   cloud 側で失敗した」ケース専用。
  DENSHIBAN_PUSH_FAILED: 'DENSHIBAN_PUSH_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * BE の GlobalExceptionFilter が返す標準 API エラーレスポンスボディ。
 */
export interface ApiErrorResponse {
  error_code: ErrorCode | string;
  message: string;
  errors?: { field: string; message: string }[];
}

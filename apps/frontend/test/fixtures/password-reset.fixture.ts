// Test fixtures for ACSMS-SCR-012 (パスワードの再設定・パスワードの変更).
// Mirrors api.md レスポンスデータ for forgot-password / verify / reset endpoints.

export interface ForgotPasswordResponseFixture {
  message: string;
}

export function buildForgotPasswordSuccess(): ForgotPasswordResponseFixture {
  return {
    message:
      'パスワード再設定用のメールを送信しました。メールを確認してください。',
  };
}

export interface VerifyResetTokenResponseFixture {
  valid: true;
}

export function buildVerifyResetTokenSuccess(): VerifyResetTokenResponseFixture {
  return { valid: true };
}

export interface ResetPasswordResponseFixture {
  message: string;
}

export function buildResetPasswordSuccess(): ResetPasswordResponseFixture {
  return { message: 'パスワードを更新しました。ログイン画面に移動します。' };
}

/**
 * Build a rejected-promise payload that matches the axios error shape
 * the global interceptor expects (`error.response.data`).
 *
 * Use cases:
 *   - INVALID_RESET_TOKEN  — token doesn't exist or has been used
 *   - EXPIRED_RESET_TOKEN  — token past its 30-minute window
 *   - VALIDATION_ERROR     — body shape rejected by class-validator
 */
export function buildAxiosError(
  errorCode: string,
  message: string,
  status = 400,
  errors?: { field: string; message: string }[],
): { response: { status: number; data: Record<string, unknown> } } {
  return {
    response: {
      status,
      data: { error_code: errorCode, message, ...(errors ? { errors } : {}) },
    },
  };
}

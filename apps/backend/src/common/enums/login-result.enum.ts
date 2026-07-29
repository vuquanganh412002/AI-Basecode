/**
 * ログイン結果。`t_login_log.login_result`。
 * Mirror of `m_code.code_category = 'LOGIN_RESULT'`。AuthService が成功/失敗
 * 両方を記録 (OTP resend は success-with-mfa-required 扱い)。
 *
 * `apps/frontend/src/constants/enums/login-result.ts` と同期。
 */
export const LoginResult = {
  SUCCESS: 1,
  FAILURE: 2,
} as const;
export type LoginResult = (typeof LoginResult)[keyof typeof LoginResult];

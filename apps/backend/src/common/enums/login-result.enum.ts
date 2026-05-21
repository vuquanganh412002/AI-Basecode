/**
 * Login attempt outcome stored in `t_login_log.login_result`.
 *
 * Mirror of `m_code.code_category = 'LOGIN_RESULT'`. Used by AuthService
 * to record both successful and failed login attempts (including OTP
 * resends counted as success-with-mfa-required).
 *
 * Keep in sync with `apps/frontend/src/constants/enums/login-result.ts`.
 */
export const LoginResult = {
  SUCCESS: 1,
  FAILURE: 2,
} as const;
export type LoginResult = (typeof LoginResult)[keyof typeof LoginResult];

/**
 * OTP 種別。`t_mfa_otp.otp_type`。
 * Mirror of `m_code.code_category = 'OTP_TYPE'`。`t_mfa_otp` を MFA OTP (login)
 * と password reset token (forgot-password) に分割。両者は同一 schema
 * (bcrypt code, expiry, attempt counter) だが lifetime/消費ロジックが異なる
 * ため この discriminator で分離。
 *
 * `apps/frontend/src/constants/enums/otp-type.ts` と同期。
 */
export const OtpType = {
  /** ログイン MFA 用 6 桁 OTP（5 分有効） */
  MFA: 1,
  /** パスワード再設定用トークン（1 時間有効） */
  PASSWORD_RESET: 2,
} as const;
export type OtpType = (typeof OtpType)[keyof typeof OtpType];

/**
 * OTP-type discriminator stored in `t_mfa_otp.otp_type`.
 *
 * Mirror of `m_code.code_category = 'OTP_TYPE'`. Used by AuthService to
 * partition the `t_mfa_otp` table into MFA OTPs (login flow) vs password
 * reset tokens (forgot-password flow). Both paths share the same table
 * schema (bcrypt-hashed code, expiry, attempt counter) but the lifetime
 * and consumption logic differ — keep them separated by this discriminator.
 *
 * Keep in sync with `apps/frontend/src/constants/enums/otp-type.ts`.
 */
export const OtpType = {
  /** ログイン MFA 用 6 桁 OTP（5 分有効） */
  MFA: 1,
  /** パスワード再設定用トークン（1 時間有効） */
  PASSWORD_RESET: 2,
} as const;
export type OtpType = (typeof OtpType)[keyof typeof OtpType];

// Screen: ACSMS-SCR-012 — パスワードの再設定・パスワードの変更
//
// Builder for reset-token rows in t_mfa_otp (otp_type=2).
// Used by password-reset.service.spec, password-reset.controller.spec,
// password-reset.integration.spec.

import type { MfaOtp } from '@/database/entities/mfa-otp.entity';

export function buildResetTokenOtp(overrides: Partial<MfaOtp> = {}): MfaOtp {
  // `expiredAt` defaults to NOW + 30min so tests that don't override it
  // (e.g. login_id-conflict, account-not-found) reach the validation step
  // they're actually asserting instead of tripping the expiry check.
  // Hardcoding a fixed clock here means the OTP becomes "expired" the
  // moment wall-clock advances past it — flaky-by-calendar.
  const now = new Date();
  return {
    otpId: 200,
    accountId: 1,
    // bcrypt(reset_token, 10). Specs override bcrypt.compare so the
    // literal hash doesn't need to be valid.
    otpCodeHash: '$2a$10$resetTokenHashStubXxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    otpType: 2, // 2 = PASSWORD_RESET (per docs/database/seeder.md OTP_TYPE)
    expiredAt: new Date(now.getTime() + 30 * 60 * 1000),
    verifyAttemptCount: 0,
    resendCount: 0,
    usedFlg: false,
    createdAt: now,
    ...overrides,
  } as unknown as MfaOtp;
}

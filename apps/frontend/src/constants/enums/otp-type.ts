/**
 * FE mirror of `apps/backend/src/common/enums/otp-type.enum.ts`.
 * Display labels come from `useCodesStore().label('OTP_TYPE', value)`.
 */
export const OtpType = {
  MFA: 1,
  PASSWORD_RESET: 2,
} as const;
export type OtpType = (typeof OtpType)[keyof typeof OtpType];

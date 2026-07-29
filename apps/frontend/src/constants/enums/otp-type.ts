/**
 * `apps/backend/src/common/enums/otp-type.enum.ts` の FE ミラー。
 * 表示ラベルは `useCodesStore().label('OTP_TYPE', value)` から取得。
 */
export const OtpType = {
  MFA: 1,
  PASSWORD_RESET: 2,
} as const;
export type OtpType = (typeof OtpType)[keyof typeof OtpType];

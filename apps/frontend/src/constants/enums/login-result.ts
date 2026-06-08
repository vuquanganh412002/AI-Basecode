/**
 * FE mirror of `apps/backend/src/common/enums/login-result.enum.ts`.
 * Display labels come from `useCodesStore().label('LOGIN_RESULT', value)`.
 */
export const LoginResult = {
  SUCCESS: 1,
  FAILURE: 2,
} as const;
export type LoginResult = (typeof LoginResult)[keyof typeof LoginResult];

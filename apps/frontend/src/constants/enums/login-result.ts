/**
 * `apps/backend/src/common/enums/login-result.enum.ts` の FE ミラー。
 * 表示ラベルは `useCodesStore().label('LOGIN_RESULT', value)` から取得。
 */
export const LoginResult = {
  SUCCESS: 1,
  FAILURE: 2,
} as const;
export type LoginResult = (typeof LoginResult)[keyof typeof LoginResult];

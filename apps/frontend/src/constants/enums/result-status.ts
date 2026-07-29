/**
 * `apps/backend/src/common/enums/result-status.enum.ts` の FE ミラー。
 * 表示ラベルは `useCodesStore().label('RESULT_STATUS', value)` から取得。
 */
export const ResultStatus = {
  SUCCESS: 1,
  FAILURE: 2,
  WARNING: 3,
} as const;
export type ResultStatus = (typeof ResultStatus)[keyof typeof ResultStatus];

/**
 * FE mirror of `apps/backend/src/common/enums/result-status.enum.ts`.
 * Display labels come from `useCodesStore().label('RESULT_STATUS', value)`.
 */
export const ResultStatus = {
  SUCCESS: 1,
  FAILURE: 2,
  WARNING: 3,
} as const;
export type ResultStatus = (typeof ResultStatus)[keyof typeof ResultStatus];

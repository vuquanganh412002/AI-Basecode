/**
 * FE mirror of `apps/backend/src/common/enums/log-type.enum.ts`.
 * Display labels come from `useCodesStore().label('LOG_TYPE', value)`.
 * Keep values in lockstep — `enum-sync.spec.ts` fails CI on drift.
 */
export const LogType = {
  USER_OPERATION: 1,
  SYSTEM: 2,
  ERROR: 3,
  FILE_OPERATION: 4,
} as const;
export type LogType = (typeof LogType)[keyof typeof LogType];

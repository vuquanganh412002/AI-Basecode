/**
 * `apps/backend/src/common/enums/log-type.enum.ts` の FE ミラー。
 * 表示ラベルは `useCodesStore().label('LOG_TYPE', value)` から取得。
 * 値を完全一致させること — `enum-sync.spec.ts` がドリフト時に CI を失敗させる。
 */
export const LogType = {
  USER_OPERATION: 1,
  SYSTEM: 2,
  ERROR: 3,
  FILE_OPERATION: 4,
} as const;
export type LogType = (typeof LogType)[keyof typeof LogType];

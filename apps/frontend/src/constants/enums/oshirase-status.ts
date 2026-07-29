/**
 * `apps/backend/src/common/enums/oshirase-status.enum.ts` の FE ミラー。
 * 表示ラベルは `useCodesStore().label('OSHIRASE_STATUS', value)` から取得。
 */
export const OshiraseStatus = {
  DRAFT: 1,
  PUBLIC: 2,
  HIDDEN: 3,
} as const;
export type OshiraseStatus = (typeof OshiraseStatus)[keyof typeof OshiraseStatus];

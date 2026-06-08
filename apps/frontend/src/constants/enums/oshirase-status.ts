/**
 * FE mirror of `apps/backend/src/common/enums/oshirase-status.enum.ts`.
 * Display labels come from `useCodesStore().label('OSHIRASE_STATUS', value)`.
 */
export const OshiraseStatus = {
  DRAFT: 1,
  PUBLIC: 2,
  HIDDEN: 3,
} as const;
export type OshiraseStatus = (typeof OshiraseStatus)[keyof typeof OshiraseStatus];

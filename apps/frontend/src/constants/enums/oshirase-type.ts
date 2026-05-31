/**
 * Mirror of `apps/backend/src/common/enums/oshirase-type.enum.ts`.
 *
 * Display labels come from `useCodesStore().label('OSHIRASE_TYPE', ...)`
 * — NEVER hardcode in templates.
 */
export const OshiraseType = {
  SYSTEM: 1,
  IMPORTANT: 2,
  GENERAL: 3,
  DEADLINE: 4,
} as const;
export type OshiraseType = (typeof OshiraseType)[keyof typeof OshiraseType];

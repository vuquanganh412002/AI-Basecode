/**
 * `apps/backend/src/common/enums/oshirase-type.enum.ts` のミラー。
 *
 * 表示ラベルは `useCodesStore().label('OSHIRASE_TYPE', ...)` から取得 —
 * テンプレートにハードコードしない。
 */
export const OshiraseType = {
  SYSTEM: 1,
  IMPORTANT: 2,
  GENERAL: 3,
  DEADLINE: 4,
} as const;
export type OshiraseType = (typeof OshiraseType)[keyof typeof OshiraseType];

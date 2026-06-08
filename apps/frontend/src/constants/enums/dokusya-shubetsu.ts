/**
 * Mirror of `apps/backend/src/common/enums/dokusya-shubetsu.enum.ts`
 * (`m_code.code_category = 'DOKUSYA_SHUBETSU'`).
 *
 * Group A: used for branching (電子版/併読 toggle the 配達先 section, payment
 * method allow-list, etc.). Labels come from `useCodesStore().label(...)`.
 */
export const DokusyaShubetsu = {
  /** 紙版 */
  PAPER: 1,
  /** 電子版 */
  DIGITAL: 2,
  /** 併読（紙版＋電子版） */
  BOTH: 3,
} as const;
export type DokusyaShubetsu =
  (typeof DokusyaShubetsu)[keyof typeof DokusyaShubetsu];

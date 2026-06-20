/**
 * Mirror of `apps/backend/src/common/enums/tetsuzuki-shurui.enum.ts`
 * (`m_code.code_category = 'TETSUZUKI_SHURUI'`).
 *
 * Group A: used for branching — 解約 zeroes 部数 on import / forces the
 * 購読中止日, 新規 restores. Labels come from `useCodesStore().label(...)`.
 */
export const TetsuzukiShurui = {
  /** 解約 */
  KAIYAKU: 0,
  /** 新規 */
  SHINKI: 1,
} as const;
export type TetsuzukiShurui =
  (typeof TetsuzukiShurui)[keyof typeof TetsuzukiShurui];

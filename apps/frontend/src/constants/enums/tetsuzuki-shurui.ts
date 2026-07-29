/**
 * `apps/backend/src/common/enums/tetsuzuki-shurui.enum.ts` のミラー
 * （`m_code.code_category = 'TETSUZUKI_SHURUI'`）。
 *
 * Group A: 分岐に使用 — 解約 は取込時に 部数 を 0 にし 購読中止日 を強制、新規 は復元する。
 * ラベルは `useCodesStore().label(...)` から取得。
 */
export const TetsuzukiShurui = {
  /** 解約 */
  KAIYAKU: 0,
  /** 新規 */
  SHINKI: 1,
} as const;
export type TetsuzukiShurui =
  (typeof TetsuzukiShurui)[keyof typeof TetsuzukiShurui];

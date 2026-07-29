/**
 * `apps/backend/src/common/enums/itaku-kubun.enum.ts` のミラー
 * （`m_code.code_category = 'ITAKU_KUBUN'`）。
 *
 * Group A: 振込 (=1) は販売店フォームで銀行口座群を必須にする。日農委託 / その他 はしない。
 * ラベルは `useCodesStore().label(...)` から取得。
 */
export const ItakuKubun = {
  /** 振込 */
  FURIKOMI: 1,
  /** 日農委託 */
  NICHINO_ITAKU: 2,
  /** その他 */
  SONOTA: 9,
} as const;
export type ItakuKubun = (typeof ItakuKubun)[keyof typeof ItakuKubun];

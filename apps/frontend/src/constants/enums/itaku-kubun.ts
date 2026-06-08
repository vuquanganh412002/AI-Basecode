/**
 * Mirror of `apps/backend/src/common/enums/itaku-kubun.enum.ts`
 * (`m_code.code_category = 'ITAKU_KUBUN'`).
 *
 * Group A: 振込 (=1) makes the bank-account cluster required on the hanbaiten
 * form; 日農委託 / その他 do not. Labels come from `useCodesStore().label(...)`.
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

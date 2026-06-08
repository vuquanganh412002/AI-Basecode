/**
 * Consignment kind stored in `m_hanbaiten.itaku_kubun`.
 *
 * Mirror of `m_code.code_category = 'ITAKU_KUBUN'`. Group A because the code
 * branches on the value: 振込 (=1) makes the bank-account cluster required;
 * 日農委託 / その他 do not — see HanbaitenFormView / hanbaiten.service.
 *
 * Keep in sync with `apps/frontend/src/constants/enums/itaku-kubun.ts`.
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

/**
 * 委託区分。`m_hanbaiten.itaku_kubun`。
 * Mirror of `m_code.code_category = 'ITAKU_KUBUN'`。Group A: code が値で分岐
 * (振込(=1) は銀行口座群を必須化、日農委託/その他 は不要) —
 * HanbaitenFormView / hanbaiten.service。
 *
 * `apps/frontend/src/constants/enums/itaku-kubun.ts` と同期。
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

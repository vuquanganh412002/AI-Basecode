/**
 * Mirror of `apps/backend/src/common/enums/shiharai-hoho.enum.ts`
 * (`m_code.code_category = 'SHIHARAI_HOHO'`).
 *
 * Group A: used for branching (口座引落 makes the bank cluster required,
 * etc.). Labels come from `useCodesStore().label(...)`.
 */
export const ShiharaiHoho = {
  /** 口座引落 */
  KOZA_HIKIOTOSHI: 1,
  /** 現金集金 */
  GENKIN_SHUKIN: 2,
  /** 振込集金 */
  FURIKOMI_SHUKIN: 3,
  /** JA施設等 */
  JA_SHISETSU: 4,
  /** 給与天引き */
  KYUYO_TENBIKI: 5,
  /** クレジットカード */
  CREDIT_CARD: 6,
  /** その他 */
  SONOTA: 9,
} as const;
export type ShiharaiHoho = (typeof ShiharaiHoho)[keyof typeof ShiharaiHoho];

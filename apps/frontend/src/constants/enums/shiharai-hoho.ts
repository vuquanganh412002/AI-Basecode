/**
 * `apps/backend/src/common/enums/shiharai-hoho.enum.ts` のミラー
 * （`m_code.code_category = 'SHIHARAI_HOHO'`）。
 *
 * Group A: 分岐に使用（口座引落 が銀行群を必須にする 等）。
 * ラベルは `useCodesStore().label(...)` から取得。
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

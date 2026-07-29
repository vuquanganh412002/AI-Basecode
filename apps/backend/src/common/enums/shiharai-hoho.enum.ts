/**
 * 支払方法。`t_dokusya_rireki.shiharai_hoho`。
 * Mirror of `m_code.code_category = 'SHIHARAI_HOHO'`。Group A: code が値で分岐
 * (口座引落→銀行群必須、クレジットカード→JA role では読取専用 等)。
 *
 * `apps/frontend/src/constants/enums/shiharai-hoho.ts` と同期。
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

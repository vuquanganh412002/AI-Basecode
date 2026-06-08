/**
 * Payment method stored in `t_dokusya_rireki.shiharai_hoho`.
 *
 * Mirror of `m_code.code_category = 'SHIHARAI_HOHO'`. Group A because the
 * code branches on the value (口座引落 makes the bank cluster required,
 * クレジットカード is read-only for JA roles, etc.).
 *
 * Keep in sync with `apps/frontend/src/constants/enums/shiharai-hoho.ts`.
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

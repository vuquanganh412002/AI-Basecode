/**
 * `apps/backend/src/common/enums/nogyosya-bunrui.enum.ts` のミラー
 * （`m_code.code_category = 'NOGYOSYA_BUNRUI'`）。
 *
 * Group A: SONOTA(=999) を含むときだけ「その他」自由記述欄を有効化する
 * （顧客DB設計 2026-08）。
 *
 * **複数選択**。列にはカンマ区切りで格納される（例 `'0,2,999'`）。
 * ラベルは `useCodesStore().label('NOGYOSYA_BUNRUI', value)` から取得。
 */
export const NogyosyaBunrui = {
  /** 米 */
  KOME: 0,
  /** 野菜 */
  YASAI: 1,
  /** 果実 */
  KAJITSU: 2,
  /** 花 */
  HANA: 3,
  /** 畜産 */
  CHIKUSAN: 4,
  /** 酪農 */
  RAKUNO: 5,
  /** その他 */
  SONOTA: 999,
} as const;
export type NogyosyaBunrui =
  (typeof NogyosyaBunrui)[keyof typeof NogyosyaBunrui];

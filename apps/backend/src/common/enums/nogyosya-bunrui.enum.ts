/**
 * 農業者分類。`t_dokusya.nogyosya_bunrui` / `t_dokusya_rireki.nogyosya_bunrui`。
 * Mirror of `m_code.code_category = 'NOGYOSYA_BUNRUI'`。
 *
 * Group A: SONOTA(=999) を含むときだけ `nogyosya_bunrui_sonota`（自由記述）を
 * 入力できる（顧客DB設計 2026-08）。
 *
 * **複数選択**。列にはカンマ区切りで格納される（例 `'0,2,999'`）。値を1件ずつ
 * 突き合わせるときにこの定数を使う。単一選択なのは `DokusyasoBunrui` の方。
 *
 * 電子版読者管理システムの `users.products` と 1:1。
 * `apps/frontend/src/constants/enums/nogyosya-bunrui.ts` と同期。
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

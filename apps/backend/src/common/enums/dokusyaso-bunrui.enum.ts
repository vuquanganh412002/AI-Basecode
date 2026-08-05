/**
 * 購読者層分類。`t_dokusya.dokusyaso_bunrui` / `t_dokusya_rireki.dokusyaso_bunrui`。
 * Mirror of `m_code.code_category = 'DOKUSYASO_BUNRUI'`。
 *
 * Group A: 値そのもので入力可否が分岐する（顧客DB設計 2026-08）—
 *   NOGYOSYA(=0)     のときだけ `ja_yakushokuin_flg` を TRUE にできる
 *   KIGYO_DANTAI(=2) のときだけ `nogyo_kankei_flg` を TRUE にできる
 *   SONOTA(=999)     のときだけ `dokusyaso_bunrui_sonota` を入力できる
 *
 * **単一選択**。カンマ区切りの複数値は入らない（複数選択なのは
 * `NogyosyaBunrui` の方）。
 *
 * 電子版読者管理システムの `users.profession` と 1:1。
 * `apps/frontend/src/constants/enums/dokusyaso-bunrui.ts` と同期。
 */
export const DokusyasoBunrui = {
  /** 農業者 */
  NOGYOSYA: 0,
  /** JAグループ役職員 */
  JA_YAKUSHOKUIN: 1,
  /** 企業・団体 */
  KIGYO_DANTAI: 2,
  /** 学生 */
  GAKUSEI: 3,
  /** その他 */
  SONOTA: 999,
} as const;
export type DokusyasoBunrui =
  (typeof DokusyasoBunrui)[keyof typeof DokusyasoBunrui];

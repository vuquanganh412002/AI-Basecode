/**
 * `apps/backend/src/common/enums/dokusyaso-bunrui.enum.ts` のミラー
 * （`m_code.code_category = 'DOKUSYASO_BUNRUI'`）。
 *
 * Group A: 値そのもので入力可否が分岐する（顧客DB設計 2026-08）—
 *   NOGYOSYA(=0)     のときだけ「かつJAグループ役職員」チェックを有効化
 *   KIGYO_DANTAI(=2) のときだけ「農業関係」チェックを有効化
 *   SONOTA(=999)     のときだけ「その他」自由記述欄を有効化
 *
 * **単一選択**（複数選択なのは `NogyosyaBunrui` の方）。
 * ラベルは `useCodesStore().label('DOKUSYASO_BUNRUI', value)` から取得。
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

/**
 * 購読種別。`t_dokusya_rireki.dokusya_shubetsu`。
 * Mirror of `m_code.code_category = 'DOKUSYA_SHUBETSU'`。Group A: code が値で
 * 分岐 (電子版→配達先非表示、併読→配達ルール等) — DokusyaFormView / dokusya.service。
 *
 * `apps/frontend/src/constants/enums/dokusya-shubetsu.ts` と同期。
 */
export const DokusyaShubetsu = {
  /** 紙版 */
  PAPER: 1,
  /** 電子版 */
  DIGITAL: 2,
  /** 併読（紙版＋電子版） */
  BOTH: 3,
} as const;
export type DokusyaShubetsu =
  (typeof DokusyaShubetsu)[keyof typeof DokusyaShubetsu];

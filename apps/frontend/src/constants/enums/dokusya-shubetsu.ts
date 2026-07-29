/**
 * `apps/backend/src/common/enums/dokusya-shubetsu.enum.ts` のミラー
 * （`m_code.code_category = 'DOKUSYA_SHUBETSU'`）。
 *
 * Group A: 分岐に使用（電子版/併読 が 配達先 セクションや支払方法の許可リスト等を切り替える）。
 * ラベルは `useCodesStore().label(...)` から取得。
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

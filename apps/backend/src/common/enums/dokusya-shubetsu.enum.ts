/**
 * Subscription kind stored in `t_dokusya_rireki.dokusya_shubetsu`.
 *
 * Mirror of `m_code.code_category = 'DOKUSYA_SHUBETSU'`. Group A because the
 * code branches on the value (電子版 hides the 配達先 section, 併読 affects
 * delivery rules, etc.) — see DokusyaFormView / dokusya.service.
 *
 * Keep in sync with `apps/frontend/src/constants/enums/dokusya-shubetsu.ts`.
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

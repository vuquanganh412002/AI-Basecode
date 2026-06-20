/**
 * 手続種類 stored in `t_dokusya_rireki.tetsuzuki_shurui` (SCR-011 登録 /
 * SCR-016 取込). Mirror of `m_code.code_category = 'TETSUZUKI_SHURUI'`.
 *
 * Group A because the code branches on the value: 解約 forces
 * `dokusya_busu` to 0 (api.md §4.4), 新規 restores it. See
 * dokusya.service.ts and the FE DokusyaImportView / DokusyaFormView.
 *
 * Keep in sync with `apps/frontend/src/constants/enums/tetsuzuki-shurui.ts`.
 * Labels (解約 / 新規) come from `m_code` via CodeService — never hardcode.
 */
export const TetsuzukiShurui = {
  /** 解約 */
  KAIYAKU: 0,
  /** 新規 */
  SHINKI: 1,
} as const;
export type TetsuzukiShurui =
  (typeof TetsuzukiShurui)[keyof typeof TetsuzukiShurui];

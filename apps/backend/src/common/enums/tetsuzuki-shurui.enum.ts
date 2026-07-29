/**
 * 手続種類。`t_dokusya_rireki.tetsuzuki_shurui` (SCR-011 登録 / SCR-016 取込)。
 * Mirror of `m_code.code_category = 'TETSUZUKI_SHURUI'`。
 * Group A: code が値で分岐 — 解約 は `dokusya_busu` を 0 に強制 (api.md §4.4)、
 * 新規 は復元。dokusya.service.ts、FE DokusyaImportView / DokusyaFormView。
 *
 * `apps/frontend/src/constants/enums/tetsuzuki-shurui.ts` と同期。
 * label (解約/新規) は CodeService 経由 `m_code` から — hardcode 禁止。
 */
export const TetsuzukiShurui = {
  /** 解約 */
  KAIYAKU: 0,
  /** 新規 */
  SHINKI: 1,
} as const;
export type TetsuzukiShurui =
  (typeof TetsuzukiShurui)[keyof typeof TetsuzukiShurui];

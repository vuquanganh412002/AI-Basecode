/**
 * 電子申請承認ステータス stored in `t_dokusya.denshi_shonin_status` /
 * `t_dokusya_rireki.denshi_shonin_status`.
 *
 * NOT an m_code category — a pure internal workflow status with no
 * customer-editable label. Group A because the code branches on it: the
 * 承認 / 否認 endpoints set 1 / 2, and 電子版(2) の Excel取込 auto-approves
 * (1) since staff-driven. Adding a state is a code change + review.
 *
 * The FE branches on the VALUE in DokusyaFormView (承認待ち→単価のみ編集可 /
 * 否認→読取専用), so it is mirrored at
 * `apps/frontend/src/constants/enums/denshi-shonin-status.ts` with an
 * `enum-sync.spec.ts` PAIRS entry that fails CI on drift.
 */
export const DenshiShoninStatus = {
  /** 承認待ち */
  PENDING: 0,
  /** 承認 */
  APPROVED: 1,
  /** 否認 */
  REJECTED: 2,
} as const;
export type DenshiShoninStatus =
  (typeof DenshiShoninStatus)[keyof typeof DenshiShoninStatus];

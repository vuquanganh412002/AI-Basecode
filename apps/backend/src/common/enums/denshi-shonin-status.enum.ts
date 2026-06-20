/**
 * 電子申請承認ステータス stored in `t_dokusya.denshi_shonin_status` /
 * `t_dokusya_rireki.denshi_shonin_status`.
 *
 * NOT an m_code category — a pure internal workflow status with no
 * customer-editable label. Group A because the code branches on it: the
 * 承認 / 否認 endpoints set 1 / 2, and 電子版(2) の Excel取込 auto-approves
 * (1) since staff-driven. Adding a state is a code change + review.
 *
 * BE-only: the FE doesn't branch on the VALUE (it only presence-filters by
 * the column), so there is no FE mirror / enum-sync pair. Add one (and a
 * PAIRS entry in enum-sync.spec.ts) if the FE starts branching on it.
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

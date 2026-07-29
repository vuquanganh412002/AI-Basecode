/**
 * 電子申請承認ステータス。`t_dokusya.denshi_shonin_status` /
 * `t_dokusya_rireki.denshi_shonin_status`。
 *
 * m_code カテゴリではない — 顧客編集ラベルのない純内部ワークフロー状態。
 * Group A: code が分岐する (承認/否認 が 1/2 をセット、電子版(2) の Excel取込
 * は staff 駆動なので auto-approve(1))。状態追加は code 変更 + review。
 *
 * FE は VALUE で分岐 (DokusyaFormView: 承認待ち→単価のみ編集可 / 否認→読取専用)
 * → `apps/frontend/src/constants/enums/denshi-shonin-status.ts` に mirror、
 * `enum-sync.spec.ts` PAIRS で drift 時 CI fail。
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

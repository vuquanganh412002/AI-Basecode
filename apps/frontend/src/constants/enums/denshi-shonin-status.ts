/**
 * 電子申請承認ステータス — mirror of
 * `apps/backend/src/common/enums/denshi-shonin-status.enum.ts`
 * (`t_dokusya.denshi_shonin_status`).
 *
 * 電子版(2) の編集画面で挙動が分岐する（顧客要件）:
 *   0 承認待ち → 新聞単価以外を読取専用 + 承認/否認ボタン
 *   1 承認済   → 通常編集
 *   2 否認     → 全項目読取専用
 * 紙版は本ワークフロー対象外（denshi_shonin_status=null）。
 *
 * NOT an m_code category — labels are not customer-editable. Keep in sync
 * with the BE file; `enum-sync.spec.ts` fails CI on drift.
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

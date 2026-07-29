/**
 * お知らせ公開ステータス。`t_oshirase.status`。
 * Mirror of `m_code.code_category = 'OSHIRASE_STATUS'`。login (SCR-001) と menu
 * (SCR-002) が `WHERE status = PUBLIC` で filter — SQL と同期しないと未公開
 * draft が login 画面に漏れる。
 *
 * `apps/frontend/src/constants/enums/oshirase-status.ts` と同期。
 */
export const OshiraseStatus = {
  DRAFT: 1,
  PUBLIC: 2,
  HIDDEN: 3,
} as const;
export type OshiraseStatus = (typeof OshiraseStatus)[keyof typeof OshiraseStatus];

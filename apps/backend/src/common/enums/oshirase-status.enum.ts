/**
 * Notice publication status stored in `t_oshirase.status`.
 *
 * Mirror of `m_code.code_category = 'OSHIRASE_STATUS'`. The login screen
 * (SCR-001) and menu screen (SCR-002) both filter `WHERE status = PUBLIC`
 * — keep this constant in sync with the SQL filter, otherwise unpublished
 * drafts could leak to the login page.
 *
 * Keep in sync with `apps/frontend/src/constants/enums/oshirase-status.ts`.
 */
export const OshiraseStatus = {
  DRAFT: 1,
  PUBLIC: 2,
  HIDDEN: 3,
} as const;
export type OshiraseStatus = (typeof OshiraseStatus)[keyof typeof OshiraseStatus];

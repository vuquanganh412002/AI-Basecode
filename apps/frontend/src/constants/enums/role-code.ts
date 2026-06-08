/**
 * Account role discriminator. Mirror of
 * `apps/backend/src/common/enums/role-code.enum.ts`.
 *
 * Replaces magic-string comparisons (`'NICHINO_ADMIN'`,
 * `'CHUOKAI'`, …) that used to be scattered across views like
 * `RoleManagementView`, `JaFormView`, `KanriShitenFormView`,
 * `ShitenFormView`, `AccountsListView`, `AccountFormView`.
 *
 * Display label (`日農（管理者）` etc.) comes from the auth user's
 * `role_name` (joined from `m_roles` on the BE side) or the
 * `/api/v1/roles/dropdown` payload — NEVER hardcode in templates.
 */
export const RoleCode = {
  NICHINO_ADMIN: 'NICHINO_ADMIN',
  NICHINO_STAFF: 'NICHINO_STAFF',
  CHUOKAI: 'CHUOKAI',
  JA_HONTEN: 'JA_HONTEN',
  JA_KANRI_SHITEN: 'JA_KANRI_SHITEN',
} as const;
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

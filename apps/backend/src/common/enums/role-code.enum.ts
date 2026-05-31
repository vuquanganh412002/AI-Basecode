/**
 * Account role discriminator stored in `m_roles.role_code` and
 * propagated through `SessionPayload.role_code` after login.
 *
 * 5 roles are baked into business logic across the codebase
 * (DataScope filters, field-level restrictions, admin-only screens
 * like SCR-027). Set is fixed by design — adding a 6th role is a
 * code change + seeder migration, not a runtime extension. Therefore
 * Group A per `.claude/rules/nestjs.md §Group A vs Group B`.
 *
 * Naming intentionally mirrors the DB literal (`'NICHINO_ADMIN'`
 * etc.) — `role_code` is a varchar(50) in `m_roles`, not an integer
 * id. This file replaces the 5+ magic-string occurrences that used
 * to live in `role-admin.guard.ts` (deleted), `data-scope.ts`,
 * `field-restrictions.ts`, and several FE views.
 *
 * Keep in sync with `apps/frontend/src/constants/enums/role-code.ts`.
 * The integration test `enum-sync.spec.ts` fails CI if they drift.
 *
 * Display labels (`'日農（管理者）'` etc.) live in `m_roles.role_name`
 * (loaded by the auth store / role dropdown via /api/v1/roles or
 * /api/v1/roles/dropdown) — NEVER hardcode them in branching logic.
 */
export const RoleCode = {
  /** 日農（管理者） — system-wide super-admin. */
  NICHINO_ADMIN: 'NICHINO_ADMIN',
  /** 日農（担当者） — 販売店代行入力 etc. */
  NICHINO_STAFF: 'NICHINO_STAFF',
  /** 中央会 — chuokai-scoped. */
  CHUOKAI: 'CHUOKAI',
  /** JA本店 — own-JA-scoped. */
  JA_HONTEN: 'JA_HONTEN',
  /** JA管理支店 — own-branch-scoped. */
  JA_KANRI_SHITEN: 'JA_KANRI_SHITEN',
} as const;
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

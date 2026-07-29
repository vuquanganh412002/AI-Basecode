/**
 * アカウントロール。`m_roles.role_code`、login 後 `SessionPayload.role_code`。
 *
 * 5 roles が codebase の business logic に焼き込まれる (DataScope filter、
 * field-level restriction、SCR-027 等 admin-only 画面)。set は設計上固定 —
 * 6番目の role 追加は code 変更 + seeder migration、runtime 拡張ではない。
 * よって Group A (`.claude/rules/nestjs.md §Group A vs Group B`)。
 *
 * 命名は DB リテラル (`'NICHINO_ADMIN'` 等) を意図的に mirror — `role_code`
 * は `m_roles` の varchar(50) で整数 id ではない。
 *
 * `apps/frontend/src/constants/enums/role-code.ts` と同期。
 * `enum-sync.spec.ts` が drift 時 CI fail。
 *
 * label (`'日農（管理者）'` 等) は `m_roles.role_name` (/api/v1/roles or
 * /roles/dropdown 経由で load) — 分岐ロジックに hardcode 禁止。
 */
export const RoleCode = {
  /** 日農（管理者） — system-wide super-admin */
  NICHINO_ADMIN: 'NICHINO_ADMIN',
  /** 日農（担当者） — 販売店代行入力 等 */
  NICHINO_STAFF: 'NICHINO_STAFF',
  /** 中央会 — chuokai-scoped */
  CHUOKAI: 'CHUOKAI',
  /** JA本店 — own-JA-scoped */
  JA_HONTEN: 'JA_HONTEN',
  /** JA管理支店 — own-branch-scoped */
  JA_KANRI_SHITEN: 'JA_KANRI_SHITEN',
} as const;
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

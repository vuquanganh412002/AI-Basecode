/**
 * Notice type discriminator stored in `t_oshirase.oshirase_type`.
 *
 * Mirror of `m_code.code_category = 'OSHIRASE_TYPE'` (seeder.md §5.13).
 * Promoted from Group B → Group A because value 4 (`DEADLINE`) drives
 * mandatory business branching in 3 places:
 *
 *   - 締め切り時間 must pair 1:1 with `publish_location = MENU_DEADLINE`
 *     (`assertDeadlineLocationPairing` in oshirase.service.ts).
 *   - Only ONE 締め切り時間 row may exist system-wide (uniqueness check).
 *   - 締め切り時間 rows are NOT deletable (FE disables 削除 link, BE
 *     rejects DELETE with HTTP 400).
 *
 * Display labels (`システム` / `重要` / `一般` / `締め切り時間`) live in
 * `m_code.code_name` and can be edited at runtime by the customer
 * without redeploy — only the VALUES are fixed here.
 *
 * Naming convention: PascalCase identifier + UPPER_SNAKE_CASE members
 * (project's `naming-conventions.md` for fixed-constant values).
 *
 * Keep in sync with `apps/frontend/src/constants/enums/oshirase-type.ts`.
 * The integration test `enum-sync.spec.ts` fails CI if they drift.
 */
export const OshiraseType = {
  /** システム */
  SYSTEM: 1,
  /** 重要 */
  IMPORTANT: 2,
  /** 一般 */
  GENERAL: 3,
  /** 締め切り時間 — special slot, 1件のみ運用、削除不可、location=3 専用 */
  DEADLINE: 4,
} as const;
export type OshiraseType = (typeof OshiraseType)[keyof typeof OshiraseType];

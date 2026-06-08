/**
 * Barrel export for fixed-set value constants (Group A) — categories whose
 * VALUES are baked into branching logic across the codebase.
 *
 * Style:
 *   - Identifier: PascalCase (`ResultStatus`) — TS type-like.
 *   - Members: UPPER_SNAKE_CASE (`SUCCESS`) — fixed-constant convention
 *     per `.claude/rules/naming-conventions.md`.
 *   - Pattern: `const … as const` + derived type alias of the same name
 *     (TS allows merging the value and type namespaces). Avoids `enum`
 *     because it (a) emits IIFE runtime code that fails on Node native
 *     TS, (b) creates a reverse-mapping that pollutes `Object.values()`,
 *     and (c) is increasingly discouraged by the TS community.
 *
 * Adding / removing a value here REQUIRES a code change + redeploy.
 * Renaming the customer-visible LABEL does NOT — labels live in the
 * `m_code` master table and are loaded by `CodeService`. A runtime
 * `m_code` admin edit only flips the displayed string; the integer
 * value reaching this constant stays the same.
 *
 * Categories that are NOT in this folder (Group B — GENDER, TANKA_TYPE,
 * YOKIN_SHUBETSU, TESURYO_KUBUN, …) intentionally have no constant:
 * the customer can extend them at runtime and the BE only validates
 * via `CodeService.has(category, value)`. Picking the right group when
 * adding a new category is part of the design review.
 *
 * Sync requirement:
 * Mirror this folder at `apps/frontend/src/constants/enums/`. The CI
 * test `enum-sync.spec.ts` parses both sides and fails if they drift.
 */
export { LogType } from './log-type.enum';
export { ResultStatus } from './result-status.enum';
export { LoginResult } from './login-result.enum';
export { OtpType } from './otp-type.enum';
export { OshiraseStatus } from './oshirase-status.enum';
export { OshiraseType } from './oshirase-type.enum';
export { PublishLocation } from './publish-location.enum';
export { RoleCode } from './role-code.enum';
export { DokusyaShubetsu } from './dokusya-shubetsu.enum';
export { ShiharaiHoho } from './shiharai-hoho.enum';
export { ItakuKubun } from './itaku-kubun.enum';

/**
 * FE mirror of `apps/backend/src/common/enums/index.ts`.
 *
 * Each file here must keep its values in lockstep with the matching
 * BE file at `apps/backend/src/common/enums/<name>.enum.ts`. The CI
 * test `apps/backend/test/integration/enum-sync.spec.ts` parses both
 * sides and fails if any value drifts.
 *
 * Style: PascalCase identifier + UPPER_SNAKE_CASE members + `as const`.
 *
 * Display labels (内税 / 外税 / 成功 / 失敗 / …) intentionally do NOT
 * live here — they come from `useCodesStore().label('<CATEGORY>', value)`
 * which reads the editable `m_code` master cache.
 */
export { LogType } from './log-type';
export { ResultStatus } from './result-status';
export { LoginResult } from './login-result';
export { OtpType } from './otp-type';
export { OshiraseStatus } from './oshirase-status';
export { OshiraseType } from './oshirase-type';
export { PublishLocation } from './publish-location';
export { RoleCode } from './role-code';
export { DokusyaShubetsu } from './dokusya-shubetsu';
export { ShiharaiHoho } from './shiharai-hoho';
export { ItakuKubun } from './itaku-kubun';

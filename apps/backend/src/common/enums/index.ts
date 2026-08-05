/**
 * 固定値定数 (Group A) の barrel — VALUE が codebase の分岐ロジックに焼き込まれた
 * カテゴリ。
 *
 * Style: Identifier=PascalCase、Members=UPPER_SNAKE_CASE
 * (`.claude/rules/naming-conventions.md`)。`const … as const` + 同名の派生型。
 * `enum` を避ける理由: (a) IIFE を emit し Node native TS で fail、
 * (b) reverse-mapping が `Object.values()` を汚染、(c) TS コミュニティで非推奨。
 *
 * 値の追加/削除は code 変更 + redeploy が必要。顧客可視 LABEL の rename は不要
 * — label は `m_code` master にあり `CodeService` が load。runtime の m_code
 * 編集は表示文字列を変えるだけで、整数値は不変。
 *
 * この folder に無いカテゴリ (Group B — GENDER, TANKA_TYPE, YOKIN_SHUBETSU,
 * TESURYO_KUBUN, …) は意図的に定数なし: runtime 拡張可で BE は
 * `CodeService.has(category, value)` で検証のみ。group 選択は設計 review の一部。
 *
 * Sync: `apps/frontend/src/constants/enums/` に mirror。CI の
 * `enum-sync.spec.ts` が両側を parse し drift 時 fail。
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
export { TetsuzukiShurui } from './tetsuzuki-shurui.enum';
export { DokusyasoBunrui } from './dokusyaso-bunrui.enum';
export { NogyosyaBunrui } from './nogyosya-bunrui.enum';
// BE-only (no FE mirror — FE doesn't branch on the value; see file header).
export { DenshiShoninStatus } from './denshi-shonin-status.enum';
export { DownloadType } from './download-type.enum';
export { AuditOperation } from './audit-operation.enum';

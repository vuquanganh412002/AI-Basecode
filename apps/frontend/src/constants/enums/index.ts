/**
 * `apps/backend/src/common/enums/index.ts` の FE ミラー。
 *
 * ここの各ファイルは対応する BE ファイル `apps/backend/src/common/enums/<name>.enum.ts` と
 * 値を完全一致させること。CI テスト `apps/backend/test/integration/enum-sync.spec.ts` が
 * 両側をパースし、値がずれると失敗する。
 *
 * スタイル: PascalCase 識別子 + UPPER_SNAKE_CASE メンバー + `as const`。
 *
 * 表示ラベル（内税 / 外税 / 成功 / 失敗 / …）は意図的にここに置かない —
 * 編集可能な `m_code` マスタキャッシュを読む `useCodesStore().label('<CATEGORY>', value)` から取得する。
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
export { TetsuzukiShurui } from './tetsuzuki-shurui';
export { DokusyasoBunrui } from './dokusyaso-bunrui';
export { NogyosyaBunrui } from './nogyosya-bunrui';
export { DenshiShoninStatus } from './denshi-shonin-status';

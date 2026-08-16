/**
 * お知らせ一覧の最大表示件数（ログイン画面バナー・メニュー画面）。
 * `oshirase.service.ts`（findLogin/getMenuList）と
 * `dto/login-oshirase-query.dto.ts` の @Max で共有 — 別々に変更すると
 * DTO が許可する上限とサービスが実際に返す件数が食い違う。
 */
export const MAX_OSHIRASE_LIST_LIMIT = 20;

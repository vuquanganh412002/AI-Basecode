/**
 * エンティティ dropdown / select コンポーネント共通のページサイズ。
 *
 * `DROPDOWN_PAGE_SIZE` は dropdown が 1 リクエストで取得する既定ページサイズ。
 * `DROPDOWN_MAX_PAGE_SIZE` は「全件読込」で使う BE dropdown DTO の `@Max(100)` 上限のミラー。
 * 各 Base*Dropdown の既定にリテラルを繰り返さず 1 箇所で定義するため集約。
 */
/** エンティティ dropdown/select コンポーネントの既定ページサイズ。 */
export const DROPDOWN_PAGE_SIZE = 50;
/** BE dropdown DTO `@Max(100)` — dropdown 取得で要求できる最大 per_page。 */
export const DROPDOWN_MAX_PAGE_SIZE = 100;

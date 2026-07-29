/**
 * TANKA_TYPE (単価種類) values — `m_code.code_category='TANKA_TYPE'`, Group B.
 * NO Group-A enum on purpose (customer-extensible; BE validates via
 * `CodeService.has`). Readability aid only, replacing bare `1`/`2` at sites
 * that branch on 購読料/配達手数料 (m_tanka join/filter — 口座振替・配達手数料・
 * 購読者検索の単価解決). NOT a validation allow-list — don't gate input with these.
 */
/** 購読料 (subscription fee) */
export const TANKA_TYPE_KODOKU = 1;
/** 配達手数料 (delivery fee) */
export const TANKA_TYPE_HAITATSURYO = 2;

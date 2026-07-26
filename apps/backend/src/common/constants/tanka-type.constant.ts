/**
 * TANKA_TYPE (単価種類) values — `m_code.code_category='TANKA_TYPE'`, Group B.
 *
 * TANKA_TYPE has NO Group-A enum on purpose (customer-extensible at runtime;
 * the BE validates membership via `CodeService.has`). These named constants
 * exist ONLY to replace the bare `1`/`2` literals at the sites that branch on
 * 購読料/配達手数料 when joining/filtering m_tanka (口座振替・配達手数料・購読者検索
 * の単価解決). They are a readability aid for branching, NOT a validation
 * allow-list — do not use them to gate acceptable input.
 */
/** 購読料 (subscription fee) */
export const TANKA_TYPE_KODOKU = 1;
/** 配達手数料 (delivery fee) */
export const TANKA_TYPE_HAITATSURYO = 2;

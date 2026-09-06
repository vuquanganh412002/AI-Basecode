/**
 * YUBIN_KUBUN (郵便区分) values — `m_code.code_category='YUBIN_KUBUN'`, Group B.
 * NO Group-A enum on purpose (customer-extensible; BE validates via
 * `CodeService.has`). Readability aid only, replacing the bare `'0'` default at
 * sites that create 購読者 without an explicit 郵便区分 (Excel取込・電子版同期)。
 * NOT a validation allow-list — don't gate input with these.
 *
 * ※ `t_dokusya.yubin_kubun` は VARCHAR — 値は数値ではなく文字列。
 */
/** 配達（郵送なし・既定値。m_code.code_name は顧客CR 2026-08-24 で「空」→「配達」に改称） */
export const YUBIN_KUBUN_NASHI = '0';
/** 郵送 */
export const YUBIN_KUBUN_YUSO = '1';

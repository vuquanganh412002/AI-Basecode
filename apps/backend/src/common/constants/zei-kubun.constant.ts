/**
 * ZEI_KUBUN (税区分) values — `m_code.code_category='ZEI_KUBUN'`, Group B.
 * NO Group-A enum on purpose (customer-extensible; BE validates via
 * `CodeService.has`). Readability aid only, replacing bare `1`/`2` at sites
 * that branch on 内税/外税 for tax-inclusive vs -exclusive amounts
 * (単価ドロップダウンの表示金額、配達手数料の税計算の既定値). NOT a validation
 * allow-list — don't gate input with these.
 */
/** 内税 (tax-inclusive) */
export const ZEI_KUBUN_UCHIZEI = 1;
/** 外税 (tax-exclusive) */
export const ZEI_KUBUN_SOTOZEI = 2;

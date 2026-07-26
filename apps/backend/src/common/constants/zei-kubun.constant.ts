/**
 * ZEI_KUBUN (税区分) values — `m_code.code_category='ZEI_KUBUN'`, Group B.
 *
 * ZEI_KUBUN has NO Group-A enum on purpose (it is customer-extensible at
 * runtime; the BE validates membership via `CodeService.has`). These two
 * named constants exist ONLY to replace the bare `1`/`2` literals at the
 * few sites that branch on 内税/外税 to pick a tax-inclusive vs tax-exclusive
 * amount (単価ドロップダウンの表示金額、配達手数料の税計算の既定値). They are a
 * readability aid for branching, NOT a validation allow-list — do not use
 * them to gate acceptable input.
 */
/** 内税 (tax-inclusive) */
export const ZEI_KUBUN_UCHIZEI = 1;
/** 外税 (tax-exclusive) */
export const ZEI_KUBUN_SOTOZEI = 2;

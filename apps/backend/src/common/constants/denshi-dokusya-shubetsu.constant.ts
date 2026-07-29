/**
 * DENSHI_DOKUSYA_SHUBETSU (電子版購読者種別) values —
 * `m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'`, Group B.
 * NO Group-A enum on purpose (customer-extensible; BE validates via
 * `CodeService.has`). Readability aid only, replacing bare `0`/`1` at the
 * 電子版同期の member_type 変換。NOT a validation allow-list — don't gate input
 * with these.
 */
/** 無料 */
export const DENSHI_DOKUSYA_SHUBETSU_MURYO = 0;
/** 有料 */
export const DENSHI_DOKUSYA_SHUBETSU_YURYO = 1;

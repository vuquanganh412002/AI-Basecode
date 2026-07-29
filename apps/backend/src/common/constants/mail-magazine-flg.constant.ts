/**
 * MAIL_MAGAZINE_FLG (メルマガ配信可否) values —
 * `m_code.code_category='MAIL_MAGAZINE_FLG'`, Group B.
 * NO Group-A enum on purpose (customer-extensible; BE validates via
 * `CodeService.has`). Readability aid only, replacing bare `0`/`1` at the
 * 電子版連携の melmaga 変換 と Excel取込の既定値。NOT a validation allow-list —
 * don't gate input with these.
 */
/** 配信しない（未設定のフォールバック値） */
export const MAIL_MAGAZINE_FLG_OFF = 0;
/** 配信する */
export const MAIL_MAGAZINE_FLG_ON = 1;

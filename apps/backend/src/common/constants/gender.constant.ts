/**
 * GENDER (性別) values — `m_code.code_category='GENDER'`, Group B.
 * NO Group-A enum on purpose (customer-extensible; BE validates via
 * `CodeService.has`). Readability aid only, replacing bare `1`/`2`/`9` at sites
 * that branch on 男性/女性 — 電子版連携の双方向変換 (pull: sex→gender /
 * push: gender→sex)。NOT a validation allow-list — don't gate input with these.
 */
/** 男性 */
export const GENDER_MALE = 1;
/** 女性 */
export const GENDER_FEMALE = 2;
/** 回答しない（未設定のフォールバック値） */
export const GENDER_UNANSWERED = 9;

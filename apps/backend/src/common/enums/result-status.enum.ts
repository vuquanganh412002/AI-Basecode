/**
 * Outcome stored in `t_log.result_status` (and similar columns).
 *
 * Mirror of `m_code.code_category = 'RESULT_STATUS'`. Display label is
 * editable at runtime via `m_code`; the integer values below are fixed
 * because BE has branching logic on them.
 *
 * Keep in sync with `apps/frontend/src/constants/enums/result-status.ts`.
 */
export const ResultStatus = {
  SUCCESS: 1,
  FAILURE: 2,
  WARNING: 3,
} as const;
export type ResultStatus = (typeof ResultStatus)[keyof typeof ResultStatus];

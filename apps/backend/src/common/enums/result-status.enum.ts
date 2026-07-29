/**
 * 処理結果。`t_log.result_status` 等。
 * Mirror of `m_code.code_category = 'RESULT_STATUS'`。label は `m_code` で
 * runtime 編集可、値は BE 分岐ロジックのため固定。
 *
 * `apps/frontend/src/constants/enums/result-status.ts` と同期。
 */
export const ResultStatus = {
  SUCCESS: 1,
  FAILURE: 2,
  WARNING: 3,
} as const;
export type ResultStatus = (typeof ResultStatus)[keyof typeof ResultStatus];

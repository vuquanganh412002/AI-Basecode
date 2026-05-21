import { HttpException, HttpStatus } from '@nestjs/common';
import type { CodeService } from '@/modules/code/code.service';

export interface MCodeCheck {
  /** snake_case DTO field name surfaced back to the FE via errors[].field. */
  field: string;
  /** The value from the DTO. `undefined` is skipped (UPDATE partial case). */
  value: unknown;
  /** `m_code.code_category` (e.g. `'ZEI_KUBUN'`, `'TANKA_TYPE'`). */
  category: string;
  /** Japanese label used in the error message (`${label}の値が不正です。`). */
  label: string;
}

/**
 * Runtime-validate each m_code-referenced field against the cached
 * `CodeService`. Skips fields whose value is `undefined` so the same
 * call works for both CREATE (full payload) and UPDATE (partial).
 *
 * Throws ONE `VALIDATION_ERROR` with `errors[]` aggregating every bad
 * field — same shape as `ValidationPipe` produces for DTO failures, so
 * the FE `useApiForm` composable maps both paths uniformly to
 * `<a-form-item :help>` field-level errors.
 *
 * Why this lives outside the DTO: `class-validator` decorators run
 * before Nest DI is wired, so they can't inject `CodeService`. And
 * the allow-list is runtime-editable (customer can add `m_code` rows
 * without redeploy) — hardcoded `@IsIn([1, 2])` would lock the set.
 *
 * Usage:
 * ```ts
 * assertMCodeValues(this.codeService, [
 *   { field: 'tanka_type', value: dto.tanka_type, category: 'TANKA_TYPE', label: '単価種別' },
 *   { field: 'zei_kubun',  value: dto.zei_kubun,  category: 'ZEI_KUBUN',  label: '税区分'   },
 * ]);
 * ```
 */
export function assertMCodeValues(
  codeService: CodeService,
  checks: MCodeCheck[],
): void {
  const errors: { field: string; message: string }[] = [];
  for (const c of checks) {
    if (c.value === undefined || c.value === null) continue;
    if (typeof c.value !== 'string' && typeof c.value !== 'number') continue;
    if (!codeService.has(c.category, c.value)) {
      errors.push({ field: c.field, message: `${c.label}の値が不正です。` });
    }
  }
  if (errors.length === 0) return;
  throw new HttpException(
    {
      code: 'VALIDATION_ERROR',
      error_code: 'VALIDATION_ERROR',
      message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
      errors,
    },
    HttpStatus.BAD_REQUEST,
  );
}

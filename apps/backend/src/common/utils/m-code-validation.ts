import type { CodeService } from '@/modules/code/code.service';
import { ValidationException } from '@/common/exceptions/common.exceptions';

/**
 * Mirror of `CodeService.normalizeValue`: integer-shaped strings ("0",
 * "1", "12") become numbers; everything else stays a string. Kept
 * in-file rather than imported from CodeService so the helper doesn't
 * grow a runtime dependency on a class instance — `assertMCodeValues`
 * unit tests mock `CodeService` as `{ has, getLabel, reload }` only.
 */
function normalizeForCache(value: number | string): number | string {
  if (typeof value === 'number') return value;
  const asNumber = Number(value);
  return Number.isInteger(asNumber) && String(asNumber) === value
    ? asNumber
    : value;
}

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
    // Cache 側は `CodeService.normalizeValue` で数値化済 (e.g.
    // YUBIN_KUBUN={0,1}). 呼び出し側は DTO の string バインドのまま
    // 来ることがある (yubin_kubun: '0') ため, 比較前に同じ正規化を
    // 通して cache 値と型を一致させる。ロジックを CodeService に
    // 依存させずインラインで持っているのは, 単体テストが CodeService
    // を `{ has, getLabel, reload }` だけでモックしているため
    // (normalize メソッドを生やすと既存 spec が壊れる)。
    const normalized = normalizeForCache(c.value);
    if (!codeService.has(c.category, normalized)) {
      errors.push({ field: c.field, message: `${c.label}の値が不正です。` });
    }
  }
  if (errors.length === 0) return;
  // プロジェクト標準の例外を使用（common.exceptions）。body 形状は従来の
  // 手組み HttpException と同一（{ error_code, message, errors }）で、
  // ValidationPipe ファクトリ + 他サービスの assertMCodeValues と揃う。
  throw new ValidationException(errors);
}

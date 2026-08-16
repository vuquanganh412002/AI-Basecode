import type { CodeService } from '@/modules/code/code.service';
import { ValidationException } from '@/common/exceptions/common.exceptions';

/**
 * `CodeService.normalizeValue` の写し: 整数形の文字列は数値化、他は文字列のまま。
 * ランタイム依存を避けインライン保持（単体テストは CodeService を
 * `{ has, getLabel, reload }` のみモックするため）。エクスポートするのは
 * 依存ゼロの `DokusyaImportValidator`（事前ロード Set と突き合わせる方式）が
 * 同じ正規化ロジックを必要とするため — ロジックを2箇所に複製しない。
 */
export function normalizeForCache(value: number | string): number | string {
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
 * m_code 参照フィールドをキャッシュ済 `CodeService` で実行時検証。undefined は
 * スキップ（1 呼び出しで CREATE 全件 / UPDATE 部分の両対応）。不正フィールドを
 * errors[] に集約し ONE `VALIDATION_ERROR` を throw（ValidationPipe と同形状 →
 * FE useApiForm が両経路を `<a-form-item :help>` に統一マップ）。
 *
 * DTO 外に置く理由: class-validator デコレータは Nest DI 前に走り CodeService を
 * inject 不可。かつ allow-list は実行時編集可（顧客が m_code 行を無再デプロイで追加）で
 * ハードコード `@IsIn([1,2])` だと固定化してしまう。
 *
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
    // Cache は normalizeValue で数値化済 (e.g. YUBIN_KUBUN={0,1}) だが
    // 呼び出し側は DTO string バインドのまま来る (yubin_kubun: '0') ため
    // 比較前に同じ正規化で型を揃える。CodeService 非依存でインライン保持なのは
    // 単体テストが `{ has, getLabel, reload }` だけモックするため。
    const normalized = normalizeForCache(c.value);
    if (!codeService.has(c.category, normalized)) {
      errors.push({ field: c.field, message: `${c.label}の値が不正です。` });
    }
  }
  if (errors.length === 0) return;
  // 標準例外 (common.exceptions)。body 形状 { error_code, message, errors } は
  // ValidationPipe ファクトリ + 他サービスの assertMCodeValues と揃う。
  throw new ValidationException(errors);
}

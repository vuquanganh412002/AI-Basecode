/**
 * フィールドレベル制限ヘルパー — .claude/rules/security.md Layer 3。各モジュールが
 * リソース固有の `FIELD_RESTRICTIONS`（role × 許可フィールド）テーブルを宣言し、
 * このフィルタを共有する。
 *
 * ```ts
 * const FIELD_RESTRICTIONS: FieldRestrictionTable = {
 *   ja: { NICHINO_ADMIN: ['*'], CHUOKAI: ['yubin_no', 'address', ...] },
 * };
 * filterAllowedFields(dto, 'ja', session.role_code, FIELD_RESTRICTIONS);
 * ```
 *
 * 戻り値: role が未掲載（更新権限なし）なら `{}`、許可リストが `['*']`（ワイルド
 * カード）なら `{ ...dto }`、それ以外は許可キーのみ。
 */
export type FieldRestrictionTable = Record<string, Record<string, string[]>>;

export function filterAllowedFields<T extends Record<string, unknown>>(
  dto: T,
  model: string,
  roleCode: string,
  table: FieldRestrictionTable,
): Partial<T> {
  const allowed = table[model]?.[roleCode];
  if (!allowed) return {};
  if (allowed.includes('*')) return { ...dto };
  return Object.fromEntries(
    Object.entries(dto).filter(([key]) => allowed.includes(key)),
  ) as Partial<T>;
}

/**
 * Generic helper for the field-level restriction pattern described in
 * `.claude/rules/security.md` Layer 3. Each module declares its own
 * `FIELD_RESTRICTIONS` table (because the columns are resource-specific)
 * but every module uses this same filter implementation.
 *
 * Example:
 * ```ts
 * const FIELD_RESTRICTIONS: FieldRestrictionTable = {
 *   ja: {
 *     NICHINO_ADMIN: ['*'],
 *     CHUOKAI: ['yubin_no', 'address', 'tel', ...],
 *     JA_HONTEN: ['yubin_no', 'address', 'tel', ...],
 *   },
 * };
 *
 * const filtered = filterAllowedFields(dto, 'ja', session.role_code, FIELD_RESTRICTIONS);
 * ```
 *
 * Returns:
 *   - `{}` when the role isn't listed (= no permission to update anything)
 *   - `{ ...dto }` (shallow copy) when the role's allow-list is `['*']`
 *   - A new object containing only the keys present in the allow-list
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

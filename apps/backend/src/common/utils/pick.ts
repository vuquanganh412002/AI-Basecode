/**
 * Type-safe value extractors for the "loose object" pattern used after
 * `filterAllowedFields()` returns a `Record<string, unknown>` of fields
 * the caller is allowed to update.
 *
 * Usage in an UPDATE service method:
 * ```ts
 * const filtered = filterAllowedFields(dto, 'ja', session.role_code);
 * const next = manager.create(Ja, {
 *   ...before,
 *   jaName:    pickString(filtered, 'ja_name',    before.jaName),
 *   chuokaiFlg: pickBool(filtered, 'chuokai_flg', before.chuokaiFlg),
 *   zeiKubun:  pickNumber(filtered, 'zei_kubun',  before.zeiKubun),
 * });
 * ```
 *
 * Why per-field pickers instead of a bulk merge: snake_case DTO keys
 * → camelCase entity fields require a per-field mapping anyway. The
 * pickers narrow `unknown` to the expected primitive type and silently
 * fall back when a key is absent (role couldn't edit it) or holds the
 * wrong type (malformed payload).
 */
export function pickString(
  obj: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  // 1. Key explicitly present with a string value → use it (incl. empty
  //    string — empty means "FE wants to clear this NOT NULL column").
  // 2. Key explicitly present with `undefined` / `null` → also clear.
  //    Happens when the DTO had `@Transform(blankToUndef)` on a regex-
  //    validated optional field: the FE posted `""`, the transform
  //    flipped it to `undefined` so `@Matches(...)` doesn't fire, but
  //    the property still exists on the instance with value `undefined`.
  //    Distinguishing "key present but undefined" from "key truly
  //    absent" is the only way to honour the FE's clear-intent.
  // 3. Key truly absent (e.g. role-restricted field dropped by
  //    filterAllowedFields, or PATCH-style partial body) → keep the
  //    existing entity value.
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    const v = obj[key];
    if (typeof v === 'string') return v;
    if (v === undefined || v === null) return '';
  }
  return fallback;
}

export function pickBool(
  obj: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  return typeof obj[key] === 'boolean' ? obj[key] : fallback;
}

export function pickNumber(
  obj: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  return typeof obj[key] === 'number' ? obj[key] : fallback;
}

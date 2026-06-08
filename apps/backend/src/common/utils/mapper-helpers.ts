/**
 * Shared value normalisers for response-DTO mappers. Every CRUD module's
 * mapper used to declare its own `toIso` + `toNumber` (4 copies between
 * account-form / accounts / hanbaiten-form mappers + file-upload service);
 * Sonar counted those declarations as duplicate blocks. Centralised here.
 *
 * Behavior matches the (safer) hanbaiten-form variant: `toNumber` returns
 * `null` when the input parses as NaN, not the raw `NaN`. The account
 * mappers' previous variant produced `NaN` on bad input which would then
 * serialize as `null` in JSON anyway, so the unification is observably
 * identical for production callers.
 */

/**
 * Normalise a TIMESTAMPTZ value (TypeORM round-trips `Date` in production,
 * `string` under pg-mem in tests) to an ISO 8601 string. Preserves
 * `null` / `undefined` as `null` so callers don't need to guard.
 */
export function toIso(v: Date | string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/**
 * Normalise a BIGINT-as-string (TypeORM's BIGINT round-trip default) to
 * a JS `number`. Preserves `null` / `undefined` as `null`. Returns
 * `null` for non-numeric strings rather than `NaN`.
 */
export function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

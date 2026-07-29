/**
 * レスポンス DTO マッパー用の共通値正規化。Sonar が指摘した4つの重複
 * `toIso`/`toNumber`（account-form / accounts / hanbaiten-form マッパー +
 * file-upload サービス）を集約。
 *
 * より安全な hanbaiten-form 版に合わせ、`toNumber` は NaN 時に生の `NaN` でなく
 * `null` を返す — `NaN` は JSON で `null` にシリアライズされるため観測上は同一。
 */

/**
 * TIMESTAMPTZ（本番は Date、pg-mem では string）→ ISO 8601 文字列。
 * `null` / `undefined` は `null` のまま保持。
 */
export function toIso(v: Date | string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/**
 * BIGINT 文字列（TypeORM 既定）→ JS `number`。`null` / `undefined` は `null` の
 * まま保持。非数値文字列は `NaN` でなく `null` にする。
 */
export function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

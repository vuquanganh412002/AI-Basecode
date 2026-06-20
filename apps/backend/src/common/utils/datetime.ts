/**
 * Centralised JST (Asia/Tokyo) date/time helpers for the backend.
 *
 * The system is JST-only operationally (`.claude/rules/nestjs.md §Timestamp
 * policy`). Every "what is now / today" computation, every download-filename
 * timestamp, and every date-only column serialization MUST go through this
 * module so behaviour is identical regardless of the host/container TZ.
 *
 * Why `Intl.DateTimeFormat(..., { timeZone: 'Asia/Tokyo' })` and not
 * `new Date().getHours()` / `toISOString().slice(0, 10)`:
 *   - `getHours()` etc. depend on the process TZ; correct only while the
 *     container runs `TZ=Asia/Tokyo`, wrong on a dev machine in another TZ.
 *   - `toISOString()` always emits UTC, so `.slice(0, 10)` is the UTC date —
 *     between 00:00–09:00 JST it is yesterday (off-by-one).
 * Pinning the timeZone makes all of these TZ-independent. Mirrors the FE
 * helpers at `apps/frontend/src/utils/datetime.ts`.
 *
 * These helpers replaced per-service private copies (`jstTimestamp` /
 * `timestampForFilename` / `formatDatetime` / `nowJstDate` …) that had
 * drifted apart (e.g. one filename stamp omitted the `_` separator).
 */

/** Asia/Tokyo wall-clock parts of `date` as a `{ year, month, day, hour, minute, second }` map (all 2-digit except 4-digit year). */
function jstParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const out: Record<string, string> = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

/**
 * 本日 (Asia/Tokyo) を `YYYY-MM-DD` で返す。「当日以降か」を判定する日付ガード
 * （情報変更適用日・公開日 など）は全てこれを経由すること。FE の
 * `todayIsoTokyo()` と同一セマンティクス。
 *
 * @example
 * // 2026-06-15 06:00 JST (= 2026-06-14T21:00Z) でも '2026-06-15' を返す。
 * todayIsoJst(); // '2026-06-15'
 */
export function todayIsoJst(): string {
  const p = jstParts(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * DATE 列（または日時値）を Asia/Tokyo の `YYYY-MM-DD` で返す。空/無効は `''`
 * （文字列入力ならそのまま）。`(d as Date).toISOString().slice(0, 10)` は UTC
 * 日付になり JST 早朝に1日ずれるため、その代替として使う。
 */
export function dateOnlyIsoJst(
  value: Date | string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '';
  const p = jstParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * ダウンロードファイル名用のタイムスタンプ `YYYYMMDD_HHmmss`（Asia/Tokyo）。
 * 既定は現在時刻。全出力サービス共通フォーマット（旧 `jstTimestamp` /
 * `timestampForFilename`）。
 */
export function timestampForFilenameJst(date: Date = new Date()): string {
  const p = jstParts(date);
  return `${p.year}${p.month}${p.day}_${p.hour}${p.minute}${p.second}`;
}

/**
 * 区切りなしのタイムスタンプ `yyyyMMddHHmmss`（14桁・Asia/Tokyo）。
 * 顧客指定フォーマットのファイル名用（例: 一括ダウンロード_20260619153000.zip）。
 * 区切りあり版は {@link timestampForFilenameJst}（`YYYYMMDD_HHmmss`）。
 *
 * @example
 * // 2026-06-19 15:30:00 JST → '20260619153000'
 * compactTimestampJst();
 */
export function compactTimestampJst(date: Date = new Date()): string {
  const p = jstParts(date);
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`;
}

/**
 * 日時値を Asia/Tokyo の `YYYY/MM/DD HH:mm:ss` で返す（表示・CSV 用）。無効値は
 * `''`。旧 log.service `formatDatetime` の共通版。
 */
export function formatDateTimeJst(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = jstParts(d);
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** 現在日 (Asia/Tokyo) を `YYYY/MM/DD` で返す（帳票の出力日など）。 */
export function nowDateJst(): string {
  const p = jstParts(new Date());
  return `${p.year}/${p.month}/${p.day}`;
}

/** 現在時刻 (Asia/Tokyo) を `HH:mm:ss` で返す（帳票の出力時間など）。 */
export function nowTimeJst(): string {
  const p = jstParts(new Date());
  return `${p.hour}:${p.minute}:${p.second}`;
}

/**
 * 日時値を Asia/Tokyo の `YYYY/MM/DD HH:mm`（分まで）で返す。無効値は `''`。
 * お知らせの公開開始/終了日時の表示などに使う（旧 oshirase
 * `formatJstDateTimeMinutes`）。
 */
export function formatDateTimeMinutesJst(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = jstParts(d);
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

/**
 * `YYYY/MM/DD HH:mm` をプロセス TZ の壁時計として Date に変換する。不正形式は
 * null、秒は 0。本番コンテナは `TZ=Asia/Tokyo` 固定（`.claude/rules/nestjs.md
 * §Timestamp policy` / Dockerfile）なので JST として解釈される。旧 oshirase
 * `parseJstDateTimeMinutes` と同一セマンティクス（このモジュールで唯一 TZ に
 * 依存する関数 — フォーマッタ群は Intl で TZ 非依存）。
 */
export function parseDatetimeMinutesJst(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0);
}

/**
 * `YYYY/MM/DD HH:mm:ss`（秒まで）をプロセス TZ の壁時計として Date に変換する。
 * 不正形式は null。`parseDatetimeMinutesJst` の秒あり版（ログ検索の範囲指定
 * 用）。本番コンテナは TZ=Asia/Tokyo 固定なので JST として解釈される。
 */
export function parseDatetimeJst(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(se),
  );
}

/** `YYYY-MM-DD` → `YYYY/MM/DD`（純粋な文字列変換、空はそのまま）。TZ 非依存。 */
export function isoDateToSlash(d: string): string {
  return d ? d.replaceAll('-', '/') : '';
}

/** `YYYY/MM/DD` → `YYYY-MM-DD`（`isoDateToSlash` の逆、空はそのまま）。TZ 非依存。 */
export function slashDateToIso(d: string): string {
  return d ? d.replaceAll('/', '-') : '';
}

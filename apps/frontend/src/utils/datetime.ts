/**
 * Tokyo-pinned datetime helpers — every form that validates dates against
 * "now", parses a `YYYY/MM/DD HH:mm` string the user typed, or compares
 * two pickerd Dayjs values MUST go through this file. The system is JST-
 * only operationally (`.claude/rules/nestjs.md §Timestamp policy`), so we
 * pin every "what is now" / "what is today" calculation to Asia/Tokyo
 * regardless of the developer or admin's browser timezone.
 *
 * Why a dedicated file:
 * - `dayjs()` (no args) reads the browser's local TZ — a developer in
 *   Vietnam (UTC+7) would see different validation pass/fail than an
 *   admin in Japan (UTC+9). That's a 2-hour drift on past-date checks.
 * - `new Date(y, mo-1, d, h, mi)` constructor is hard-wired to the
 *   browser's local TZ — `parseDatetime("2026/05/28 14:00")` in Vietnam
 *   yields 14:00 VN (= 16:00 Tokyo), not the 14:00 Tokyo the user
 *   intended.
 * - The fix is uniform: every "now" / "today" / parse helper goes
 *   through `dayjs.tz(..., 'Asia/Tokyo')`. We expose just enough
 *   ergonomic helpers that callers never reach for raw `dayjs()` or
 *   `new Date(y, mo-1, ...)` again.
 *
 * Display-only formatting (e.g. `formatDate`, `formatDateTime` rendered
 * from an ISO string returned by the BE) lives in `formatters.ts` and
 * already uses `dayjs.tz.setDefault('Asia/Tokyo')`. This file covers
 * the harder case: arithmetic + comparisons + parsing user input back
 * into a JS Date.
 *
 * Plugin extension: `formatters.ts` imports + `dayjs.extend(utc)` +
 * `dayjs.extend(timezone)` at module load. We re-import the plugins
 * here too so this module is usable in isolation (test files that
 * mock formatters, for example).
 */

import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const APP_TIMEZONE = 'Asia/Tokyo';

/**
 * 現在時刻（Asia/Tokyo）。`dayjs()` の差し替え用 — このファイル外で
 * 直接 `dayjs()` を呼ぶことは `.claude/rules/vue.md §Date/Time` で禁止。
 */
export function nowTokyo(): Dayjs {
  return dayjs().tz(APP_TIMEZONE);
}

/** 本日 00:00:00（Asia/Tokyo）。past-date 判定の境界に使う。 */
export function todayStartTokyo(): Dayjs {
  return nowTokyo().startOf('day');
}

/**
 * 現在分の頭（Asia/Tokyo, 秒以下切り捨て）。分精度の past-datetime
 * 判定（例: `publish_start_date >= now`）に使う。
 */
export function nowMinuteFloorTokyo(): Dayjs {
  return nowTokyo().startOf('minute');
}

/**
 * `YYYY/MM/DD HH:mm` 形式の文字列を Asia/Tokyo として解釈し、JS Date
 * を返す。失敗時 null。
 *
 * 「ユーザーが picker で 14:00 を選んだ」=「JST で 14:00」と解釈する
 * のがこの関数の契約。ブラウザの local TZ には依存しない。
 */
export function parseDatetimeTokyo(s: string | null | undefined): Date | null {
  if (!s) return null;
  if (!/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(s)) return null;
  const d = dayjs.tz(s, 'YYYY/MM/DD HH:mm', APP_TIMEZONE);
  return d.isValid() ? d.toDate() : null;
}

/**
 * Antd `<a-date-picker>` が返す Dayjs（ブラウザ local TZ）を、その壁時計
 * 数値（`.year()/.hour()` などが返す値）を Asia/Tokyo の壁時計として
 * 解釈した Tokyo-pinned Dayjs に変換する。
 *
 * 「ユーザーが picker で 14:00 を選んだ」=「JST で 14:00」と扱う本プロ
 * ジェクトの契約に従う。INSTANT を保持する `dayjs(d).tz('Asia/Tokyo')`
 * とは別物（あちらは絶対時刻を保ったまま再レンダリングするだけで、
 * 14:00 VN を 16:00 JST に変える）。
 *
 * picker の値を `nowTokyo()` と `isSame('day')` 比較する場面で使う。
 */
export function pickerToTokyoWallclock(d: Dayjs): Dayjs {
  return dayjs.tz(
    d.format('YYYY/MM/DD HH:mm:ss'),
    'YYYY/MM/DD HH:mm:ss',
    APP_TIMEZONE,
  );
}

/**
 * `YYYY/MM/DD HH:mm:ss` 形式（ログ検索画面など秒精度）を Asia/Tokyo として解釈。
 */
export function parseDatetimeWithSecondsTokyo(
  s: string | null | undefined,
): Date | null {
  if (!s) return null;
  if (!/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return null;
  const d = dayjs.tz(s, 'YYYY/MM/DD HH:mm:ss', APP_TIMEZONE);
  return d.isValid() ? d.toDate() : null;
}

/**
 * `YYYY-MM-DD` 形式（HTML5 date input / BE date column 形式）の今日。
 * tanka 適用開始日のように 日精度 で比較するときに使う。
 */
export function todayIsoTokyo(): string {
  return nowTokyo().format('YYYY-MM-DD');
}

/**
 * ファイルダウンロード名向けの timestamp 文字列（`YYYYMMDD_HHmmss`）。
 * ログ CSV エクスポートなどから呼ばれる。常に Asia/Tokyo。
 */
export function timestampForFilenameTokyo(): string {
  return nowTokyo().format('YYYYMMDD_HHmmss');
}

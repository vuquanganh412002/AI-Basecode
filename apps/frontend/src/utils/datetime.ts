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
 * a-date-picker の `:disabled-date` 用の共通判定。
 * 「本日 (Asia/Tokyo) より前の暦日」を無効化する（当日・未来日は選択可）。
 *
 * `current`（picker フレームの Dayjs）の**暦日**を `YYYY-MM-DD` 文字列に整形し、
 * `todayIsoTokyo()`（JST の今日）と文字列比較する。picker が表示・保存する暦日
 * （value-format=YYYY-MM-DD）とバリデーション（`<= todayIsoTokyo()`）が同じ基準に
 * 揃うため、ブラウザ TZ が JST より遅れていても picker と検証がズレない。
 * instant 比較（`current.isBefore(todayStartTokyo())`）は `current` がブラウザ
 * ローカル instant のため JST 深夜境界で 1 日ズレる（picker が JST 当日を選べて
 * しまう）ので使わない。
 *
 * 全ての過去日不可カレンダーはこの関数を経由すること。
 */
export function isPastDayTokyo(current: Dayjs | null): boolean {
  if (!current) return false;
  return current.format('YYYY-MM-DD') < todayIsoTokyo();
}

/**
 * a-date-picker の `:disabled-date` 用。「本日 (Asia/Tokyo) 以前の暦日」
 * （＝本日 + 過去日）を無効化する（翌日以降＝未来日のみ選択可）。
 *
 * 情報変更適用日(joho) / 新規登録の購読開始日 / 解約予定日 / 販売店適用日 など
 * 「未来日のみ許可（当日不可）」のカレンダーはこの関数を経由する。当日を許可する
 * 場合は {@link isPastDayTokyo} を使う。`current` の暦日を `todayIsoTokyo()`（JST の
 * 今日）と文字列比較する（picker 保存値・バリデーションと同一基準で TZ ズレしない）。
 */
export function isTodayOrPastDayTokyo(current: Dayjs | null): boolean {
  if (!current) return false;
  return current.format('YYYY-MM-DD') <= todayIsoTokyo();
}

/** 翌日 (Asia/Tokyo) の YYYY-MM-DD。「未来日のみ許可」フィールドの既定値に使う。 */
export function tomorrowIsoTokyo(): string {
  return todayStartTokyo().add(1, 'day').format('YYYY-MM-DD');
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
 * `YYYY-MM-DD` 形式（BE date column 形式）の翌月1日（Asia/Tokyo）。
 * 電子版・口座引落の購読開始日「翌月1日」選択時の保存値に使う。
 */
export function nextMonthFirstIsoTokyo(): string {
  return nowTokyo().add(1, 'month').startOf('month').format('YYYY-MM-DD');
}

/**
 * ファイルダウンロード名向けの timestamp 文字列（`YYYYMMDD_HHmmss`）。
 * ログ CSV エクスポートなどから呼ばれる。常に Asia/Tokyo。
 */
export function timestampForFilenameTokyo(): string {
  return nowTokyo().format('YYYYMMDD_HHmmss');
}

/**
 * Excel のシリアル日付値（1899-12-30 起点、1900 うるう年バグ込み）を
 * `YYYY-MM-DD` へ変換する。基準日 1899-12-30 を Asia/Tokyo として置き、
 * シリアル日数を加算して暦日を得る（システムは JST 運用 — 時刻系は全て
 * Asia/Tokyo に統一）。シリアルは整数日なので JST 加算でも暦日はずれない。
 */
export function excelSerialToIsoDate(serial: number): string {
  return dayjs
    .tz('1899-12-30', 'YYYY-MM-DD', APP_TIMEZONE)
    .add(Math.round(serial), 'day')
    .format('YYYY-MM-DD');
}

/**
 * Excel の日付セルは様々な形で届く（数値シリアル 46188 / 文字列シリアル
 * "46188" / "YYYY-MM-DD" / "YYYY/MM/DD" / "D/M/YY" 等）。すべて DB が受け取る
 * `YYYY-MM-DD` へ正規化する。判別不能な値はそのまま返し、BE 側で再検証させる。
 * 時刻系の集約方針（`.claude/rules/vue.md §Date/Time`）に従い datetime.ts に置く。
 */
export function normalizeImportDate(value: unknown): unknown {
  if (typeof value === 'number') return excelSerialToIsoDate(value);
  if (typeof value !== 'string') return value;
  const s = value.trim();
  if (s === '') return value;
  // 文字列シリアル（区切り無しの純粋な数字）。
  if (/^\d{4,6}$/.test(s)) return excelSerialToIsoDate(Number(s));
  // 既に YYYY-MM-DD / YYYY/MM/DD → ハイフン + ゼロ埋め。
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  // D/M/YY・D/M/YYYY（Excel "d/m/yy" 表示）。月>12 のときは M/D とみなし入替。
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) {
    let day = Number(m[1]);
    let mon = Number(m[2]);
    if (mon > 12 && day <= 12) [day, mon] = [mon, day];
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return s;
}

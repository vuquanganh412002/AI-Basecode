/**
 * Tokyo 固定の日時ヘルパ — 「now」との日付検証、ユーザー入力の `YYYY/MM/DD HH:mm`
 * パース、picker の Dayjs 同士の比較を行う全フォームは必ず本ファイルを経由すること。
 * システムは運用上 JST 専用（`.claude/rules/nestjs.md §Timestamp policy`）なので、
 * 開発者/管理者のブラウザ TZ に依らず「今」「今日」の計算をすべて Asia/Tokyo に固定する。
 *
 * 専用ファイルにする理由:
 * - `dayjs()`（引数なし）はブラウザのローカル TZ を読む — ベトナム（UTC+7）の開発者と
 *   日本（UTC+9）の管理者で検証の合否が変わる。過去日チェックで 2 時間ズレる。
 * - `new Date(y, mo-1, d, h, mi)` はブラウザのローカル TZ 固定 —
 *   ベトナムでの `parseDatetime("2026/05/28 14:00")` は 14:00 VN（= 16:00 Tokyo）になり、
 *   ユーザーが意図した 14:00 Tokyo にならない。
 * - 対策は統一: 「now」「today」「parse」の各ヘルパはすべて `dayjs.tz(..., 'Asia/Tokyo')` を通す。
 *   呼び出し側が生の `dayjs()` や `new Date(y, mo-1, ...)` に手を出さなくて済むだけのヘルパを提供する。
 *
 * 表示専用の整形（BE の ISO 文字列から描画する `formatDate` / `formatDateTime` 等）は
 * `formatters.ts` にあり、既に `dayjs.tz.setDefault('Asia/Tokyo')` を使う。本ファイルは
 * より難しいケース（演算 + 比較 + ユーザー入力の JS Date への再パース）を扱う。
 *
 * プラグイン拡張: `formatters.ts` がモジュール読込時に `dayjs.extend(utc)` +
 * `dayjs.extend(timezone)` を import する。本モジュール単体でも使えるよう（formatters を
 * モックするテストファイル等）、ここでもプラグインを再 import する。
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

/**
 * a-date-picker の `:disabled-date` 用。「本日 (Asia/Tokyo) より後の暦日」を無効化
 * する（本日 + 過去日のみ選択可）。
 *
 * ログ参照の検索終了日など「未来を指定しても結果が存在し得ない」条件に使う。
 * {@link isPastDayTokyo} と対の関係で、判定基準（JST の暦日を文字列比較）も同じ。
 */
export function isFutureDayTokyo(current: Dayjs | null): boolean {
  if (!current) return false;
  return current.format('YYYY-MM-DD') > todayIsoTokyo();
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
 * 絶対時刻（UTC instant の Date — `parseDatetimeTokyo` の戻り値など）を
 * Asia/Tokyo の暦日 `YYYY-MM-DD` に変換する。picker の暦日
 * （`pickerToTokyoWallclock(current).format('YYYY-MM-DD')`）と同じ基準
 * （JST の文字列）で比較するために使う — `current.isBefore(date, 'day')`
 * のような Date 直接比較は `current` がブラウザ local instant のため
 * ブラウザ TZ ≠ JST の環境で日付境界がズレる（vue.md §Date/Time）。
 */
export function dateToIsoDateTokyo(d: Date): string {
  return dayjs(d).tz(APP_TIMEZONE).format('YYYY-MM-DD');
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
 * `YYYY-MM-DD` 形式の当月末日（Asia/Tokyo）。帳票出力画面の「適用日」など
 * 複数画面で既定値に使う共通ヘルパ（顧客要件: 適用日の既定は当月末日）。
 * 例: 2026-07-10 (JST) → '2026-07-31'。
 */
export function endOfMonthIsoTokyo(): string {
  return nowTokyo().endOf('month').format('YYYY-MM-DD');
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

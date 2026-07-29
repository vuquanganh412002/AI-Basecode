/**
 * 表示フォーマッタ — locale/通貨/電話/日付 の描画を 1 ファイルに集約し、
 * 見た目の一貫性を保ち、顧客が別の慣習を求めても再調整しやすくする。
 *
 * 各フォーマッタは `null | undefined | ''` を防御的に扱い空文字を返すため、
 * 呼び出し側はガードなしに生の API 値を渡せる。
 */

import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { APP_TIMEZONE } from './datetime';

// JST 運用 — BE のタイムスタンプは TIMESTAMPTZ（UTC 保存）で `+09:00` オフセットの
// ISO で返る。FE は描画 tz を Asia/Tokyo に固定し、ブラウザのマシン時計に依らず
// 表示を一貫させる。.claude/rules/nestjs.md §Timestamp policy 参照。
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ja');
dayjs.tz.setDefault('Asia/Tokyo');

// 正は datetime.ts — 既存の `import { APP_TIMEZONE } from '@/utils/formatters'`
// 呼び出し側を動かし続けるためここで再エクスポート。
export { APP_TIMEZONE };

/* ─────────────────────────── currency ─────────────────────────────── */

/**
 * 日本円（カンマ桁区切り付き）。
 *   formatYen(3500)  -> "¥3,500"
 *   formatYen(0)     -> "¥0"
 *   formatYen(null)  -> ""
 */
export function formatYen(value: number | null | undefined): string {
  if (value == null) return '';
  return `¥${value.toLocaleString('ja-JP')}`;
}

/**
 * カンマ区切りの整数（通貨記号なし）。
 *   formatNumber(12345)  -> "12,345"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '';
  return value.toLocaleString('ja-JP');
}

/**
 * 税率をパーセント表示。BE は 10% を 10 のように保存。
 *   formatTaxRate(10)  -> "10%"
 */
export function formatTaxRate(value: number | null | undefined): string {
  if (value == null) return '';
  return `${value}%`;
}

/* ────────────────────────── date / time ───────────────────────────── */

/**
 * `YYYY/MM/DD` — 日本の業務 UI で標準の日付表示。
 * ISO 文字列 / Date / dayjs を受ける。
 *   formatDate('2026-04-25')  -> "2026/04/25"
 */
export function formatDate(
  value: string | Date | dayjs.Dayjs | null | undefined,
): string {
  if (!value) return '';
  return dayjs(value).tz(APP_TIMEZONE).format('YYYY/MM/DD');
}

/**
 * `YYYY/MM/DD HH:mm` — ログ一覧・監査証跡・最終更新日時向け。
 */
export function formatDateTime(
  value: string | Date | dayjs.Dayjs | null | undefined,
): string {
  if (!value) return '';
  return dayjs(value).tz(APP_TIMEZONE).format('YYYY/MM/DD HH:mm');
}

/**
 * `YYYY/MM` — 請求期間・月次帳票向け。
 */
export function formatYearMonth(
  value: string | Date | dayjs.Dayjs | null | undefined,
): string {
  if (!value) return '';
  return dayjs(value).tz(APP_TIMEZONE).format('YYYY/MM');
}

/**
 * 和暦風の日付表記 — `YYYY-MM-DD` → 「YYYY年M月D日」（月日はゼロ埋めなし）。
 * 帳票の見出し(増減連絡票 / 増減通知)で使用。パースできなければ入力をそのまま返す。
 *   formatJpDate('2026-07-05') -> "2026年7月5日"
 */
export function formatJpDate(iso: string | null | undefined): string {
  const [y, m, d] = (iso ?? '').split('-');
  if (!y || !m || !d) return iso ?? '';
  return `${y}年${Number(m)}月${Number(d)}日`;
}

/* ─────────────────────── 郵便番号 / 電話番号 ──────────────────────── */

/**
 * 郵便番号（ハイフン付き）— BE は 7 桁で保存、表示は `XXX-XXXX`。
 *   formatPostalCode('1234567') -> "123-4567"
 *   formatPostalCode('123-4567') -> "123-4567" (冪等)
 */
export function formatPostalCode(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 7) return value;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/**
 * 電話番号（ハイフン付き）— 日本の電話番号形式。一般的な 10 桁・11 桁を受け、
 * 一致しなければ入力をそのまま返す。
 *   formatPhone('0312345678')  -> "03-1234-5678"
 *   formatPhone('09012345678') -> "090-1234-5678"
 *   formatPhone('0312345678')  -> "03-1234-5678"
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    // 携帯 / IP 電話（090 / 080 / 070 / 050）
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    // 固定電話 — 市外局番の桁数は可変。既定は 2-4-4（東京 等）。
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

/* ─────────────────────── 管理支店コード ──────────────────────────── */

/**
 * 管理支店コードの標準形式 — 半角数字 3 グループをハイフンで区切る
 * （3-4-3 桁 = 例 "013-3300-001"）。顧客仕様は非数字を拒否
 * （以前は誤って英字を許容 — 2026-05-19 修正）。
 */
export const KANRI_SHITEN_CODE_REGEX = /^\d{3}-\d{4}-\d{3}$/;

/**
 * 生の 10 桁を入力したときハイフンを自動挿入する。
 * 既に `XXX-XXXX-XXX` 形なら変更せず返し、どちらの形にも合わなければ元の値を返す
 * （呼び出し側の `KANRI_SHITEN_CODE_REGEX` で不正判定させる）。
 *
 *   formatKanriShitenCode('0133300001') -> "013-3300-001"
 *   formatKanriShitenCode('013-3300-001') -> "013-3300-001"
 *   formatKanriShitenCode('abc1234567') -> "abc1234567"   (呼び出し側で検証)
 *   formatKanriShitenCode('short') -> "short"             (呼び出し側で検証)
 */
export function formatKanriShitenCode(value: string | null | undefined): string {
  if (value == null) return '';
  const trimmed = value.trim();
  if (KANRI_SHITEN_CODE_REGEX.test(trimmed)) return trimmed;
  if (/^\d{10}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 7)}-${trimmed.slice(7)}`;
  }
  return trimmed;
}

/* ─────────────────────────────── misc ─────────────────────────────── */

/**
 * N 文字で切り詰め、切った場合は "…" を付ける。狭いテーブル列の長い名前に便利。
 */
export function truncate(value: string | null | undefined, max = 20): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

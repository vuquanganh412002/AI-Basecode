/**
 * Display formatters — keep all locale/currency/phone/date rendering in
 * one file so the system stays visually consistent and is easy to retune
 * if a customer asks for a different convention later.
 *
 * Every formatter handles `null | undefined | ''` defensively (returns an
 * empty string) so callers can pass raw API values without guarding.
 */

import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// JST 運用 — every backend timestamp is TIMESTAMPTZ stored as UTC and
// returned as ISO with `+09:00` offset; the FE pins the rendering tz to
// Asia/Tokyo so display is consistent regardless of the browser's
// machine clock. See .claude/rules/nestjs.md §Timestamp policy.
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ja');
dayjs.tz.setDefault('Asia/Tokyo');

export const APP_TIMEZONE = 'Asia/Tokyo';

/* ─────────────────────────── currency ─────────────────────────────── */

/**
 * 日本円 with grouping commas.
 *   formatYen(3500)  -> "¥3,500"
 *   formatYen(0)     -> "¥0"
 *   formatYen(null)  -> ""
 */
export function formatYen(value: number | null | undefined): string {
  if (value == null) return '';
  return `¥${value.toLocaleString('ja-JP')}`;
}

/**
 * Plain integer with commas (no currency mark).
 *   formatNumber(12345)  -> "12,345"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '';
  return value.toLocaleString('ja-JP');
}

/**
 * Tax-rate as a percentage. Backend stores e.g. 10 for 10%.
 *   formatTaxRate(10)  -> "10%"
 */
export function formatTaxRate(value: number | null | undefined): string {
  if (value == null) return '';
  return `${value}%`;
}

/* ────────────────────────── date / time ───────────────────────────── */

/**
 * `YYYY/MM/DD` — the canonical date display in Japanese enterprise UIs.
 * Accepts ISO strings, Date objects, or dayjs.
 *   formatDate('2026-04-25')  -> "2026/04/25"
 */
export function formatDate(
  value: string | Date | dayjs.Dayjs | null | undefined,
): string {
  if (!value) return '';
  return dayjs(value).tz(APP_TIMEZONE).format('YYYY/MM/DD');
}

/**
 * `YYYY/MM/DD HH:mm` — for log lists, audit trails, last-updated fields.
 */
export function formatDateTime(
  value: string | Date | dayjs.Dayjs | null | undefined,
): string {
  if (!value) return '';
  return dayjs(value).tz(APP_TIMEZONE).format('YYYY/MM/DD HH:mm');
}

/**
 * `YYYY/MM` — for billing periods, monthly reports.
 */
export function formatYearMonth(
  value: string | Date | dayjs.Dayjs | null | undefined,
): string {
  if (!value) return '';
  return dayjs(value).tz(APP_TIMEZONE).format('YYYY/MM');
}

/* ─────────────────────── 郵便番号 / 電話番号 ──────────────────────── */

/**
 * 郵便番号 with hyphen — backend stores 7 digits, display is `XXX-XXXX`.
 *   formatPostalCode('1234567') -> "123-4567"
 *   formatPostalCode('123-4567') -> "123-4567" (idempotent)
 */
export function formatPostalCode(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 7) return value;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/**
 * 電話番号 with hyphens — Japanese phone format. Accepts the common 10-
 * and 11-digit variants. Returns the input untouched if it doesn't match.
 *   formatPhone('0312345678')  -> "03-1234-5678"
 *   formatPhone('09012345678') -> "090-1234-5678"
 *   formatPhone('0312345678')  -> "03-1234-5678"
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    // mobile / IP phone (090 / 080 / 070 / 050)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    // landline — area-code length varies; default to 2-4-4 (Tokyo etc.)
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

/* ─────────────────────────────── misc ─────────────────────────────── */

/**
 * Truncate to N chars and append "…" if cut. Useful for long names in
 * narrow table columns.
 */
export function truncate(value: string | null | undefined, max = 20): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

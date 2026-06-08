// Pure entity → response DTO mappers for the SCR-031 admin endpoints.
// No Nest DI, no repo, no service — importable from anywhere.
//
// [no-labels-policy] Authenticated endpoints must NOT serialize
// `*_label` fields per `.claude/rules/nestjs.md §Response serialization`.
// The FE resolves labels via `useCodesStore().label('CATEGORY', value)`
// from its in-memory m_code cache — that way customer-edited m_code
// labels flow into the UI on reload without an FE redeploy AND the API
// response stays a small, stable contract.

import type { Oshirase } from '@/database/entities/oshirase.entity';

export interface OshiraseListItem {
  oshirase_id: number;
  ja_id: number | null;
  // [ja-name-join] Resolved from m_ja via leftJoin in OshiraseService.getList.
  // null when ja_id is null (= 全JA向け) OR when the referenced JA was
  // hard-deleted. FE renders '全JA向け' for null in the table cell.
  ja_name: string | null;
  oshirase_type: number;
  publish_location: number;
  status: number;
  title: string;
  publish_start_date: string;
  publish_end_date: string | null;
  target_kanri_kubun: string;
  created_at: string;
  updated_at: string;
}

export interface OshiraseDetail extends OshiraseListItem {
  content: string;
}

export function toOshiraseListItem(
  o: Oshirase,
  jaName: string | null = null,
): OshiraseListItem {
  return {
    oshirase_id: Number(o.oshiraseId),
    ja_id: o.jaId === null ? null : Number(o.jaId),
    ja_name: jaName,
    oshirase_type: o.oshiraseType,
    publish_location: o.publishLocation,
    status: o.status,
    title: o.title,
    publish_start_date: formatJstDateTimeMinutes(o.publishStartDate),
    publish_end_date: o.publishEndDate ? formatJstDateTimeMinutes(o.publishEndDate) : null,
    target_kanri_kubun: o.targetKanriKubun ?? '',
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
  };
}

export function toOshiraseDetail(
  o: Oshirase,
  jaName: string | null = null,
): OshiraseDetail {
  return {
    ...toOshiraseListItem(o, jaName),
    content: o.content,
  };
}

/**
 * YYYY-MM-DD in Asia/Tokyo. Use this (not `toISOString().slice(0,10)`,
 * which is UTC and off-by-one for any instant before 09:00 JST) whenever
 * a TIMESTAMPTZ must render as a JST calendar date.
 */
export function formatJstDate(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** YYYY/MM/DD HH:mm in Asia/Tokyo. */
export function formatJstDateTimeMinutes(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

/** Parse YYYY/MM/DD HH:mm in local time → Date. Returns null on bad input. */
export function parseJstDateTimeMinutes(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    0,
  );
}

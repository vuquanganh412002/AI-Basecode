// Pure entity → response DTO mappers for the SCR-031 admin endpoints.
// No Nest DI, no repo, no service — importable from anywhere.

import type { Oshirase } from '@/database/entities/oshirase.entity';

const OSHIRASE_TYPE_LABELS: Record<number, string> = {
  1: 'システム',
  2: '重要',
  3: '一般',
  4: '締め切り時間',
};

const PUBLISH_LOCATION_LABELS: Record<number, string> = {
  1: 'ログイン画面',
  2: 'メニュー画面',
};

const OSHIRASE_STATUS_LABELS: Record<number, string> = {
  1: '下書き',
  2: '公開',
  3: '非公開',
};

export interface OshiraseListItem {
  oshirase_id: number;
  ja_id: number | null;
  oshirase_type: number;
  oshirase_type_label: string;
  publish_location: number;
  publish_location_label: string;
  status: number;
  status_label: string;
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

export function toOshiraseListItem(o: Oshirase): OshiraseListItem {
  return {
    oshirase_id: Number(o.oshiraseId),
    ja_id: o.jaId === null ? null : Number(o.jaId),
    oshirase_type: o.oshiraseType,
    oshirase_type_label: OSHIRASE_TYPE_LABELS[o.oshiraseType] ?? '',
    publish_location: o.publishLocation,
    publish_location_label: PUBLISH_LOCATION_LABELS[o.publishLocation] ?? '',
    status: o.status,
    status_label: OSHIRASE_STATUS_LABELS[o.status] ?? '',
    title: o.title,
    publish_start_date: formatJstDateTimeMinutes(o.publishStartDate),
    publish_end_date: o.publishEndDate ? formatJstDateTimeMinutes(o.publishEndDate) : null,
    target_kanri_kubun: o.targetKanriKubun ?? '',
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
  };
}

export function toOshiraseDetail(o: Oshirase): OshiraseDetail {
  return {
    ...toOshiraseListItem(o),
    content: o.content,
  };
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

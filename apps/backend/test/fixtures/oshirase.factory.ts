// Screen: ACSMS-SCR-031 — お知らせ一覧画面
//
// Fixture builders for Oshirase rows + list shapes + admin DTOs.
// Mirrors docs/design/ACSMS-SCR-031/ACSMS-SCR-031-api.md レスポンスデータ.

import type { Oshirase } from '@/database/entities/oshirase.entity';

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
  created_at: string;
  updated_at: string;
}

export interface OshiraseDetail extends OshiraseListItem {
  content: string;
  target_kanri_kubun: string;
}

/** Builder for a raw `t_oshirase` entity row (camelCase). */
export function buildOshiraseEntity(overrides: Partial<Oshirase> = {}): Oshirase {
  const now = new Date();
  return {
    oshiraseId: 1,
    jaId: null,
    oshiraseType: 1,
    publishLocation: 2,
    status: 2,
    title: 'システムメンテナンスのお知らせ',
    content: '4月1日（月）02:00〜06:00にシステムメンテナンスを実施いたします。',
    publishStartDate: new Date('2026-04-01T09:00:00+09:00'),
    publishEndDate: new Date('2026-04-30T23:59:00+09:00'),
    targetKanriKubun: '1,2,3',
    deletedAt: null,
    createdAt: now,
    createdBy: '1',
    updatedAt: now,
    updatedBy: '1',
    ...overrides,
  } as unknown as Oshirase;
}

/** Builder for a serialized list-row (after label mapping). */
export function buildOshiraseListItem(
  overrides: Partial<OshiraseListItem> = {},
): OshiraseListItem {
  return {
    oshirase_id: 1,
    ja_id: null,
    oshirase_type: 1,
    oshirase_type_label: 'システム',
    publish_location: 2,
    publish_location_label: 'メニュー画面',
    status: 2,
    status_label: '公開',
    title: 'システムメンテナンスのお知らせ',
    publish_start_date: '2026/04/01 09:00',
    publish_end_date: '2026/04/30 23:59',
    created_at: '2026-03-25T10:00:00Z',
    updated_at: '2026-03-25T10:00:00Z',
    ...overrides,
  };
}

/** Default 2-row list (matches api.md §レスポンス成功例 of API-031-001). */
export function buildOshiraseListResponse() {
  const rows = [
    buildOshiraseListItem(),
    buildOshiraseListItem({
      oshirase_id: 2,
      ja_id: 1,
      oshirase_type: 3,
      oshirase_type_label: '一般',
      publish_location: 1,
      publish_location_label: 'ログイン画面',
      status: 1,
      status_label: '下書き',
      title: '新機能リリースのお知らせ',
      publish_start_date: '2026/04/15 00:00',
      publish_end_date: null,
      created_at: '2026-04-10T08:30:00Z',
      updated_at: '2026-04-10T08:30:00Z',
    }),
  ];
  return {
    data: rows,
    meta: { total: 25, page: 1, per_page: 20, total_pages: 2 },
  };
}

/** Detail-mode entity → DTO shape (adds content + target_kanri_kubun). */
export function buildOshiraseDetail(
  overrides: Partial<OshiraseDetail> = {},
): OshiraseDetail {
  return {
    ...buildOshiraseListItem(),
    content: '4月1日（月）02:00〜06:00にシステムメンテナンスを実施いたします。',
    target_kanri_kubun: '1,2,3',
    ...overrides,
  };
}

// ─── Admin DTO bodies — API-031-003 / 004 ─────────────────────────

export interface CreateOshiraseBody {
  title: string;
  publish_location: number;
  status: number;
  publish_start_date: string;
  publish_end_date: string | null;
  ja_id: number | null;
  oshirase_type: number;
  target_kanri_kubun: string;
  content: string;
  // Index signature lets spec files cast to Record<string, unknown> for
  // `delete (body as Record<string, unknown>).field` patterns without TS2352.
  [key: string]: unknown;
}

export function buildCreateOshiraseBody(
  overrides: Partial<CreateOshiraseBody> = {},
): CreateOshiraseBody {
  return {
    title: 'システムメンテナンスのお知らせ',
    publish_location: 2,
    status: 2,
    // Use wall-clock future date to avoid "past date" rejection drift.
    publish_start_date: futureDateString(7),
    publish_end_date: futureDateString(30),
    ja_id: null,
    oshirase_type: 1,
    target_kanri_kubun: '1,2,3',
    content: '4月20日よりシステムメンテナンスを実施します。',
    ...overrides,
  };
}

export function buildUpdateOshiraseBody(
  overrides: Partial<CreateOshiraseBody> = {},
): CreateOshiraseBody {
  return buildCreateOshiraseBody({
    title: 'システムメンテナンスのお知らせ（更新）',
    publish_end_date: futureDateString(45),
    target_kanri_kubun: '1,2',
    content: '4月20日〜5月31日にシステムメンテナンスを実施します。',
    ...overrides,
  });
}

/** Produce a YYYY/MM/DD HH:mm string `daysFromNow` days in the future. */
export function futureDateString(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Produce a YYYY/MM/DD HH:mm string `daysAgo` days in the past. */
export function pastDateString(daysAgo: number): string {
  return futureDateString(-daysAgo);
}

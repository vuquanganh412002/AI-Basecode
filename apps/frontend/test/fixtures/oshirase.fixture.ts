// Test fixtures for ACSMS-SCR-031 (お知らせ一覧画面).
// Shapes mirror docs/design/ACSMS-SCR-031/ACSMS-SCR-031-api.md.
// Types re-exported from production so consumers can keep importing
// from this fixture file, but the shape definition stays in one place
// (any future field added to OshiraseListItem trips the type-checker
// here on next run, instead of silently going stale).
import type {
  OshiraseDetail,
  OshiraseListItem,
  OshiraseListResponse,
} from '@/api/oshirase/oshirase';
export type { OshiraseDetail, OshiraseListItem, OshiraseListResponse };

export function buildOshiraseListItem(
  overrides: Partial<OshiraseListItem> = {},
): OshiraseListItem {
  return {
    oshirase_id: 1,
    ja_id: null,
    ja_name: null,
    oshirase_type: 1,
    publish_location: 2,
    status: 2,
    title: 'システムメンテナンスのお知らせ',
    publish_start_date: '2026/04/01 09:00',
    publish_end_date: '2026/04/30 23:59',
    // target_kanri_kubun is optional in production (empty = 全管理者);
    // default to '' here so the field shape matches what BE returns.
    target_kanri_kubun: '',
    created_at: '2026-03-25T10:00:00Z',
    updated_at: '2026-03-25T10:00:00Z',
    ...overrides,
  };
}

export function buildOshiraseListResponse(
  overrides: Partial<OshiraseListResponse> = {},
): OshiraseListResponse {
  const rows = overrides.data ?? [
    buildOshiraseListItem(),
    buildOshiraseListItem({
      oshirase_id: 2,
      ja_id: 1,
      ja_name: 'JA東京中央',
      oshirase_type: 3,
      publish_location: 1,
      status: 1,
      title: '新機能リリースのお知らせ',
      publish_start_date: '2026/04/15 00:00',
      publish_end_date: null,
    }),
  ];
  return {
    data: rows,
    meta: overrides.meta ?? {
      total: rows.length,
      page: 1,
      per_page: 20,
      total_pages: 1,
    },
  };
}

export function buildOshiraseDetail(
  overrides: Partial<OshiraseDetail> = {},
): OshiraseDetail {
  // Default detail row carries a non-empty target_kanri_kubun so specs
  // that exercise the "selected admin tiers" rendering don't have to
  // override it. List-builder default is '' (= 全管理者) per BE shape.
  return {
    ...buildOshiraseListItem({ target_kanri_kubun: '1,2,3' }),
    content: '4月1日（月）02:00〜06:00にシステムメンテナンスを実施いたします。',
    ...overrides,
  };
}

// ─── JA dropdown (COMMON-003) ───────────────────────────────────────

export interface JaDropdownItem {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  todofuken_code: string;
  chuokai_flg: boolean;
}

export function buildJaDropdownResponse() {
  return {
    data: [
      {
        ja_id: 1,
        ja_code: '1300001',
        ja_name: '東京都中央会',
        todofuken_code: '13',
        chuokai_flg: true,
      },
      {
        ja_id: 2,
        ja_code: '1300002',
        ja_name: 'JA東京',
        todofuken_code: '13',
        chuokai_flg: false,
      },
    ] as JaDropdownItem[],
    // Matches src/api/ja/ja.ts JaDropdownResponse.meta shape exactly:
    // { total, page, per_page, has_more } — NOT total_pages.
    meta: { total: 2, page: 1, per_page: 100, has_more: false },
  };
}

// ─── Auth user with oshirase.* permissions ──────────────────────────

export function buildAdminUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 1,
    login_id: 'admin01',
    account_name: '管理者太郎',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    role_name: '日農（管理者）',
    ja_id: null,
    kanri_shiten_id: null,
    todofuken_code: null,
    paper_flg: false,
    denshi_flg: false,
    email: 'admin@nichino.co.jp',
    mfa_enable_flg: false,
    permissions: [
      'oshirase.view',
      'oshirase.create',
      'oshirase.update',
      'oshirase.delete',
    ],
    ...overrides,
  };
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

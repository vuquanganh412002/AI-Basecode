// Test fixtures for ACSMS-SCR-031 (お知らせ一覧画面).
// Shapes mirror docs/design/ACSMS-SCR-031/ACSMS-SCR-031-api.md.

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

export interface OshiraseListResponse {
  data: OshiraseListItem[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

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

export function buildOshiraseListResponse(
  overrides: Partial<OshiraseListResponse> = {},
): OshiraseListResponse {
  const rows = overrides.data ?? [
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
  return {
    ...buildOshiraseListItem(),
    content: '4月1日（月）02:00〜06:00にシステムメンテナンスを実施いたします。',
    target_kanri_kubun: '1,2,3',
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

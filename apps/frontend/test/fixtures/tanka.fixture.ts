// Test fixtures for ACSMS-SCR-002 (単価マスタ明細検索画面)
// and ACSMS-SCR-003 (単価マスタ登録画面).
// Shapes mirror docs/design/ACSMS-SCR-002/ACSMS-SCR-002-api.md
// and docs/design/ACSMS-SCR-003/ACSMS-SCR-003-api.md レスポンスデータ.

/**
 * Row shape returned by `GET /api/v1/tanka` (ACSMS-API-002-001).
 * Matches the list endpoint's response — `data[]` excludes detail-only
 * fields (`biko`, `created_at`, `updated_at`).
 */
export interface TankaListItem {
  tanka_id: number;
  tanka_type: number; // 1=新聞購読料, 2=配達手数料 (m_code TANKA_TYPE)
  tanka_code: string;
  tanka_name: string;
  tekiyo_start_date: string; // YYYY-MM-DD
  tekiyo_end_date: string | null; // NULL = 無期限
  kingaku_zeikomi: number;
  kingaku_zeinuki: number;
  tax_rate: number;
  active_flg: boolean;
}

export interface TankaListResponse {
  data: TankaListItem[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

/**
 * Default detail row used by GET /api/v1/tanka/:tanka_id (SCR-003).
 * Superset of `TankaListItem` — adds `ja_id`, `biko`, `created_at`,
 * `updated_at`.
 */
export interface TankaResponse extends TankaListItem {
  ja_id: number;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export function buildTankaListItem(
  overrides: Partial<TankaListItem> = {},
): TankaListItem {
  return {
    tanka_id: 1,
    tanka_type: 1,
    tanka_code: 'T001',
    tanka_name: '基本購読料（月額）',
    tekiyo_start_date: '2026-01-01',
    tekiyo_end_date: null,
    kingaku_zeikomi: 4900,
    kingaku_zeinuki: 4455,
    tax_rate: 10.0,
    active_flg: true,
    ...overrides,
  };
}

export function buildTanka(overrides: Partial<TankaResponse> = {}): TankaResponse {
  return {
    ...buildTankaListItem(),
    ja_id: 1,
    biko: '',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/**
 * Default 2-row Tanka list response (購読料 active + 配達手数料 disabled).
 * Pick this default so default tests see one of each state — filter
 * tests can override.
 */
export function buildTankaListResponse(
  overrides: Partial<TankaListResponse> = {},
): TankaListResponse {
  const rows = overrides.data ?? [
    buildTankaListItem({
      tanka_id: 1,
      tanka_code: 'T001',
      tanka_name: '基本購読料（月額）',
      tanka_type: 1,
      kingaku_zeikomi: 4900,
      kingaku_zeinuki: 4455,
      active_flg: true,
    }),
    buildTankaListItem({
      tanka_id: 2,
      tanka_code: 'T002',
      tanka_name: '配達手数料',
      tanka_type: 2,
      kingaku_zeikomi: 500,
      kingaku_zeinuki: 455,
      active_flg: false,
    }),
  ];
  return {
    data: rows,
    meta: {
      total: overrides.meta?.total ?? rows.length,
      page: overrides.meta?.page ?? 1,
      per_page: overrides.meta?.per_page ?? 20,
      total_pages:
        overrides.meta?.total_pages ??
        Math.max(1, Math.ceil((overrides.meta?.total ?? rows.length) / 20)),
    },
  };
}

/**
 * Default valid form payload for POST /api/v1/tanka (SCR-003).
 * Per api.md §リクエストパラメータ (POST) — tekiyo_start/end_date required.
 */
export function buildCreateTankaForm() {
  return {
    tanka_type: 1,
    tanka_code: 'T100',
    tanka_name: '新規単価',
    tax_rate: 10.0,
    kingaku_zeikomi: 1100,
    kingaku_zeinuki: 1000,
    tekiyo_start_date: '2026-06-01',
    tekiyo_end_date: '2027-05-31',
    biko: '',
    active_flg: true,
  };
}

/**
 * Minimal authenticated user payload. Default = CHUOKAI with full
 * tanka permissions, because NICHINO roles have NO tanka.* permission
 * per seeder.md §3 (column 1, 2 are × × for tanka.*).
 */
export function buildAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 10,
    login_id: 'chuokai01',
    account_name: '中央会 担当者',
    role_id: 3,
    role_code: 'CHUOKAI',
    role_name: '中央会',
    ja_id: 1,
    kanri_shiten_id: null,
    todofuken_code: '13',
    paper_flg: true,
    denshi_flg: false,
    email: 'chuokai01@agrinews.jp',
    mfa_enable_flg: false,
    permissions: [
      'tanka.view',
      'tanka.create',
      'tanka.update',
      'tanka.delete',
    ],
    ...overrides,
  };
}

/**
 * m_code TANKA_TYPE seed — used by `<BaseCodeSelect>` / radio
 * components via `useCodesStore().options('TANKA_TYPE')`. Values
 * match `docs/database/seeder.md §5.8`.
 */
export const TANKA_TYPE_OPTIONS = [
  { value: 1, label: '購読料', label_short: '購読料' },
  { value: 2, label: '配達手数料', label_short: '配達手数料' },
];

/** m_code ZEI_KUBUN seed (used by SCR-003 create/edit form). */
export const ZEI_KUBUN_OPTIONS = [
  { value: 1, label: '内税', label_short: '内税' },
  { value: 2, label: '外税', label_short: '外税' },
];

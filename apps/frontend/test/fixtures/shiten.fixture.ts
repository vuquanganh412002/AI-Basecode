// Test fixtures for ACSMS-SCR-006 (支店マスタ明細検索画面) +
// ACSMS-SCR-007 (支店マスタ登録画面). Shapes mirror api.md レスポンスデータ
// of both screens.

export interface ShitenDetail {
  shiten_id: number;
  ja_id: number;
  shiten_code: string;
  shiten_name: string;
  shiten_name_kana: string;
  kinyu_shiten_flg: boolean;
  // JASTEM 店舗単位 4 列 (database-design.md §m_shiten, ※空文字許容).
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
  kanri_shiten_id: number;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

/** Full detail used by edit-mode preload (getShiten envelope). */
export function buildShitenDetail(overrides: Partial<ShitenDetail> = {}): ShitenDetail {
  return {
    shiten_id: 1,
    ja_id: 1,
    shiten_code: '001',
    shiten_name: '本店営業部',
    shiten_name_kana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ',
    kinyu_shiten_flg: false,
    jastem_toriatsukai_tenpo_code: '',
    jastem_tenpo_name: '',
    jastem_tyokin_shubetsu: '',
    jastem_koza_no: '',
    kanri_shiten_id: 1,
    biko: '本店ビル1F',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/** Default valid form payload for POST /api/v1/shiten. */
export function buildCreateShitenForm() {
  return {
    shiten_code: '099',
    shiten_name: '新規支店',
    shiten_name_kana: 'ｼﾝｷｼﾃﾝ',
    kanri_shiten_id: 1,
    kinyu_shiten_flg: false,
    jastem_toriatsukai_tenpo_code: '',
    jastem_tenpo_name: '',
    jastem_tyokin_shubetsu: '',
    jastem_koza_no: '',
    biko: '新規登録テスト',
  };
}

/**
 * 管理支店 dropdown source — KanriShitenListResponse shape from
 * `@/api/kanri-shiten/kanri-shiten` listKanriShiten().
 */
export function buildKanriShitenListResponseForDropdown() {
  return {
    data: [
      {
        kanri_shiten_id: 1,
        ja_id: 1,
        kanri_shiten_code: 'KS-001',
        kanri_shiten_name: '東京中央管理支店',
        yubin_no: '1000001',
        todofuken_code: '13',
        todofuken_name: '東京都',
        address: '東京都千代田区1-1-1',
        tel: '0312345600',
        fax: '0312345601',
        paper_flg: true,
        denshi_flg: true,
      },
      {
        kanri_shiten_id: 2,
        ja_id: 1,
        kanri_shiten_code: 'KS-002',
        kanri_shiten_name: '東京南管理支店',
        yubin_no: '1500001',
        todofuken_code: '13',
        todofuken_name: '東京都',
        address: '東京都渋谷区1-1-1',
        tel: '0312345700',
        fax: '0312345701',
        paper_flg: true,
        denshi_flg: false,
      },
    ],
    meta: { total: 2, page: 1, per_page: 100, total_pages: 1 },
  };
}

/**
 * Minimal authenticated user payload for createTestingPinia auth state.
 * Default: CHUOKAI session scoped to ja_id=1 with shiten.* permissions
 * (matches the 3 JA-level roles per api.md §4.2).
 */
export function buildAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 1,
    login_id: 'chuokai01',
    account_name: '中央会担当者',
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
    permissions: ['shiten.view', 'shiten.create', 'shiten.update', 'shiten.delete'],
    ...overrides,
  };
}

// ─── ACSMS-SCR-006 — 支店マスタ明細検索 (list endpoint) ────────────────

/**
 * Single row in the ACSMS-SCR-006 list response. Same column set as
 * `ShitenDetail` today — kept structurally identical so detail and list
 * fixtures stay aligned.
 */
export interface ShitenListItem {
  shiten_id: number;
  ja_id: number;
  shiten_code: string;
  shiten_name: string;
  shiten_name_kana: string;
  kinyu_shiten_flg: boolean;
  kanri_shiten_id: number;
  kanri_shiten_name: string;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export interface ShitenListResponse {
  data: ShitenListItem[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

/** Single row helper for ACSMS-SCR-006 list assertions. */
export function buildShitenListItem(
  overrides: Partial<ShitenListItem> = {},
): ShitenListItem {
  return {
    shiten_id: 1,
    ja_id: 1,
    shiten_code: 'T-001',
    shiten_name: '東京支店',
    shiten_name_kana: 'ﾄｳｷｮｳｼﾃﾝ',
    kinyu_shiten_flg: false,
    kanri_shiten_id: 1,
    kanri_shiten_name: '東京中央管理支店',
    jastem_toriatsukai_tenpo_code: '',
    jastem_tenpo_name: '',
    jastem_tyokin_shubetsu: '',
    jastem_koza_no: '',
    biko: '',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/** Default 3-row list response — labels match index.html mockup rows. */
export function buildShitenListResponse(
  overrides: Partial<ShitenListResponse> = {},
): ShitenListResponse {
  const rows = overrides.data ?? [
    buildShitenListItem({
      shiten_id: 1,
      shiten_code: 'T-001',
      shiten_name: '東京支店',
      shiten_name_kana: 'ﾄｳｷｮｳｼﾃﾝ',
      kinyu_shiten_flg: false,
    }),
    buildShitenListItem({
      shiten_id: 2,
      shiten_code: 'T-002',
      shiten_name: '横浜支店',
      shiten_name_kana: 'ﾖｺﾊﾏｼﾃﾝ',
      kinyu_shiten_flg: true,
    }),
    buildShitenListItem({
      shiten_id: 3,
      shiten_code: 'T-003',
      shiten_name: '大宮支店',
      shiten_name_kana: 'ｵｵﾐﾔｼﾃﾝ',
      kinyu_shiten_flg: true,
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

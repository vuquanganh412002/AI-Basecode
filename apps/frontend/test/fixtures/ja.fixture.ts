// Test fixtures for ACSMS-SCR-005 (JAマスタ登録画面).
// Shapes mirror docs/design/ACSMS-SCR-005/ACSMS-SCR-005-api.md レスポンスデータ.

export interface JaResponse {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  ja_name_kana: string;
  todofuken_code: string;
  todofuken_name: string;
  chuokai_flg: boolean;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  email: string;
  tanto_busho: string;
  tanto_name: string;
  zei_kubun: string;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export interface TodofukenItem {
  todofuken_code: string;
  todofuken_name: string;
}

/** Default JA detail used by GET /api/v1/ja/:ja_id mocks. */
export function buildJa(overrides: Partial<JaResponse> = {}): JaResponse {
  return {
    ja_id: 1,
    ja_code: '1301001001',
    ja_name: 'JA東京中央',
    ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾁｭｳｵｳ',
    todofuken_code: '13',
    todofuken_name: '東京都',
    chuokai_flg: true,
    yubin_no: '1000001',
    address: '東京都千代田区丸の内1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    email: 'info@ja-tokyo-chuo.or.jp',
    tanto_busho: '総務部',
    tanto_name: '田中太郎',
    zei_kubun: '1',
    biko: '',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/** Default valid form payload for POST /api/v1/ja. */
export function buildCreateJaForm() {
  return {
    ja_code: '1301003001',
    ja_name: 'JA東京みどり',
    ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾐﾄﾞﾘ',
    todofuken_code: '13',
    chuokai_flg: false,
    yubin_no: '1600022',
    address: '東京都新宿区新宿3-1-1',
    tel: '0323456789',
    fax: '0323456780',
    email: 'info@ja-tokyo-midori.or.jp',
    tanto_busho: '企画課',
    tanto_name: '鈴木花子',
    zei_kubun: '1',
    biko: '',
  };
}

/**
 * Row shape returned by `GET /api/v1/ja` (ACSMS-API-004-001).
 * Subset of `JaResponse` — no `ja_name_kana`, `bank_*`, `email`,
 * `tanto_*`, `zei_kubun`, `biko`, `chuokai_flg`, `created_at`,
 * `updated_at` per `docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md`
 * §レスポンスデータ.
 */
export interface JaListItem {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  yubin_no: string;
  todofuken_code: string;
  todofuken_name: string;
  tel: string;
  address: string;
  fax: string;
  chuokai_flg: boolean;
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
}

export interface JaListResponse {
  data: JaListItem[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

/** Single row helper for SCR-004 list assertions. */
export function buildJaListItem(overrides: Partial<JaListItem> = {}): JaListItem {
  return {
    ja_id: 1,
    ja_code: '1301001001',
    ja_name: 'JA東京中央',
    yubin_no: '1000001',
    todofuken_code: '13',
    todofuken_name: '東京都',
    tel: '0312345678',
    address: '東京都千代田区丸の内1-1-1',
    fax: '0312345679',
    chuokai_flg: false,
    jastem_itakusha_code: '',
    jastem_itakusha_name: '',
    jastem_ja_code: '',
    jastem_ja_name: '',
    ...overrides,
  };
}

/** Default 2-row JA list response (Tokyo + Osaka). */
export function buildJaListResponse(
  overrides: Partial<JaListResponse> = {},
): JaListResponse {
  const rows = overrides.data ?? [
    buildJaListItem({ ja_id: 1, ja_code: '1301001001', ja_name: 'JA東京中央' }),
    buildJaListItem({
      ja_id: 2,
      ja_code: '2702001001',
      ja_name: 'JA大阪なにわ',
      yubin_no: '5300001',
      todofuken_code: '27',
      todofuken_name: '大阪府',
      tel: '0612345678',
      address: '大阪府大阪市北区',
      fax: '0612345679',
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

/** Default todofuken (都道府県) list for GET /api/v1/todofuken mocks. */
export function buildTodofukenList(): TodofukenItem[] {
  return [
    { todofuken_code: '01', todofuken_name: '北海道' },
    { todofuken_code: '13', todofuken_name: '東京都' },
    { todofuken_code: '27', todofuken_name: '大阪府' },
    { todofuken_code: '47', todofuken_name: '沖縄県' },
  ];
}

/** Minimal authenticated user payload for createTestingPinia auth state. */
export function buildAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 1,
    login_id: 'admin',
    account_name: '管理者',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    role_name: '日農管理者',
    ja_id: null,
    kanri_shiten_id: null,
    todofuken_code: null,
    paper_flg: true,
    denshi_flg: false,
    email: 'admin@agrinews.jp',
    mfa_enable_flg: false,
    permissions: ['ja.view', 'ja.create', 'ja.update'],
    ...overrides,
  };
}

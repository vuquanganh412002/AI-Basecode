// Test fixtures for ACSMS-SCR-008 (管理支店マスタ明細検索画面).
// Shapes mirror docs/design/ACSMS-SCR-008/ACSMS-SCR-008-api.md レスポンスデータ.

export interface KanriShitenListItem {
  kanri_shiten_id: number;
  ja_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  yubin_no: string;
  todofuken_code: string;
  todofuken_name: string;
  address: string;
  tel: string;
  fax: string;
  paper_flg: boolean;
  denshi_flg: boolean;
}

export interface KanriShitenListResponse {
  data: KanriShitenListItem[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

/** Single row helper for SCR-008 list assertions. */
export function buildKanriShitenListItem(
  overrides: Partial<KanriShitenListItem> = {},
): KanriShitenListItem {
  return {
    kanri_shiten_id: 1,
    ja_id: 1,
    kanri_shiten_code: '113-3300-001',
    kanri_shiten_name: '東京中央支店',
    yubin_no: '1000001',
    todofuken_code: '13',
    todofuken_name: '東京都',
    address: '千代田区千代田1-1-1',
    tel: '0312345678',
    fax: '0312345679',
    paper_flg: true,
    denshi_flg: true,
    ...overrides,
  };
}

/** Default 2-row list response (Tokyo + Hokkaido). */
export function buildKanriShitenListResponse(
  overrides: Partial<KanriShitenListResponse> = {},
): KanriShitenListResponse {
  const rows = overrides.data ?? [
    buildKanriShitenListItem({
      kanri_shiten_id: 1,
      kanri_shiten_code: '113-3300-001',
      kanri_shiten_name: '東京中央支店',
    }),
    buildKanriShitenListItem({
      kanri_shiten_id: 2,
      ja_id: 2,
      kanri_shiten_code: '013-3300-001',
      kanri_shiten_name: 'JA北海道中央管理支店',
      yubin_no: '0600001',
      todofuken_code: '01',
      todofuken_name: '北海道',
      address: '札幌市中央区',
      tel: '0112223333',
      fax: '0112223334',
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
    // ja.view required so KanriShitenFormView's BaseJaDropdown renders.
    // Real NICHINO_ADMIN seed has it; JA_KANRI_SHITEN tests override
    // this list to drop ja.view and exercise the read-only fallback.
    permissions: [
      'kanri_shiten.view',
      'kanri_shiten.update',
      'kanri_shiten.delete',
      'ja.view',
    ],
    ...overrides,
  };
}

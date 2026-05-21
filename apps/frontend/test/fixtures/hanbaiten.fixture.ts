// Test fixtures for ACSMS-SCR-018 (販売店明細検索画面).
// Shapes mirror docs/design/ACSMS-SCR-018/ACSMS-SCR-018-api.md レスポンスデータ
// (v1.2 — todofuken_name + haitatsuryo_shiharai_cycle + tesuryo_kubun labels).

export interface HanbaitenListItem {
  hanbaiten_id: number;
  ja_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  todofuken_code: string;
  todofuken_name: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  shocho_name: string;
  itaku_kubun: number | null;
  haitatsuryo_shiharai_cycle: number | null;
  tesuryo_kubun: number | null;
  tesuryo_amount: number | null;
  haiten_flg: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface HanbaitenListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface HanbaitenListResponse {
  data: HanbaitenListItem[];
  meta: HanbaitenListMeta;
}

/** Single row builder for SCR-018 list assertions. */
export function buildHanbaitenListItem(
  overrides: Partial<HanbaitenListItem> = {},
): HanbaitenListItem {
  return {
    hanbaiten_id: 1,
    ja_id: 1,
    hanbaiten_code: 'H001',
    hanbaiten_name: '山田新聞販売店',
    todofuken_code: '13',
    todofuken_name: '東京都',
    yubin_no: '1000001',
    address: '東京都千代田区千代田1-1',
    tel: '0312345678',
    fax: '0312345679',
    shocho_name: '山田太郎',
    itaku_kubun: 1,
    haitatsuryo_shiharai_cycle: 1,
    tesuryo_kubun: 1,
    tesuryo_amount: 500,
    haiten_flg: false,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/** Default 2-row paginated response (matches api.md §レスポンス成功例). */
export function buildHanbaitenListResponse(
  overrides: Partial<HanbaitenListResponse> = {},
): HanbaitenListResponse {
  const rows = overrides.data ?? [
    buildHanbaitenListItem({
      hanbaiten_id: 1,
      hanbaiten_code: 'H001',
      hanbaiten_name: '山田新聞販売店',
    }),
    buildHanbaitenListItem({
      hanbaiten_id: 2,
      hanbaiten_code: 'H002',
      hanbaiten_name: '山田書店',
      todofuken_code: '14',
      todofuken_name: '神奈川県',
      yubin_no: '1500001',
      address: '神奈川県横浜市西区1-2-3',
      tel: '0398765432',
      fax: '0398765433',
      shocho_name: '山田花子',
      itaku_kubun: 2,
      haitatsuryo_shiharai_cycle: 3,
      tesuryo_kubun: 2,
      tesuryo_amount: 300,
      haiten_flg: false,
      created_at: '2026-02-01T09:00:00Z',
      updated_at: null,
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

// ─── Auth user fixture ─────────────────────────────────────────────

/**
 * SCR-018 access matrix (seeder.md §3 + screen-design.md 1.1):
 * - NICHINO_STAFF (role 2): view only (delete via 販売店代行入力 flow)
 * - CHUOKAI (role 3):       view + create + update + delete
 * - JA_HONTEN (role 4):     view + create + update + delete
 * - JA_KANRI_SHITEN (role 5): view + create + update + delete
 *
 * Default fixture seeds a JA_HONTEN user holding the full permission
 * set; overrides drop perms to model gated states.
 */
export function buildAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 1,
    login_id: 'ja_honten001',
    account_name: 'JA本店 管理者',
    role_id: 4,
    role_code: 'JA_HONTEN',
    role_name: 'JA本店',
    ja_id: 1,
    kanri_shiten_id: null,
    todofuken_code: '13',
    paper_flg: true,
    denshi_flg: false,
    email: 'ja_honten001@example.com',
    mfa_enable_flg: false,
    permissions: [
      'hanbaiten.view',
      'hanbaiten.create',
      'hanbaiten.update',
      'hanbaiten.delete',
    ],
    ...overrides,
  };
}

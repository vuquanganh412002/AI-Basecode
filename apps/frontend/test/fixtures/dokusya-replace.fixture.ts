// Test fixtures for ACSMS-SCR-015 (購読者販売店一括置換画面).
//
// Shapes mirror docs/design/ACSMS-SCR-015/ACSMS-SCR-015-api.md:
//   ACSMS-API-015-001 (Search Dokusya for Hanbaiten Replacement) —
//     `{ data: ReplaceSearchItem[], meta }`
//   ACSMS-API-015-002 (Bulk Replace Dokusya Hanbaiten) —
//     `{ data: { total_count, replaced_count, rireki_count,
//       new_hanbaiten_id, applied_at }, message }`
//
// dokusya_shubetsu / shiharai_hoho carry the m_code numeric values
// (docs/database/seeder.md §5) the view uses to filter ineligible rows
// (機能定義 4.1 — 併読者 dokusya_shubetsu=3, 電子版クレカ
// dokusya_shubetsu=2 && shiharai_hoho=6).

/** One row of the API-015-001 search response. */
export interface ReplaceSearchItem {
  dokusya_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei: string;
  haitatsu_yubin_no: string;
  haitatsu_address: string;
  hanbaiten_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  dokusya_shubetsu: number;
  shiharai_hoho: number;
}

export interface ReplaceSearchMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ReplaceSearchEnvelope {
  data: ReplaceSearchItem[];
  meta: ReplaceSearchMeta;
}

/**
 * Default-happy search row (紙版 / 口座引落 → eligible for replacement).
 * Override per test to exercise ineligible / same-hanbaiten branches.
 */
export function buildReplaceSearchItem(
  overrides: Partial<ReplaceSearchItem> = {},
): ReplaceSearchItem {
  return {
    dokusya_id: 5001,
    kanri_shiten_id: 10,
    kanri_shiten_name: '東京中央 管理支店',
    shiten_id: 100,
    shiten_name: '千代田支店',
    kumiaiin_code: '10001',
    shimei: '山田 太郎',
    haitatsu_yubin_no: '1000001',
    haitatsu_address: '東京都千代田区1-1-1 千代田マンション101',
    hanbaiten_id: 200,
    hanbaiten_code: 'H001',
    hanbaiten_name: '千代田販売店',
    dokusya_shubetsu: 1,
    shiharai_hoho: 1,
    ...overrides,
  };
}

/**
 * Default 2-row paginated search response — both rows eligible (紙版).
 * Override `data` / `meta` for empty-result or mixed-eligibility cases.
 */
export function buildReplaceSearchResponse(
  overrides: Partial<ReplaceSearchEnvelope> = {},
): ReplaceSearchEnvelope {
  return {
    data: overrides.data ?? [
      buildReplaceSearchItem({
        dokusya_id: 5001,
        kumiaiin_code: '10001',
        shimei: '山田 太郎',
      }),
      buildReplaceSearchItem({
        dokusya_id: 5002,
        kumiaiin_code: '10002',
        shimei: '鈴木 花子',
        haitatsu_yubin_no: '1000002',
        haitatsu_address: '東京都千代田区2-2-2',
        shiharai_hoho: 2,
      }),
    ],
    meta: overrides.meta ?? { total: 2, page: 1, per_page: 20, total_pages: 1 },
  };
}

/** API-015-002 success body. */
export interface ReplaceResultEnvelope {
  data: {
    total_count: number;
    replaced_count: number;
    rireki_count: number;
    new_hanbaiten_id: number;
    applied_at: string;
  };
  message: string;
}

export function buildReplaceResultResponse(
  overrides: Partial<ReplaceResultEnvelope['data']> = {},
): ReplaceResultEnvelope {
  return {
    data: {
      total_count: 2,
      replaced_count: 2,
      rireki_count: 2,
      new_hanbaiten_id: 201,
      applied_at: '2026-06-01T10:00:00+09:00',
      ...overrides,
    },
    message: '置換処理が完了しました。',
  };
}

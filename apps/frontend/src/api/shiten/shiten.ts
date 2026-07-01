import axiosInstance from '@/api/axios-instance';

// ─── ACSMS-SCR-006 — 支店マスタ明細検索画面 ────────────────────────────

/**
 * Row shape returned by `GET /api/v1/shiten` (ACSMS-API-006-001).
 * Mirrors `docs/design/ACSMS-SCR-006/ACSMS-SCR-006-api.md §レスポンスデータ`.
 *
 * Adds `kanri_shiten_name` over `ShitenDetail` — the list response
 * batch-joins from `m_kanri_shiten` so the table can show the parent
 * branch name without an extra round-trip per row.
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

export interface ShitenListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ShitenListResponse {
  data: ShitenListItem[];
  meta: ShitenListMeta;
}

/** Query-string DTO for `GET /api/v1/shiten`. */
export interface ListShitenQuery {
  shiten_name?: string;
  shiten_code?: string;
  kanri_shiten_id?: number;
  jastem_toriatsukai_tenpo_code?: string;
  /** undefined = 全選択 (no filter), true = 金融機関支店, false = 金融機関支店以外. */
  kinyu_shiten_flg?: boolean;
  page?: number;
  per_page?: number;
  /** Sortable columns: 2 local (画面定義§8.1) + 1 joined (kanri_shiten_name). */
  sort_by?: 'shiten_code' | 'shiten_name' | 'kanri_shiten_name';
  sort_order?: 'asc' | 'desc';
}

/** Response from `DELETE /api/v1/shiten/:shiten_id`. */
export interface ShitenDeleteResponse {
  message: string;
}

export async function listShiten(
  query: ListShitenQuery = {},
): Promise<ShitenListResponse> {
  const res = await axiosInstance.get<ShitenListResponse>('/api/v1/shiten', {
    params: query,
  });
  return res.data;
}

export async function removeShiten(
  shitenId: number,
): Promise<ShitenDeleteResponse> {
  const res = await axiosInstance.delete<ShitenDeleteResponse>(
    `/api/v1/shiten/${shitenId}`,
  );
  return res.data;
}

// ─── ACSMS-API-COMMON — 支店 dropdown (consumed by SCR-011) ────────────

/**
 * Minimal projection used by 引落口座支店 / 配達先支店 dropdowns. The
 * form view filters client-side by `kinyu_shiten_flg=true` for the
 * 口座引落 cluster (画面設計書 SCR-011 §10.1: 「支店マスタの金融機関
 * 支店フラグ=1」のもののみ表示). `kanri_shiten_id` is included so the
 * dropdown can chain off the parent 管理支店 selection without a
 * second round-trip.
 */
export interface ShitenDropdownItem {
  shiten_id: number;
  shiten_code: string;
  shiten_name: string;
  kanri_shiten_id: number;
  kinyu_shiten_flg: boolean;
  /**
   * Optional — BE includes these when the response is consumed by the
   * 引落口座支店 picker that auto-fills the JASTEM 店舗 fields. The
   * dropdown for non-kinyu shiten omits them.
   */
  jastem_toriatsukai_tenpo_code?: string;
  jastem_tenpo_name?: string;
}

export interface ShitenDropdownEnvelope {
  data: ShitenDropdownItem[];
  /**
   * Optional cursor-pagination meta. Older callers expect just
   * `{ data }`; newer dropdown views (SCR-011) consume `has_more` to
   * drive infinite scroll. The field stays optional so both shapes
   * type-check.
   */
  meta?: { total: number; page: number; per_page: number; has_more: boolean };
}

export interface ShitenDropdownQuery {
  /** Optional JA filter (NICHINO_* 代行入力 only — JA-scoped roles let session.ja_id win). */
  ja_id?: number;
  /** true = 金融機関支店のみ (引落口座支店 picker); false / undefined = all. */
  kinyu_shiten_flg?: boolean;
  /**
   * 管理支店IDで絞込み (ACSMS-API-COMMON-006). SCR-015 chains the 支店
   * dropdown off the chosen 管理支店. BE asserts it is within the
   * caller's session scope (query tampering guard).
   */
  kanri_shiten_id?: number;
  q?: string;
  page?: number;
  per_page?: number;
}

/**
 * GET /api/v1/shiten/dropdown — Shared dropdown lookup for SCR-011
 * (購読者情報登録). Returns minimal projections so the dropdown
 * component can render thousands of rows without overweighting the
 * payload.
 */
export async function getShitenDropdown(
  query: ShitenDropdownQuery = {},
): Promise<ShitenDropdownEnvelope> {
  const res = await axiosInstance.get<ShitenDropdownEnvelope>(
    '/api/v1/shiten/dropdown',
    { params: query },
  );
  return res.data;
}

// ─── ACSMS-API-COMMON-008 — Get Koza Shiten Dropdown (定義元: ACSMS-SCR-020) ──

/** 口座支店ドロップダウンの1行（金融機関支店フラグ=TRUE のみ）。 */
export interface KozaShitenDropdownItem {
  shiten_id: number;
  shiten_code: string;
  shiten_name: string;
  kanri_shiten_id: number;
  // SCR-020: 選択した口座支店ごとに JASTEM 金融機関支店情報を表示する。
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
}

export interface KozaShitenDropdownEnvelope {
  data: KozaShitenDropdownItem[];
}

/**
 * GET /api/v1/shiten/koza-dropdown — 口座支店（kinyu_shiten_flg=TRUE）の
 * プルダウン。SCR-020 の引落口座支店ピッカーで使用。DataScope は BE が自動適用。
 * 任意の kanri_shiten_ids（カンマ区切り）で絞込。
 */
export async function getKozaShitenDropdown(
  query: { kanri_shiten_ids?: number[] } = {},
): Promise<KozaShitenDropdownEnvelope> {
  const params =
    query.kanri_shiten_ids && query.kanri_shiten_ids.length > 0
      ? { kanri_shiten_ids: query.kanri_shiten_ids.join(',') }
      : {};
  const res = await axiosInstance.get<KozaShitenDropdownEnvelope>(
    '/api/v1/shiten/koza-dropdown',
    { params },
  );
  return res.data;
}

// ─── ACSMS-SCR-007 — 支店マスタ登録画面 ──────────────────────────────

/**
 * Full detail returned by `GET /api/v1/shiten/:id` and the body of
 * POST/PUT responses. Mirrors
 * `docs/design/ACSMS-SCR-007/ACSMS-SCR-007-api.md §レスポンスデータ`.
 */
export interface ShitenDetail {
  shiten_id: number;
  ja_id: number;
  shiten_code: string;
  shiten_name: string;
  shiten_name_kana: string;
  kinyu_shiten_flg: boolean;
  // JASTEM 店舗単位 4 列 (database-design.md §m_shiten rows 7-10,
  // ※空文字許容 — BE serializes '' for missing values, never null).
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
  kanri_shiten_id: number;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

/** POST /api/v1/shiten request body. */
export interface CreateShitenRequest {
  shiten_code: string;
  shiten_name: string;
  shiten_name_kana?: string;
  kanri_shiten_id: number;
  kinyu_shiten_flg?: boolean;
  jastem_toriatsukai_tenpo_code?: string;
  jastem_tenpo_name?: string;
  jastem_tyokin_shubetsu?: string;
  jastem_koza_no?: string;
  biko?: string;
}

/**
 * PUT /api/v1/shiten/:id — drops `shiten_code` (immutable after create)
 * per api.md §3 注記. `ja_id` is also not in the body (derived from session).
 */
export type UpdateShitenRequest = Omit<CreateShitenRequest, 'shiten_code'>;

export interface ShitenEnvelope {
  data: ShitenDetail;
}

export interface ShitenWriteEnvelope {
  data: ShitenDetail;
  message: string;
}

export async function getShiten(shitenId: number): Promise<ShitenEnvelope> {
  const res = await axiosInstance.get<ShitenEnvelope>(`/api/v1/shiten/${shitenId}`);
  return res.data;
}

export async function createShiten(
  body: CreateShitenRequest,
): Promise<ShitenWriteEnvelope> {
  const res = await axiosInstance.post<ShitenWriteEnvelope>('/api/v1/shiten', body);
  return res.data;
}

export async function updateShiten(
  shitenId: number,
  body: UpdateShitenRequest,
): Promise<ShitenWriteEnvelope> {
  const res = await axiosInstance.put<ShitenWriteEnvelope>(
    `/api/v1/shiten/${shitenId}`,
    body,
  );
  return res.data;
}

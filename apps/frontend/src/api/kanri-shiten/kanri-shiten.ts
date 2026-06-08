import axiosInstance from '@/api/axios-instance';

// ─── ACSMS-SCR-008 — 管理支店マスタ明細検索画面 ──────────────────────────

/**
 * Row shape returned by `GET /api/v1/kanri-shiten` (ACSMS-API-008-001).
 * Mirrors `docs/design/ACSMS-SCR-008/ACSMS-SCR-008-api.md §レスポンスデータ`.
 */
export interface KanriShitenListItem {
  kanri_shiten_id: number;
  ja_id: number;
  ja_name: string;
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

export interface KanriShitenListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface KanriShitenListResponse {
  data: KanriShitenListItem[];
  meta: KanriShitenListMeta;
}

/** Query-string DTO for `GET /api/v1/kanri-shiten`. */
export interface ListKanriShitenQuery {
  kanri_shiten_code?: string;
  kanri_shiten_name?: string;
  todofuken_code?: string;
  tel?: string;
  fax?: string;
  page?: number;
  per_page?: number;
  /**
   * 3 user-clickable headers from 画面定義§8.1 plus `updated_at`, the
   * implicit default applied on first render so the most recently
   * created / updated row appears at the top.
   */
  sort_by?:
    | 'kanri_shiten_code'
    | 'kanri_shiten_name'
    | 'todofuken_code'
    | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/** Response from `DELETE /api/v1/kanri-shiten/:kanri_shiten_id`. */
export interface KanriShitenDeleteResponse {
  message: string;
}

export async function listKanriShiten(
  query: ListKanriShitenQuery = {},
): Promise<KanriShitenListResponse> {
  const res = await axiosInstance.get<KanriShitenListResponse>(
    '/api/v1/kanri-shiten',
    { params: query },
  );
  return res.data;
}

export async function removeKanriShiten(
  kanriShitenId: number,
): Promise<KanriShitenDeleteResponse> {
  const res = await axiosInstance.delete<KanriShitenDeleteResponse>(
    `/api/v1/kanri-shiten/${kanriShitenId}`,
  );
  return res.data;
}

// ─── ACSMS-API-COMMON-004 — Get Kanri Shiten Dropdown ────────────────

/**
 * Single row in the dropdown response. Minimal 3-column projection per
 * spec — full management list is admin-only via `listKanriShiten`.
 */
export interface KanriShitenDropdownItem {
  kanri_shiten_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
}

export interface KanriShitenDropdownEnvelope {
  data: KanriShitenDropdownItem[];
  /**
   * Optional cursor-pagination meta — older callers expect just
   * `{ data }`; newer dropdown consumers (SCR-011) read `has_more` to
   * drive infinite scroll. The field stays optional so both shapes
   * type-check.
   */
  meta?: { total: number; page: number; per_page: number; has_more: boolean };
}

/**
 * Shared dropdown lookup used by SCR-007 / SCR-024 / SCR-025 forms.
 * Authenticated-only — no role gate (the caller's screen-level guard
 * already authorized the user). Spec:
 * `docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md §ACSMS-API-COMMON-004`.
 */
export async function getKanriShitenDropdown(
  jaId: number,
): Promise<KanriShitenDropdownEnvelope> {
  const res = await axiosInstance.get<KanriShitenDropdownEnvelope>(
    '/api/v1/kanri-shiten/dropdown',
    { params: { ja_id: jaId } },
  );
  return res.data;
}

// ─── ACSMS-SCR-009 — 管理支店マスタ登録画面 ──────────────────────────

/**
 * Full detail returned by `GET /api/v1/kanri-shiten/:id` and the body of
 * POST/PUT responses. Mirrors
 * `docs/design/ACSMS-SCR-009/ACSMS-SCR-009-api.md §レスポンスデータ`.
 */
export interface KanriShitenDetail {
  kanri_shiten_id: number;
  ja_id: number;
  /**
   * JA名（m_jaからJOIN）— JA_KANRI_SHITEN は ja.view 権限を持たないため
   * /api/v1/ja/dropdown を呼べない。詳細レスポンスにこの値を含めることで、
   * 編集フォームは BaseJaDropdown を呼ばずに親JA名を表示できる。
   */
  ja_name: string;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  kanri_shiten_name_kana: string;
  todofuken_code: string;
  todofuken_name?: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

/** POST /api/v1/kanri-shiten request body. */
export interface CreateKanriShitenRequest {
  ja_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  kanri_shiten_name_kana?: string;
  todofuken_code: string;
  yubin_no?: string;
  address?: string;
  tel?: string;
  fax?: string;
  paper_flg?: boolean;
  denshi_flg?: boolean;
  biko?: string;
}

/**
 * PUT /api/v1/kanri-shiten/:id — drops `ja_id` and `kanri_shiten_code`
 * per api.md §3 注記 (immutable after create).
 */
export type UpdateKanriShitenRequest = Omit<
  CreateKanriShitenRequest,
  'ja_id' | 'kanri_shiten_code'
>;

export interface KanriShitenEnvelope {
  data: KanriShitenDetail;
}

export interface KanriShitenWriteEnvelope {
  data: KanriShitenDetail;
  message: string;
}

export async function getKanriShiten(
  kanriShitenId: number,
): Promise<KanriShitenEnvelope> {
  const res = await axiosInstance.get<KanriShitenEnvelope>(
    `/api/v1/kanri-shiten/${kanriShitenId}`,
  );
  return res.data;
}

export async function createKanriShiten(
  body: CreateKanriShitenRequest,
): Promise<KanriShitenWriteEnvelope> {
  const res = await axiosInstance.post<KanriShitenWriteEnvelope>(
    '/api/v1/kanri-shiten',
    body,
  );
  return res.data;
}

export async function updateKanriShiten(
  kanriShitenId: number,
  body: UpdateKanriShitenRequest,
): Promise<KanriShitenWriteEnvelope> {
  const res = await axiosInstance.put<KanriShitenWriteEnvelope>(
    `/api/v1/kanri-shiten/${kanriShitenId}`,
    body,
  );
  return res.data;
}

import axiosInstance from '@/api/axios-instance';

// Hand-written API wrapper for the 単価マスタ (m_tanka) endpoints.
// Mirrors `apps/frontend/src/api/ja/ja.ts` — the project keeps a thin
// layer on top of Orval so the response envelope is unwrapped at this
// boundary and the views consume clean shapes. The Orval-generated
// stubs at `@/api/generated/tanka/tanka.ts` return `void` because the
// backend Swagger doesn't declare a response schema for the list /
// delete endpoints; the types below are the single source of truth on
// the FE side (matches docs/design/ACSMS-SCR-002/ACSMS-SCR-002-api.md).
//
// SCR-002 ships listTanka + removeTanka. SCR-003 (create / update /
// detail) will extend this file with getTanka / createTanka /
// updateTanka — keep the structure parallel to ja.ts to make that
// follow-up mechanical.

/**
 * Row shape returned by `GET /api/v1/tanka` (ACSMS-API-002-001).
 * Per `docs/design/ACSMS-SCR-002/ACSMS-SCR-002-api.md` §レスポンスデータ.
 */
export interface TankaListItem {
  tanka_id: number;
  /** m_code.code_category='TANKA_TYPE' — 1=新聞購読料, 2=配達手数料. */
  tanka_type: number;
  tanka_code: string;
  tanka_name: string;
  /** YYYY-MM-DD */
  tekiyo_start_date: string;
  /** YYYY-MM-DD — null = 無期限 (open-ended). */
  tekiyo_end_date: string | null;
  kingaku_zeikomi: number;
  kingaku_zeinuki: number;
  tax_rate: number;
  /** Manual operator-controlled disable flag (independent of tekiyo dates). */
  active_flg: boolean;
}

export interface TankaListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TankaListResponse {
  data: TankaListItem[];
  meta: TankaListMeta;
}

/** Query-string DTO for `GET /api/v1/tanka`. */
export interface ListTankaQuery {
  tanka_type?: number;
  tanka_name?: string;
  /**
   * Lower bound on `tekiyo_start_date` (YYYY-MM-DD). Records whose
   * effective period starts on/after this date pass the filter.
   * Per api.md §4.3 — `tekiyo_start_date >= 指定値`.
   */
  tekiyo_start_date?: string;
  /**
   * Upper bound on `tekiyo_end_date` (YYYY-MM-DD). Records whose
   * effective period ends on/before this date pass the filter.
   * NULL (無期限) records are EXCLUDED — see api.md §4.3.
   */
  tekiyo_end_date?: string;
  /**
   * `true` = 有効中のみ、`false` = 停止中のみ、`undefined` = 両方（省略時）.
   * Per api.md §4.3 the BE treats absence as "both".
   */
  active_flg?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** Response shape from `DELETE /api/v1/tanka/:tanka_id`. */
export interface TankaDeleteResponse {
  message: string;
}

/**
 * Detail shape returned by `GET /api/v1/tanka/:tanka_id` (ACSMS-API-003-001)
 * + body of `POST /api/v1/tanka` (003-002) + `PUT /api/v1/tanka/:tanka_id`
 * (003-003). Superset of `TankaListItem` — adds `ja_id`, `biko`,
 * `created_at`, `updated_at` per api.md §レスポンスデータ.
 */
export interface TankaDetail {
  tanka_id: number;
  ja_id: number;
  /** m_code.code_category='TANKA_TYPE' — 1=新聞購読料, 2=配達手数料. */
  tanka_type: number;
  tanka_code: string;
  tanka_name: string;
  kingaku_zeikomi: number;
  kingaku_zeinuki: number;
  tax_rate: number;
  /** YYYY-MM-DD */
  tekiyo_start_date: string;
  /** YYYY-MM-DD — null = 無期限 (open-ended). */
  tekiyo_end_date: string | null;
  active_flg: boolean;
  /** NOT NULL, defaults to '' when blank. */
  biko: string;
  /** ISO 8601 (TIMESTAMPTZ). */
  created_at: string;
  /** ISO 8601 — null until the first update. */
  updated_at: string | null;
}

/** POST /api/v1/tanka request body — ACSMS-API-003-002. */
export interface CreateTankaRequest {
  tanka_type: number;
  tanka_code: string;
  tanka_name: string;
  tax_rate?: number;
  kingaku_zeikomi?: number;
  kingaku_zeinuki?: number;
  tekiyo_start_date: string;
  tekiyo_end_date: string;
  biko?: string;
  active_flg?: boolean;
}

/**
 * PUT /api/v1/tanka/:id request body — same as Create MINUS `tanka_code`
 * (immutable per api.md §API-003-003 footnote: 「tanka_code は更新不可」).
 */
export type UpdateTankaRequest = Omit<CreateTankaRequest, 'tanka_code'>;

export interface TankaEnvelope {
  data: TankaDetail;
}

export interface TankaWriteEnvelope {
  data: TankaDetail;
  message: string;
}

export async function listTanka(
  query: ListTankaQuery = {},
): Promise<TankaListResponse> {
  const res = await axiosInstance.get<TankaListResponse>('/api/v1/tanka', {
    params: query,
  });
  return res.data;
}

export async function removeTanka(tankaId: number): Promise<TankaDeleteResponse> {
  const res = await axiosInstance.delete<TankaDeleteResponse>(
    `/api/v1/tanka/${tankaId}`,
  );
  return res.data;
}

export async function getTanka(tankaId: number): Promise<TankaEnvelope> {
  const res = await axiosInstance.get<TankaEnvelope>(
    `/api/v1/tanka/${tankaId}`,
  );
  return res.data;
}

export async function createTanka(
  body: CreateTankaRequest,
): Promise<TankaWriteEnvelope> {
  const res = await axiosInstance.post<TankaWriteEnvelope>(
    '/api/v1/tanka',
    body,
  );
  return res.data;
}

export async function updateTanka(
  tankaId: number,
  body: UpdateTankaRequest,
): Promise<TankaWriteEnvelope> {
  const res = await axiosInstance.put<TankaWriteEnvelope>(
    `/api/v1/tanka/${tankaId}`,
    body,
  );
  return res.data;
}

// ─── GET /api/v1/tanka/dropdown ────────────────────────────────────────
// Slim paginated + searchable list — consumed by SCR-017 hanbaiten
// create form for the 配達手数料単価 field. See `BaseTankaDropdown`.

export interface TankaDropdownItem {
  tanka_id: number;
  tanka_code: string;
  tanka_name: string;
  tanka_type: number;
  kingaku_zeikomi: number;
}

export interface TankaDropdownResponse {
  data: TankaDropdownItem[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
}

export interface TankaDropdownQuery {
  /** ILIKE on tanka_name only (tanka_code is hidden in the UI). */
  q?: string;
  /** m_code.code_category=TANKA_TYPE value. SCR-017 passes 2 (配達手数料). */
  tanka_type?: number;
  /**
   * Explicit JA filter — for NICHINO_STAFF 代行入力 flow where the form
   * picked a JA up-front. Ignored when the caller's session is JA-scoped.
   */
  ja_id?: number;
  page?: number;
  per_page?: number;
  /** Edit-form escape hatch — BE prepends this tanka_id if not in page 1. */
  include_id?: number;
}

export async function getTankaDropdown(
  query: TankaDropdownQuery = {},
): Promise<TankaDropdownResponse> {
  const res = await axiosInstance.get<TankaDropdownResponse>(
    '/api/v1/tanka/dropdown',
    { params: query },
  );
  return res.data;
}

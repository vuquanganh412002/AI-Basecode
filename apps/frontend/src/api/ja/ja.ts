import axiosInstance from '@/api/axios-instance';

/** Response shape from `GET /api/v1/ja/:ja_id` (and the body of POST/PUT). */
export interface JaDetail {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  ja_name_kana: string;
  todofuken_code: string;
  todofuken_name?: string;
  chuokai_flg: boolean;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  email: string;
  tanto_busho: string;
  tanto_name: string;
  zei_kubun: string;
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

/** POST /api/v1/ja request body. */
export interface CreateJaRequest {
  ja_code: string;
  ja_name: string;
  ja_name_kana?: string;
  todofuken_code: string;
  chuokai_flg: boolean;
  yubin_no?: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
  tanto_busho?: string;
  tanto_name?: string;
  zei_kubun: string;
  jastem_itakusha_code?: string;
  jastem_itakusha_name?: string;
  jastem_ja_code?: string;
  jastem_ja_name?: string;
  biko?: string;
}

/** PUT /api/v1/ja/:ja_id — same as CreateJaRequest minus the immutable ja_code. */
export type UpdateJaRequest = Omit<CreateJaRequest, 'ja_code'>;

export interface JaEnvelope {
  data: JaDetail;
}

export interface JaWriteEnvelope {
  data: JaDetail;
  message: string;
}

export async function getJa(jaId: number): Promise<JaEnvelope> {
  const res = await axiosInstance.get<JaEnvelope>(`/api/v1/ja/${jaId}`);
  return res.data;
}

export async function createJa(body: CreateJaRequest): Promise<JaWriteEnvelope> {
  const res = await axiosInstance.post<JaWriteEnvelope>('/api/v1/ja', body);
  return res.data;
}

export async function updateJa(
  jaId: number,
  body: UpdateJaRequest,
): Promise<JaWriteEnvelope> {
  const res = await axiosInstance.put<JaWriteEnvelope>(`/api/v1/ja/${jaId}`, body);
  return res.data;
}

// ─── ACSMS-SCR-004 — JAマスタ明細検索画面 ────────────────────────────

/**
 * Row shape returned by `GET /api/v1/ja` (ACSMS-API-004-001). Subset of
 * `JaDetail` per `docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md` §レスポンスデータ.
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

export interface JaListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface JaListResponse {
  data: JaListItem[];
  meta: JaListMeta;
}

/** Query-string DTO for `GET /api/v1/ja`. */
export interface ListJaQuery {
  ja_code?: string;
  ja_name?: string;
  /** m_todofuken.code (2 chars). Sourced from ACSMS-API-COMMON-001 dropdown. */
  todofuken_code?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** Response shape from `DELETE /api/v1/ja/:ja_id`. */
export interface JaDeleteResponse {
  message: string;
}

export async function listJa(query: ListJaQuery = {}): Promise<JaListResponse> {
  const res = await axiosInstance.get<JaListResponse>('/api/v1/ja', { params: query });
  return res.data;
}

export async function removeJa(jaId: number): Promise<JaDeleteResponse> {
  const res = await axiosInstance.delete<JaDeleteResponse>(`/api/v1/ja/${jaId}`);
  return res.data;
}

/** Slim row shape returned by `GET /api/v1/ja/dropdown` (ACSMS-API-COMMON-003). */
export interface JaDropdownItem {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  todofuken_code: string;
  chuokai_flg: boolean;
}

export interface JaDropdownResponse {
  data: JaDropdownItem[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
}

/** Query-string DTO for `GET /api/v1/ja/dropdown`. */
export interface JaDropdownQuery {
  /** Partial match on ja_code OR ja_name (ILIKE). */
  q?: string;
  page?: number;
  per_page?: number;
  /** Edit-form escape hatch — BE prepends this ja_id if not in page 1. */
  include_id?: number;
  /** Cascading filter — exact match on m_ja.todofuken_code. */
  todofuken_code?: string;
  /** Cascading filter — 3:chuokai_flg=TRUE, 4|5:chuokai_flg=FALSE. */
  role_id?: number;
}

export async function getJaDropdown(
  query: JaDropdownQuery = {},
): Promise<JaDropdownResponse> {
  const res = await axiosInstance.get<JaDropdownResponse>(
    '/api/v1/ja/dropdown',
    { params: query },
  );
  return res.data;
}

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
  bank_code: string;
  bank_name: string;
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

/** POST /api/v1/ja request body. */
export interface CreateJaRequest {
  ja_code: string;
  ja_name: string;
  ja_name_kana?: string;
  todofuken_code: string;
  chuokai_flg: boolean;
  bank_code: string;
  bank_name: string;
  yubin_no?: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
  tanto_busho?: string;
  tanto_name?: string;
  zei_kubun: string;
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

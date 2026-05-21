// Hand-written wrapper around /api/v1/oshirase admin endpoints (ACSMS-SCR-031).
// The /public list (SCR-001 login banner) lives separately; this module only
// covers the authenticated CRUD surface.

import axiosInstance from '@/api/axios-instance';

export interface OshiraseListItem {
  oshirase_id: number;
  ja_id: number | null;
  oshirase_type: number;
  oshirase_type_label: string;
  publish_location: number;
  publish_location_label: string;
  status: number;
  status_label: string;
  title: string;
  publish_start_date: string;
  publish_end_date: string | null;
  /**
   * Comma-separated 1〜5 codes; empty string = 全管理者 (all).
   *
   * Optional at the type level so legacy fixtures that pre-date this
   * column still satisfy the type — view template falls back to '全管理者'
   * via `??` when the field is undefined.
   */
  target_kanri_kubun?: string;
  created_at: string;
  updated_at: string;
}

export interface OshiraseDetail extends OshiraseListItem {
  content: string;
}

export interface OshiraseListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface OshiraseListResponse {
  data: OshiraseListItem[];
  meta: OshiraseListMeta;
}

export interface OshiraseDetailResponse {
  data: OshiraseDetail;
}

export interface OshiraseWriteResponse {
  data: OshiraseDetail;
  message: string;
}

export interface OshiraseDeleteResponse {
  message: string;
}

export interface ListOshiraseQuery {
  page?: number;
  per_page?: number;
  sort_by?: 'oshirase_id' | 'title' | 'status' | 'publish_location' | 'publish_start_date' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface CreateOshiraseBody {
  title: string;
  publish_location: number;
  status: number;
  publish_start_date: string;
  publish_end_date: string | null;
  ja_id: number | null;
  oshirase_type: number;
  target_kanri_kubun: string;
  content: string;
}

export type UpdateOshiraseBody = CreateOshiraseBody;

/** GET /api/v1/oshirase — ACSMS-API-031-001. */
export async function listOshirase(
  query: ListOshiraseQuery = {},
): Promise<OshiraseListResponse> {
  const res = await axiosInstance.get<OshiraseListResponse>('/api/v1/oshirase', {
    params: query,
  });
  return res.data;
}

// ─── ACSMS-API-010-001 — Menu screen list (authenticated, any role) ─────

export interface MenuOshiraseItem {
  oshirase_id: number;
  title: string;
  content: string;
  oshirase_type: number;
  oshirase_type_label: string;
  publish_start_date: string;
  publish_end_date: string | null;
  is_new: boolean;
  ja_id?: number | null;
}

export interface MenuOshiraseResponse {
  data: {
    oshirase_list: MenuOshiraseItem[];
    deadline_notice: MenuOshiraseItem | null;
  };
}

/** GET /api/v1/oshirase/menu — ACSMS-API-010-001. */
export async function getMenuOshirase(
  limit = 20,
): Promise<MenuOshiraseResponse> {
  const res = await axiosInstance.get<MenuOshiraseResponse>(
    '/api/v1/oshirase/menu',
    { params: { limit } },
  );
  return res.data;
}

/** GET /api/v1/oshirase/:id — ACSMS-API-031-002. */
export async function getOshirase(
  oshiraseId: number,
): Promise<OshiraseDetailResponse> {
  const res = await axiosInstance.get<OshiraseDetailResponse>(
    `/api/v1/oshirase/${oshiraseId}`,
  );
  return res.data;
}

/** POST /api/v1/oshirase — ACSMS-API-031-003. */
export async function createOshirase(
  body: CreateOshiraseBody,
): Promise<OshiraseWriteResponse> {
  const res = await axiosInstance.post<OshiraseWriteResponse>('/api/v1/oshirase', body);
  return res.data;
}

/** PATCH /api/v1/oshirase/:id — ACSMS-API-031-004. */
export async function updateOshirase(
  oshiraseId: number,
  body: UpdateOshiraseBody,
): Promise<OshiraseWriteResponse> {
  const res = await axiosInstance.patch<OshiraseWriteResponse>(
    `/api/v1/oshirase/${oshiraseId}`,
    body,
  );
  return res.data;
}

/** DELETE /api/v1/oshirase/:id — ACSMS-API-031-005. */
export async function removeOshirase(
  oshiraseId: number,
): Promise<OshiraseDeleteResponse> {
  const res = await axiosInstance.delete<OshiraseDeleteResponse>(
    `/api/v1/oshirase/${oshiraseId}`,
  );
  return res.data;
}

// /api/v1/oshirase の admin endpoint 用の手書き wrapper（ACSMS-SCR-031）。
// /public リスト（ACSMS-SCR-001 ログインバナー）は別モジュール。ここは認証済み CRUD のみ。

import axiosInstance from '@/api/axios-instance';

export interface OshiraseListItem {
  oshirase_id: number;
  ja_id: number | null;
  /**
   * BE の leftJoin（m_ja）で解決した ja_name。ja_id が null（= 全JA向け）または
   * 参照先 JA が物理削除済みの時は null。描画側は null を '全JA向け' に置換する。
   */
  ja_name: string | null;
  oshirase_type: number;
  publish_location: number;
  status: number;
  title: string;
  publish_start_date: string;
  publish_end_date: string | null;
  /**
   * カンマ区切りの 1〜5 コード。空文字 = 全管理者。
   *
   * この列より前の古い fixture も型を満たすよう型上は optional — view template は
   * 未定義時に `??` で '全管理者' にフォールバックする。
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

// ─── ACSMS-API-010-001 — メニュー画面リスト（認証済み・全ロール） ─────

// [no-labels-policy] ACSMS-SCR-010 メニューリストは認証済み — BE は
// `oshirase_type_label` を出さない。消費側は
// `useCodesStore().label('OSHIRASE_TYPE', oshirase_type)` で解決。
export interface MenuOshiraseItem {
  oshirase_id: number;
  title: string;
  content: string;
  oshirase_type: number;
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

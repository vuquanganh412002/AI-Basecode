// /api/v1/log 用の手書き wrapper（ACSMS-SCR-030）。
// docs/design/ACSMS-SCR-030/ACSMS-SCR-030-api.md に準拠。

import axiosInstance from '@/api/axios-instance';

// [no-labels-policy] 認証済み endpoint — プロジェクト規約により `log_type_label` /
// `result_status_label` はワイヤ契約から除外。消費側は
// `useCodesStore().label('LOG_TYPE'|'RESULT_STATUS', value)` で解決。
export interface LogListItem {
  log_id: number;
  log_type: number;
  log_datetime: string;
  account_id: number | null;
  login_id: string | null;
  account_name: string | null;
  ja_id: number | null;
  gamen_name: string;
  operation: string;
  result_status: number;
  target_id: number | null;
  target_table: string;
  after_value: string;
  ip_address: string;
}

export interface LogListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface LogListResponse {
  data: LogListItem[];
  meta: LogListMeta;
}

/** `GET /api/v1/log` のクエリDTO（ACSMS-API-030-001）。 */
export interface ListLogsQuery {
  date_from?: string;
  date_to?: string;
  log_type?: number;
  account_id?: number;
  page?: number;
  per_page?: number;
  sort_by?: 'log_datetime' | 'log_type' | 'result_status';
  sort_order?: 'asc' | 'desc';
}

/**
 * `GET /api/v1/log/export` のクエリDTO（ACSMS-API-030-002）。
 * リストクエリと同形 — 出力は全データではなく画面上のページ（フィルタ + ソート
 * + page + per_page）を反映する。
 */
export type ExportLogQuery = ListLogsQuery;

/** GET /api/v1/log — ACSMS-API-030-001. */
export async function listLogs(
  query: ListLogsQuery = {},
): Promise<LogListResponse> {
  const res = await axiosInstance.get<LogListResponse>('/api/v1/log', {
    params: query,
  });
  return res.data;
}

/** GET /api/v1/log/export — ACSMS-API-030-002. Returns a Blob for download. */
export async function exportLogCsv(
  query: ExportLogQuery = {},
): Promise<Blob> {
  const res = await axiosInstance.get<Blob>('/api/v1/log/export', {
    params: query,
    responseType: 'blob',
  });
  return res.data;
}

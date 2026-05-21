// Hand-written wrapper around the /api/v1/log endpoints (ACSMS-SCR-030).
// Mirrors docs/design/ACSMS-SCR-030/ACSMS-SCR-030-api.md.

import axiosInstance from '@/api/axios-instance';

export interface LogListItem {
  log_id: number;
  log_type: number;
  log_type_label: string;
  log_datetime: string;
  account_id: number | null;
  login_id: string | null;
  account_name: string | null;
  ja_id: number | null;
  gamen_name: string;
  operation: string;
  result_status: number;
  result_status_label: string;
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

/** Query DTO for `GET /api/v1/log` (ACSMS-API-030-001). */
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

/** Query DTO for `GET /api/v1/log/export` (ACSMS-API-030-002). */
export interface ExportLogQuery {
  date_from?: string;
  date_to?: string;
  log_type?: number;
  account_id?: number;
}

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

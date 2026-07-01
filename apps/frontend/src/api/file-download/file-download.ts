// Hand-written wrapper around the /api/v1/file-download endpoints
// (ACSMS-SCR-022 ファイルダウンロード画面). Data source = t_file_download.
// Mirrors docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md.

import axiosInstance from '@/api/axios-instance';

/** Row shape returned by `GET /api/v1/file-download`. */
export interface FileDownloadListItem {
  file_download_id: number;
  ja_id: number | null;
  ja_code: string | null;
  ja_name: string | null;
  download_datetime: string;
  download_type: number;
  file_name: string;
  file_size: number;
  record_count: number;
  target_month: string | null;
  scheduled_delete_date: string | null;
  nichino_download_allowed_flg: boolean;
  deleted_at: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string | null;
}

export interface FileDownloadListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface FileDownloadListResponse {
  data: FileDownloadListItem[];
  meta: FileDownloadListMeta;
}

export interface FilePreviewData {
  preview_url: string;
  file_name: string;
}

export interface FilePreviewResponse {
  data: FilePreviewData;
}

/** Query DTO for `GET /api/v1/file-download` (ACSMS-API-022-001). */
export interface ListFilesQuery {
  file_name?: string;
  todofuken_code?: string;
  ja_id?: number;
  download_type?: number;
  page?: number;
  per_page?: number;
  sort_by?: 'download_datetime' | 'file_name' | 'created_by' | 'file_size';
  sort_order?: 'asc' | 'desc';
}

/** GET /api/v1/file-download — ACSMS-API-022-001. */
export async function listFiles(
  query: ListFilesQuery = {},
): Promise<FileDownloadListResponse> {
  const res = await axiosInstance.get<FileDownloadListResponse>(
    '/api/v1/file-download',
    { params: query },
  );
  return res.data;
}

/** GET /api/v1/file-download/{id}/preview — ACSMS-API-022-002. */
export async function getFilePreview(
  fileDownloadId: number,
): Promise<FilePreviewResponse> {
  const res = await axiosInstance.get<FilePreviewResponse>(
    `/api/v1/file-download/${fileDownloadId}/preview`,
  );
  return res.data;
}

/** GET /api/v1/file-download/{id}/download — ACSMS-API-022-003.
 *  Returns a Blob (binary) so the caller can build an object URL + anchor
 *  click for the browser save dialog. */
export async function downloadFile(fileDownloadId: number): Promise<Blob> {
  const res = await axiosInstance.get<Blob>(
    `/api/v1/file-download/${fileDownloadId}/download`,
    { responseType: 'blob' },
  );
  return res.data;
}

/** POST /api/v1/file-download/download-zip — ACSMS-API-022-004.
 *  Bundles the selected files server-side into one ZIP. Returns the Blob
 *  plus the server-provided filename (一括ダウンロード_yyyyMMddHHmmss.zip). */
export async function downloadFilesAsZip(
  fileDownloadIds: number[],
): Promise<{ blob: Blob; filename: string }> {
  const res = await axiosInstance.post<Blob>(
    '/api/v1/file-download/download-zip',
    { file_download_ids: fileDownloadIds },
    { responseType: 'blob' },
  );
  const disposition = String(res.headers['content-disposition'] ?? '');
  return {
    blob: res.data,
    filename: parseContentDispositionFilename(disposition),
  };
}

/** Content-Disposition の filename*（UTF-8）→ 通常 filename の順で解決する。 */
function parseContentDispositionFilename(disposition: string): string {
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // Malformed percent-encoding — fall through to the ASCII form.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  if (plain?.[1]) return plain[1].trim();
  return 'download.zip';
}

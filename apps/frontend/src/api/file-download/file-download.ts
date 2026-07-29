// /api/v1/file-download 用の手書き wrapper
// （ACSMS-SCR-022 ファイルダウンロード画面）。データソース = t_file_download。
// docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md に準拠。

import axiosInstance from '@/api/axios-instance';
import { parseContentDispositionFilename } from '@/utils/download';

/** `GET /api/v1/file-download` の行の形。 */
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

/** `GET /api/v1/file-download` のクエリDTO（ACSMS-API-022-001）。 */
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

/** GET /api/v1/file-download/{id}/download — ACSMS-API-022-003。
 *  Blob（バイナリ）を返し、呼び出し元がオブジェクト URL + anchor クリックで
 *  ブラウザの保存ダイアログを出せるようにする。 */
export async function downloadFile(fileDownloadId: number): Promise<Blob> {
  const res = await axiosInstance.get<Blob>(
    `/api/v1/file-download/${fileDownloadId}/download`,
    { responseType: 'blob' },
  );
  return res.data;
}

/** POST /api/v1/file-download/download-zip — ACSMS-API-022-004。
 *  選択ファイルをサーバ側で1つの ZIP にまとめる。Blob + サーバ提供の
 *  ファイル名（一括ダウンロード_yyyyMMddHHmmss.zip）を返す。 */
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
    filename: parseContentDispositionFilename(disposition, 'download.zip'),
  };
}

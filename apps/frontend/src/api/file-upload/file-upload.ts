// Hand-written wrapper around the /api/v1/file-upload endpoints
// (ACSMS-SCR-022 ファイルダウンロード画面 + ACSMS-SCR-023 ファイルアップロード画面).
// Mirrors docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md +
//         docs/design/ACSMS-SCR-023/ACSMS-SCR-023-api.md.

import axiosInstance from '@/api/axios-instance';

/**
 * Row shape returned by `GET /api/v1/file-upload`.
 * SCR-023 extended SCR-022's payload with ja_code, ja_name,
 * notification_status, success_count, error_count,
 * scheduled_delete_date, error_file_path. SCR-022 callers receive
 * the extra fields but can ignore them — TypeScript ignores extra
 * properties at assignment.
 */
export interface FileUploadListItem {
  file_upload_id: number;
  ja_id: number | null;
  ja_code: string | null;
  ja_name: string | null;
  upload_datetime: string;
  file_name: string;
  file_size: number | null;
  record_count: number | null;
  success_count: number | null;
  error_count: number | null;
  status: number;
  notification_status: number;
  // SCR-023 §6.5 — worker stamps this when the row leaves 送信中 (2)
  // for 完了 (3) or 一部失敗 (4). NULL while the row is still 未送信
  // (1) or 送信中 (2).
  notified_at: string | null;
  scheduled_delete_date: string | null;
  error_file_path: string;
  // Soft-delete timestamp — present in the API response when the row
  // has been logically deleted (SCR-023 §画面項目定義 No.17 / 18).
  deleted_at?: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface FileUploadListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface FileUploadListResponse {
  data: FileUploadListItem[];
  meta: FileUploadListMeta;
}

export interface FilePreviewData {
  file_upload_id: number;
  file_name: string;
  file_size: number | null;
  content_type: string;
  preview_url: string;
  expires_at: string;
}

export interface FilePreviewResponse {
  data: FilePreviewData;
}

/** Query DTO for `GET /api/v1/file-upload` (ACSMS-API-022-001 / 023-001). */
export interface ListFilesQuery {
  file_name?: string;
  todofuken_code?: string;
  // SCR-023 filters
  ja_id?: number;
  status?: number;
  page?: number;
  per_page?: number;
  sort_by?: 'upload_datetime' | 'file_name' | 'created_by' | 'file_size';
  sort_order?: 'asc' | 'desc';
}

/** GET /api/v1/file-upload — ACSMS-API-022-001. */
export async function listFiles(
  query: ListFilesQuery = {},
): Promise<FileUploadListResponse> {
  const res = await axiosInstance.get<FileUploadListResponse>(
    '/api/v1/file-upload',
    { params: query },
  );
  return res.data;
}

/** GET /api/v1/file-upload/{id}/preview — ACSMS-API-022-002. */
export async function getFilePreview(
  fileUploadId: number,
): Promise<FilePreviewResponse> {
  const res = await axiosInstance.get<FilePreviewResponse>(
    `/api/v1/file-upload/${fileUploadId}/preview`,
  );
  return res.data;
}

/** GET /api/v1/file-upload/{id}/download — ACSMS-API-022-003.
 *  Returns a Blob (binary stream) so the caller can build an object URL
 *  + anchor click for the browser save dialog. */
export async function downloadFile(fileUploadId: number): Promise<Blob> {
  const res = await axiosInstance.get<Blob>(
    `/api/v1/file-upload/${fileUploadId}/download`,
    { responseType: 'blob' },
  );
  return res.data;
}

// ─── SCR-023 — POST + DELETE ──────────────────────────────────────────

export interface UploadedFileRow {
  file_upload_id: number;
  ja_id: number | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  status: number;
  notification_status: number;
  upload_datetime: string;
  scheduled_delete_date: string | null;
  error_file_path: string;
}

export interface UploadFilesResponse {
  data: UploadedFileRow[];
  message: string;
}

export interface UploadFilesArgs {
  ja_ids: number[];
  files: File[];
  /**
   * Scheduled-delete date (画面項目定義 No.7). Currently the BE infers
   * NOW()+180days; this field is passed so the FE retains the entered
   * value for the toast + audit log payload when the BE adds the
   * per-upload override in a follow-up.
   */
  scheduled_delete_date?: string;
}

/** POST /api/v1/file-upload — ACSMS-API-023-002 (multipart).
 *
 * [multipart-content-type] The shared axios instance pins
 * `Content-Type: application/json`. Passing FormData with that
 * header set would force axios to JSON-stringify the FormData iterator
 * — the BE then sees a plain object with the FormData keys
 * (`ja_ids[]`, `files`) as text properties on `req.body`, which trips
 * the global ValidationPipe's `forbidNonWhitelisted: true` with
 * `property files should not exist`. We bypass the instance default
 * via the `axios` named export (NOT the configured instance) and
 * inherit only `withCredentials` so the session cookie still travels.
 * The browser is responsible for the multipart boundary, which it
 * adds automatically when no Content-Type is set on a FormData body.
 */
export async function uploadFiles(args: UploadFilesArgs): Promise<UploadFilesResponse> {
  const form = new FormData();
  for (const id of args.ja_ids) {
    form.append('ja_ids[]', String(id));
  }
  for (const file of args.files) {
    form.append('files', file, file.name);
  }
  if (args.scheduled_delete_date) {
    form.append('scheduled_delete_date', args.scheduled_delete_date);
  }
  const res = await axiosInstance.post<UploadFilesResponse>(
    '/api/v1/file-upload',
    form,
    {
      // Replace (not merge) the headers — axios merges by default and
      // the instance-level `Content-Type: application/json` would
      // sneak back in. `transformRequest: x => x` short-circuits
      // axios's default JSON serializer so FormData passes through
      // raw, letting the browser set the multipart boundary.
      transformRequest: [(data) => data],
      headers: {
        // Setting Accept tells the BE we still expect JSON back.
        Accept: 'application/json',
      },
    },
  );
  return res.data;
}

export interface DeleteFileResponse {
  message: string;
}

/** DELETE /api/v1/file-upload/{id} — ACSMS-API-023-004. */
export async function deleteFile(fileUploadId: number): Promise<DeleteFileResponse> {
  const res = await axiosInstance.delete<DeleteFileResponse>(
    `/api/v1/file-upload/${fileUploadId}`,
  );
  return res.data;
}

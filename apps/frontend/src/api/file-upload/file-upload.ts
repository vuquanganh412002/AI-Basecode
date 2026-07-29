// /api/v1/file-upload 用の手書き wrapper
// （ACSMS-SCR-022 ファイルダウンロード画面 + ACSMS-SCR-023 ファイルアップロード画面）。
// docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md +
//   docs/design/ACSMS-SCR-023/ACSMS-SCR-023-api.md に準拠。

import axiosInstance from '@/api/axios-instance';
import { parseContentDispositionFilename } from '@/utils/download';

/**
 * `GET /api/v1/file-upload` の行の形。
 * SCR-023 が SCR-022 の payload に ja_code, ja_name, notification_status,
 * success_count, error_count, scheduled_delete_date, error_file_path を追加。
 * SCR-022 の呼び出し元は余分な項目を受け取っても無視できる（TS は代入時に
 * 余分なプロパティを無視する）。
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
  // SCR-023 §6.5 — 行が 送信中(2) から 完了(3) / 一部失敗(4) へ遷移する時に
  // worker が刻む。未送信(1) / 送信中(2) の間は NULL。
  notified_at: string | null;
  scheduled_delete_date: string | null;
  error_file_path: string;
  // 論理削除のタイムスタンプ — 行が論理削除済みの時に API レスポンスに含まれる
  // （SCR-023 §画面項目定義 No.17 / 18）。
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

/** `GET /api/v1/file-upload` のクエリDTO（ACSMS-API-022-001 / 023-001）。 */
export interface ListFilesQuery {
  file_name?: string;
  todofuken_code?: string;
  // SCR-023 のフィルタ
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
   * 削除予定日（画面項目定義 No.7）。現状 BE は NOW()+180days を推定するが、
   * 後続でアップロード毎の上書きを BE が追加した際にトースト + 監査ログ用に
   * 入力値を FE 側で保持するためこの項目を渡す。
   */
  scheduled_delete_date?: string;
}

/** POST /api/v1/file-upload — ACSMS-API-023-002（multipart）。
 *
 * [multipart-content-type] 共有 axios instance は `Content-Type:
 * application/json` を固定する。そのヘッダのまま FormData を渡すと axios が
 * FormData イテレータを JSON 化し、BE は `req.body` に FormData キー
 * （`ja_ids[]`, `files`）をテキストプロパティとして持つ素のオブジェクトを見て、
 * グローバル ValidationPipe の `forbidNonWhitelisted: true` が
 * `property files should not exist` で弾く。ここでは（設定済み instance ではなく）
 * `axios` named export を使って instance 既定を回避し、`withCredentials` のみ
 * 継承してセッション cookie を送る。multipart boundary はブラウザが担当し、
 * FormData body に Content-Type 未設定なら自動付与される。
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
      // ヘッダをマージではなく置換 — axios は既定でマージし instance の
      // `Content-Type: application/json` が復活してしまう。`transformRequest:
      // x => x` で axios 既定の JSON シリアライザを短絡し、FormData を生のまま
      // 通してブラウザに multipart boundary を設定させる。
      transformRequest: [(data) => data],
      headers: {
        // Accept を設定し BE には引き続き JSON を期待していると伝える。
        Accept: 'application/json',
      },
    },
  );
  return res.data;
}

export interface DeleteFileResponse {
  message: string;
}

/** DELETE /api/v1/file-upload/{id} — ACSMS-API-023-004。 */
export async function deleteFile(fileUploadId: number): Promise<DeleteFileResponse> {
  const res = await axiosInstance.delete<DeleteFileResponse>(
    `/api/v1/file-upload/${fileUploadId}`,
  );
  return res.data;
}

// ── プレビュー / ダウンロード（SCR-022 と同方式）──────────────────────

export interface FilePreviewResponse {
  data: { preview_url: string; file_name: string };
}

/** GET /api/v1/file-upload/{id}/preview — 署名付きプレビュー URL を取得。 */
export async function getFilePreview(
  fileUploadId: number,
): Promise<FilePreviewResponse> {
  const res = await axiosInstance.get<FilePreviewResponse>(
    `/api/v1/file-upload/${fileUploadId}/preview`,
  );
  return res.data;
}

/** GET /api/v1/file-upload/{id}/download — バイナリ(Blob)を取得。 */
export async function downloadFile(fileUploadId: number): Promise<Blob> {
  const res = await axiosInstance.get<Blob>(
    `/api/v1/file-upload/${fileUploadId}/download`,
    { responseType: 'blob' },
  );
  return res.data;
}

/** POST /api/v1/file-upload/download-zip — 複数選択を ZIP でまとめて取得。
 *  Blob + サーバ命名のファイル名（一括ダウンロード_yyyyMMddHHmmss.zip）を返す。 */
export async function downloadFilesAsZip(
  fileUploadIds: number[],
): Promise<{ blob: Blob; filename: string }> {
  const res = await axiosInstance.post<Blob>(
    '/api/v1/file-upload/download-zip',
    { file_upload_ids: fileUploadIds },
    { responseType: 'blob' },
  );
  const disposition = String(res.headers['content-disposition'] ?? '');
  return {
    blob: res.data,
    filename: parseContentDispositionFilename(disposition, 'download.zip'),
  };
}

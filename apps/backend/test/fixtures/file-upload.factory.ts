// Screen: ACSMS-SCR-022 — ファイルダウンロード画面
// Screen: ACSMS-SCR-023 — ファイルアップロード画面 (extends list row shape +
//                          adds an upload-request file fixture)
//
// Builders for t_file_upload + t_file_download rows used by SCR-022/023
// specs. Time-bearing fields use `new Date()` per skill rule (avoid
// hardcoded literals — they become flaky-by-calendar).

import type { FileUpload } from '@/database/entities/file-upload.entity';
import type { FileDownload } from '@/database/entities/file-download.entity';

export function buildFileUpload(
  overrides: Partial<FileUpload> = {},
): FileUpload {
  const now = new Date();
  return {
    fileUploadId: 101,
    jaId: 1,
    uploadDatetime: now,
    scheduledDeleteDate: null,
    fileName: 'zougen_tsuchi_202604.pdf',
    filePath: 'ja-1/2026/05/zougen_tsuchi_202604.pdf',
    fileSize: 524288,
    recordCount: 250,
    successCount: 250,
    errorCount: 0,
    status: 2,
    errorFilePath: '',
    deletedAt: null,
    createdAt: now,
    createdBy: 'admin01',
    notificationStatus: 3,
    ...overrides,
  } as unknown as FileUpload;
}

export function buildFileUploadList(
  n: number,
  overrides: Partial<FileUpload> = {},
): FileUpload[] {
  return Array.from({ length: n }, (_, i) =>
    buildFileUpload({
      fileUploadId: 100 + i,
      fileName: `file_${i}.pdf`,
      ...overrides,
    }),
  );
}

/**
 * Joined row shape returned by the list endpoint's raw SQL — includes
 * the LEFT-JOIN'd m_account.account_name and m_ja.ja_code/ja_name.
 * Service maps these to the api.md レスポンスデータ snake_case payload.
 *
 * SCR-023 extended SCR-022's shape with: ja_code, ja_name,
 * notification_status, success_count, error_count, scheduled_delete_date,
 * error_file_path. The base list endpoint returns all fields; SCR-022
 * specs only assert the subset they care about so adding fields is
 * backward-compatible.
 */
export interface FileUploadJoinedRow {
  file_upload_id: number;
  ja_id: number | null;
  ja_code: string | null;
  ja_name: string | null;
  upload_datetime: Date;
  file_name: string;
  file_size: number | null;
  record_count: number | null;
  success_count: number | null;
  error_count: number | null;
  status: number;
  notification_status: number;
  scheduled_delete_date: Date | string | null;
  deleted_at: Date | string | null;
  error_file_path: string;
  created_by: string;
  created_by_name: string;
  created_at: Date;
}

export function buildJoinedFileUploadRow(
  overrides: Partial<FileUploadJoinedRow> = {},
): FileUploadJoinedRow {
  const now = new Date();
  return {
    file_upload_id: 101,
    ja_id: 1,
    ja_code: '12345',
    ja_name: 'JA農業中央',
    upload_datetime: now,
    file_name: 'zougen_tsuchi_202604.pdf',
    file_size: 524288,
    record_count: 250,
    success_count: 250,
    error_count: 0,
    status: 2,
    notification_status: 3,
    scheduled_delete_date: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
    deleted_at: null,
    error_file_path: '',
    created_by: 'admin01',
    created_by_name: '日農 管理者',
    created_at: now,
    ...overrides,
  };
}

// ─── SCR-023 — multipart upload request fixtures ─────────────────────

/**
 * Multer-style uploaded file shape — matches Express.Multer.File. Used
 * by the upload service spec to feed `service.upload(ja_ids, files, ...)`
 * without depending on the real multer pipeline.
 */
export interface UploadedFileFixture {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export function buildUploadedFile(
  overrides: Partial<UploadedFileFixture> = {},
): UploadedFileFixture {
  const buffer = overrides.buffer ?? Buffer.from('mock,csv,bytes\n1,2,3\n');
  return {
    fieldname: 'files',
    originalname: '令和5年度_購読者リスト.csv',
    encoding: '7bit',
    mimetype: 'text/csv',
    buffer,
    size: buffer.length,
    ...overrides,
  };
}

export function buildFileDownload(
  overrides: Partial<FileDownload> = {},
): FileDownload {
  const now = new Date();
  return {
    fileDownloadId: 1,
    jaId: 1,
    downloadDatetime: now,
    downloadType: 4,
    fileName: 'zougen_tsuchi_202604.pdf',
    filePath: 'ja-1/2026/05/zougen_tsuchi_202604.pdf',
    fileSize: 524288,
    recordCount: 250,
    targetMonth: '202604',
    createdAt: now,
    createdBy: 'admin01',
    ...overrides,
  } as unknown as FileDownload;
}

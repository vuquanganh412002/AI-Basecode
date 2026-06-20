// Test fixtures for ACSMS-SCR-022 (ファイルダウンロード画面).
// Shapes mirror docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md レスポンスデータ.
//
// [scr-023-contract-evolution] SCR-023 extended the shared GET
// /api/v1/file-upload endpoint with ja_code, ja_name, success_count,
// error_count, notification_status, scheduled_delete_date,
// error_file_path. This fixture's `FileUploadListItem` matches the
// canonical type in `@/api/file-upload/file-upload` so SCR-022 specs
// still type-check against the evolved API client. SCR-022 tests assert
// only the SCR-022 subset, so adding fields is backward-compatible.

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
  notified_at: string | null;
  scheduled_delete_date: string | null;
  error_file_path: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  deleted_at?: string | null;
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

export interface FilePreviewResponse {
  data: {
    file_upload_id: number;
    file_name: string;
    file_size: number | null;
    content_type: string;
    preview_url: string;
    expires_at: string;
  };
}

/** Single list row builder. */
export function buildFileUploadItem(
  overrides: Partial<FileUploadListItem> = {},
): FileUploadListItem {
  return {
    file_upload_id: 101,
    ja_id: 1,
    ja_code: '00001',
    ja_name: 'JA農業中央',
    upload_datetime: '2026-05-07T10:30:00+09:00',
    file_name: 'zougen_tsuchi_202604.pdf',
    file_size: 524288,
    record_count: 250,
    success_count: 250,
    error_count: 0,
    status: 2,
    notification_status: 3,
    notified_at: '2026-05-07T10:35:00+09:00',
    scheduled_delete_date: '2026-11-03T10:30:00+09:00',
    error_file_path: '',
    created_by: 'nichino_admin01',
    created_by_name: '日農 管理者',
    created_at: '2026-05-07T10:30:00+09:00',
    deleted_at: null,
    ...overrides,
  };
}

/** Default 2-row paginated response (matches api.md §レスポンス成功例). */
export function buildFileUploadListResponse(
  overrides: Partial<FileUploadListResponse> = {},
): FileUploadListResponse {
  const rows = overrides.data ?? [
    buildFileUploadItem({
      file_upload_id: 101,
      ja_id: 1,
      file_name: 'zougen_tsuchi_202604.pdf',
      file_size: 524288,
      created_by: 'nichino_admin01',
      created_by_name: '日農 管理者',
    }),
    buildFileUploadItem({
      file_upload_id: 102,
      ja_id: null,
      upload_datetime: '2026-05-06T15:00:00+09:00',
      file_name: 'kouza_furikae_20260506.csv',
      file_size: 102400,
      record_count: 80,
      created_by: 'nichino_staff02',
      created_by_name: '日農 担当者',
      created_at: '2026-05-06T15:00:00+09:00',
    }),
  ];
  return {
    data: rows,
    meta: overrides.meta ?? {
      total: rows.length,
      page: 1,
      per_page: 20,
      total_pages: 1,
    },
  };
}

/** Preview API response (API-022-002). */
export function buildFilePreviewResponse(
  overrides: Partial<FilePreviewResponse['data']> = {},
): FilePreviewResponse {
  return {
    data: {
      file_upload_id: 101,
      file_name: 'zougen_tsuchi_202604.pdf',
      file_size: 524288,
      content_type: 'application/pdf',
      preview_url:
        'https://s3.ap-northeast-1.amazonaws.com/agrinews-prod-files/ja-1/zougen_tsuchi_202604.pdf?X-Amz-Signature=mocked',
      expires_at: '2026-05-07T11:30:00+09:00',
      ...overrides,
    },
  };
}

// ─── Todofuken dropdown (ACSMS-API-COMMON-001) ─────────────────────────

export interface TodofukenDropdownItem {
  todofuken_code: string;
  todofuken_name: string;
}

export interface TodofukenDropdownResponse {
  data: TodofukenDropdownItem[];
}

export function buildTodofukenList(): TodofukenDropdownItem[] {
  return [
    { todofuken_code: '13', todofuken_name: '東京都' },
    { todofuken_code: '14', todofuken_name: '神奈川県' },
    { todofuken_code: '01', todofuken_name: '北海道' },
  ];
}

export function buildTodofukenResponse(): TodofukenDropdownResponse {
  return { data: buildTodofukenList() };
}

// ─── Auth user with file.download ──────────────────────────────────────

export function buildFileDownloadUser(
  overrides: Record<string, unknown> = {},
) {
  return {
    account_id: 1,
    login_id: 'admin01',
    account_name: '管理者太郎',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    role_name: '日農（管理者）',
    ja_id: null,
    kanri_shiten_id: null,
    todofuken_code: null,
    paper_flg: false,
    denshi_flg: false,
    email: 'admin@nichino.co.jp',
    mfa_enable_flg: false,
    permissions: ['file.download'],
    ...overrides,
  };
}

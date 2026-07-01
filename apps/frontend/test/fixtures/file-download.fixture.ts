// Test fixtures for ACSMS-SCR-022 (ファイルダウンロード画面).
// Data source = t_file_download. Shapes mirror
// docs/design/ACSMS-SCR-022/ACSMS-SCR-022-api.md レスポンスデータ and the
// canonical type in `@/api/file-download/file-download`.

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

export interface FilePreviewResponse {
  data: {
    preview_url: string;
    file_name: string;
  };
}

/** Single list row builder. */
export function buildFileDownloadItem(
  overrides: Partial<FileDownloadListItem> = {},
): FileDownloadListItem {
  return {
    file_download_id: 101,
    ja_id: 1,
    ja_code: '00001',
    ja_name: 'JA農業中央',
    download_datetime: '2026-05-07T10:30:00+09:00',
    download_type: 4,
    file_name: 'zougen_tsuchi_202604.pdf',
    file_size: 524288,
    record_count: 250,
    target_month: '202604',
    scheduled_delete_date: '2026-11-03T10:30:00+09:00',
    nichino_download_allowed_flg: true,
    deleted_at: null,
    created_by: 'nichino_admin01',
    created_by_name: '日農 管理者',
    created_at: '2026-05-07T10:30:00+09:00',
    ...overrides,
  };
}

/** Default 2-row paginated response（api.md §レスポンス成功例）。 */
export function buildFileDownloadListResponse(
  overrides: Partial<FileDownloadListResponse> = {},
): FileDownloadListResponse {
  const rows = overrides.data ?? [
    buildFileDownloadItem({
      file_download_id: 101,
      ja_id: 1,
      download_type: 4,
      file_name: 'zougen_tsuchi_202604.pdf',
      file_size: 524288,
      created_by: 'nichino_admin01',
      created_by_name: '日農 管理者',
    }),
    buildFileDownloadItem({
      file_download_id: 102,
      ja_id: null,
      download_datetime: '2026-05-06T15:00:00+09:00',
      download_type: 1,
      file_name: 'kouza_furikae_20260506.csv',
      file_size: 102400,
      record_count: 80,
      target_month: '202605',
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
      preview_url:
        'https://s3.ap-northeast-1.amazonaws.com/agrinews-prod-files/ja-1/zougen_tsuchi_202604.pdf?X-Amz-Signature=mocked',
      file_name: 'zougen_tsuchi_202604.pdf',
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

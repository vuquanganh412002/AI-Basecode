// Test fixtures for ACSMS-SCR-023 (ファイルアップロード画面).
// Shapes mirror docs/design/ACSMS-SCR-023/ACSMS-SCR-023-api.md レスポンスデータ.

export interface FileUploadHistoryItem {
  file_upload_id: number;
  ja_id: number | null;
  ja_code: string | null;
  ja_name: string | null;
  file_name: string;
  file_size: number | null;
  status: number;
  notification_status: number;
  record_count: number | null;
  success_count: number | null;
  error_count: number | null;
  upload_datetime: string;
  scheduled_delete_date: string | null;
  error_file_path: string;
}

export interface FileUploadHistoryMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface FileUploadHistoryResponse {
  data: FileUploadHistoryItem[];
  meta: FileUploadHistoryMeta;
}

export function buildFileUploadHistoryItem(
  overrides: Partial<FileUploadHistoryItem> = {},
): FileUploadHistoryItem {
  return {
    file_upload_id: 101,
    ja_id: 12345,
    ja_code: '12345',
    ja_name: 'JA農業中央',
    file_name: '令和5年度_購読者リスト.csv',
    file_size: 2831155,
    status: 2,
    notification_status: 3,
    record_count: 1024,
    success_count: 1020,
    error_count: 4,
    upload_datetime: '2026-04-04T10:30:00+09:00',
    scheduled_delete_date: '2026-10-04T00:00:00+09:00',
    error_file_path: '',
    ...overrides,
  };
}

export function buildFileUploadHistoryResponse(
  overrides: Partial<FileUploadHistoryResponse> = {},
): FileUploadHistoryResponse {
  const rows = overrides.data ?? [
    buildFileUploadHistoryItem({
      file_upload_id: 101,
      file_name: '令和5年度_購読者リスト.csv',
      status: 2,
      notification_status: 3,
    }),
    buildFileUploadHistoryItem({
      file_upload_id: 102,
      ja_id: 67890,
      ja_code: '67890',
      ja_name: 'JA農業',
      file_name: '農業中央_購読者リスト.csv',
      status: 1,
      notification_status: 2,
      record_count: null,
      success_count: null,
      error_count: null,
      upload_datetime: '2026-05-10T08:15:00+09:00',
      scheduled_delete_date: null,
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

// ─── POST upload response (HTTP 202) ──────────────────────────────────

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

export function buildUploadedFileRow(
  overrides: Partial<UploadedFileRow> = {},
): UploadedFileRow {
  return {
    file_upload_id: 201,
    ja_id: 12345,
    file_name: '令和5年度_購読者リスト.csv',
    file_path: 'ja-12345/files/a1b2c3d4-令和5年度_購読者リスト.csv',
    file_size: 2831155,
    status: 1,
    notification_status: 1,
    upload_datetime: '2026-05-15T10:30:00+09:00',
    scheduled_delete_date: '2026-11-11T00:00:00+09:00',
    error_file_path: '',
    ...overrides,
  };
}

export function buildUploadFilesResponse(
  overrides: Partial<UploadFilesResponse> = {},
): UploadFilesResponse {
  return {
    data: overrides.data ?? [
      buildUploadedFileRow({ file_upload_id: 201, ja_id: 12345 }),
      buildUploadedFileRow({
        file_upload_id: 202,
        ja_id: 67890,
        file_path: 'ja-67890/files/e5f6g7h8-令和5年度_購読者リスト.csv',
      }),
    ],
    message:
      overrides.message ??
      'アップロードを受け付けました。通知メールはバックグラウンドで送信されます。',
  };
}

// ─── JA dropdown (COMMON-003) — minimal shape FileUploadView uses ──

export interface JaDropdownFixtureItem {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  todofuken_code: string;
  chuokai_flg: boolean;
}

export function buildJaDropdownList(): JaDropdownFixtureItem[] {
  return [
    {
      ja_id: 12345,
      ja_code: '12345',
      ja_name: 'JA農業中央',
      todofuken_code: '13',
      chuokai_flg: false,
    },
    {
      ja_id: 67890,
      ja_code: '67890',
      ja_name: 'JA農業',
      todofuken_code: '13',
      chuokai_flg: false,
    },
  ];
}

export function buildJaDropdownResponse(): {
  data: JaDropdownFixtureItem[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
} {
  const rows = buildJaDropdownList();
  return {
    data: rows,
    meta: { total: rows.length, page: 1, per_page: 100, has_more: false },
  };
}

// ─── Todofuken dropdown (COMMON-001) ───────────────────────────────

export interface TodofukenDropdownItem {
  todofuken_code: string;
  todofuken_name: string;
}

export function buildTodofukenList(): TodofukenDropdownItem[] {
  return [
    { todofuken_code: '01', todofuken_name: '北海道' },
    { todofuken_code: '13', todofuken_name: '東京都' },
    { todofuken_code: '14', todofuken_name: '神奈川県' },
  ];
}

export function buildTodofukenResponse(): {
  data: TodofukenDropdownItem[];
} {
  return { data: buildTodofukenList() };
}

// ─── Auth user with file.upload ────────────────────────────────────

export function buildFileUploadUser(
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
    permissions: ['file.upload', 'file.download'],
    ...overrides,
  };
}

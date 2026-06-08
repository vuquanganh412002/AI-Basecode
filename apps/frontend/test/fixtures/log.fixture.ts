// Test fixtures for ACSMS-SCR-030 (ログ参照画面).
// Shapes mirror docs/design/ACSMS-SCR-030/ACSMS-SCR-030-api.md レスポンスデータ.

// Re-export production dropdown types so consumers can keep importing
// from this fixture file, but the shape definition stays in one place
// (any future field added to AccountDropdownItem trips the type-checker
// here on next run, instead of silently going stale).
import type {
  AccountDropdownItem,
  AccountDropdownResponse,
} from '@/api/account/account';
export type { AccountDropdownItem, AccountDropdownResponse };

// Fixture mirrors the FE wire contract — `log_type_label` /
// `result_status_label` were removed per the no-labels policy.
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

/** Single row builder. */
export function buildLogListItem(
  overrides: Partial<LogListItem> = {},
): LogListItem {
  return {
    log_id: 10500,
    log_type: 1,
    log_datetime: '2026/04/17 14:30:45',
    account_id: 10,
    login_id: 'ja_honten_001',
    account_name: 'JA本店 太郎',
    ja_id: 100,
    gamen_name: '単価マスタ登録画面 (ACSMS-SCR-003)',
    operation: 'CREATE',
    result_status: 1,
    target_id: 50,
    target_table: 'm_tanka',
    after_value: '{"tanka_id":50,"tanka_code":"T050","tanka_name":"新単価"}',
    ip_address: '192.168.1.100',
    ...overrides,
  };
}

/** Default 2-row paginated response (matches api.md §レスポンス成功例). */
export function buildLogListResponse(
  overrides: Partial<LogListResponse> = {},
): LogListResponse {
  const rows = overrides.data ?? [
    buildLogListItem({
      log_id: 10500,
      log_type: 1,
      log_datetime: '2026/04/17 14:30:45',
      result_status: 1,
    }),
    buildLogListItem({
      log_id: 10499,
      log_type: 3,
      log_datetime: '2026/04/17 14:25:10',
      gamen_name: '購読者情報登録画面 (ACSMS-SCR-005)',
      operation: 'CREATE',
      result_status: 2,
      target_id: null,
      target_table: 't_dokusya',
      after_value: '',
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

// ─── Account dropdown (COMMON-005) ──────────────────────────────────
// Types re-exported from production at the top of this file — keep the
// production interface as the single source of truth.

export function buildAccountDropdownList(): AccountDropdownItem[] {
  return [
    {
      account_id: 10,
      login_id: 'ja_honten_001',
      account_name: 'JA本店 太郎',
      role_code: 'JA_HONTEN',
      ja_id: 100,
    },
    {
      account_id: 11,
      login_id: 'ja_shiten_001',
      account_name: '管理支店A 花子',
      role_code: 'JA_KANRI_SHITEN',
      ja_id: 100,
    },
  ];
}

export function buildAccountDropdownResponse(): AccountDropdownResponse {
  const data = buildAccountDropdownList();
  return {
    data,
    meta: { total: data.length, page: 1, per_page: 50, has_more: false },
  };
}

// ─── Auth user with log.view ────────────────────────────────────────

export function buildLogUser(overrides: Record<string, unknown> = {}) {
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
    permissions: ['log.view'],
    ...overrides,
  };
}

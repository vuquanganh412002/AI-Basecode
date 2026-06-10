// Screen: ACSMS-SCR-030 — ログ参照画面
//
// Fixture builders for the joined log-row shape that
// `LogService.getLogList` returns (after LEFT JOIN with m_account — see
// api.md §4.5) and the canonical search-query / CSV-export-query bodies.

import type { Log } from '@/database/entities/log.entity';

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

export function buildLogListItem(
  overrides: Partial<LogListItem> = {},
): LogListItem {
  return {
    log_id: 10500,
    log_type: 1,
    log_type_label: 'ユーザー操作',
    log_datetime: '2026/04/17 14:30:45',
    account_id: 10,
    login_id: 'ja_honten_001',
    account_name: 'JA本店 太郎',
    ja_id: 100,
    gamen_name: '単価マスタ登録画面 (ACSMS-SCR-003)',
    operation: 'CREATE',
    result_status: 1,
    result_status_label: '成功',
    target_id: 50,
    target_table: 'm_tanka',
    after_value: '{"tanka_id":50,"tanka_code":"T050","tanka_name":"新単価"}',
    ip_address: '192.168.1.100',
  };
}

/** Default 2-row list (matches api.md §レスポンス成功例). */
export function buildLogListItems(): LogListItem[] {
  return [
    buildLogListItem({
      log_id: 10500,
      log_type: 1,
      log_type_label: 'ユーザー操作',
      log_datetime: '2026/04/17 14:30:45',
      result_status: 1,
      result_status_label: '成功',
    }),
    buildLogListItem({
      log_id: 10499,
      log_type: 3,
      log_type_label: 'エラー',
      log_datetime: '2026/04/17 14:25:10',
      gamen_name: '購読者情報登録画面 (ACSMS-SCR-005)',
      operation: 'CREATE',
      result_status: 2,
      result_status_label: '失敗',
      target_id: null,
      target_table: 't_dokusya',
      after_value: '',
    }),
  ];
}

/** Builder for raw `t_log` entity rows (camelCase, used by service spec mocks). */
export function buildLogEntity(overrides: Partial<Log> = {}): Log {
  return {
    logId: 10500,
    logType: 1,
    logDatetime: new Date('2026-04-17T05:30:45Z'),
    accountId: 10,
    jaId: 100,
    gamenName: '単価マスタ登録画面 (ACSMS-SCR-003)',
    operation: 'CREATE',
    resultStatus: 1,
    targetId: 50,
    targetTable: 'm_tanka',
    beforeValue: '',
    afterValue: '{"tanka_id":50}',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    errorMessage: '',
    stackTrace: '',
    ...overrides,
  } as unknown as Log;
}

/** Canonical valid search query for happy-path assertions. */
export function buildSearchLogQuery(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    date_from: '2026/04/01 00:00:00',
    date_to: '2026/04/17 23:59:59',
    log_type: 1,
    account_id: 10,
    page: 1,
    per_page: 20,
    sort_by: 'log_datetime',
    sort_order: 'desc',
    ...overrides,
  };
}

/** Canonical valid export query (no pagination fields). */
export function buildExportLogQuery(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    date_from: '2026/04/01 00:00:00',
    date_to: '2026/04/17 23:59:59',
    log_type: 1,
    account_id: 10,
    ...overrides,
  };
}

// ─── Account Dropdown (COMMON-005) ───────────────────────────────────

export interface AccountDropdownItem {
  account_id: number;
  login_id: string;
  account_name: string;
  role_code: string;
  ja_id: number | null;
}

export function buildAccountDropdownItem(
  overrides: Partial<AccountDropdownItem> = {},
): AccountDropdownItem {
  return {
    account_id: 10,
    login_id: 'ja_honten_001',
    account_name: 'JA本店 太郎',
    role_code: 'JA_HONTEN',
    ja_id: 100,
    ...overrides,
  };
}

export function buildAccountDropdownItems(): AccountDropdownItem[] {
  return [
    buildAccountDropdownItem({
      account_id: 10,
      login_id: 'ja_honten_001',
      account_name: 'JA本店 太郎',
      role_code: 'JA_HONTEN',
      ja_id: 100,
    }),
    buildAccountDropdownItem({
      account_id: 11,
      login_id: 'ja_shiten_001',
      account_name: '管理支店A 花子',
      role_code: 'JA_KANRI_SHITEN',
      ja_id: 100,
    }),
  ];
}

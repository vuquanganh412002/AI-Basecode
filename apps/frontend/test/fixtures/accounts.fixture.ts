// Test fixtures for ACSMS-SCR-024 (アカウントマスタ明細検索画面).
// Shapes mirror docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md レスポンスデータ.

export interface AccountListItem {
  account_id: number;
  login_id: string;
  account_name: string;
  role_id: number;
  role_name: string;
  todofuken_code: string | null;
  todofuken_name: string | null;
  ja_id: number | null;
  ja_name: string | null;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  account_lock_flg: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface AccountListMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AccountListResponse {
  data: AccountListItem[];
  meta: AccountListMeta;
}

/** Single row builder for SCR-024 list assertions. */
export function buildAccountListItem(
  overrides: Partial<AccountListItem> = {},
): AccountListItem {
  return {
    account_id: 1,
    login_id: 'admin001',
    account_name: '管理者 太郎',
    role_id: 1,
    role_name: '日農（管理者）',
    todofuken_code: null,
    todofuken_name: null,
    ja_id: null,
    ja_name: null,
    kanri_shiten_id: null,
    kanri_shiten_name: null,
    email: 'admin001@example.com',
    sub_email_1: '',
    sub_email_2: '',
    sub_email_3: '',
    paper_flg: true,
    denshi_flg: false,
    account_lock_flg: false,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/** Default 2-row paginated response (matches api.md §レスポンス成功例). */
export function buildAccountListResponse(
  overrides: Partial<AccountListResponse> = {},
): AccountListResponse {
  const rows = overrides.data ?? [
    buildAccountListItem({
      account_id: 1,
      login_id: 'admin001',
      account_name: '管理者 太郎',
      role_id: 1,
      role_name: '日農（管理者）',
    }),
    buildAccountListItem({
      account_id: 2,
      login_id: 'ja_honten001',
      account_name: 'JA本店 花子',
      role_id: 4,
      role_name: 'JA本店',
      todofuken_code: '13',
      todofuken_name: '東京都',
      ja_id: 10,
      ja_name: 'JA東京中央',
      paper_flg: true,
      denshi_flg: true,
      created_at: '2026-02-01T09:00:00Z',
      updated_at: '2026-03-15T11:00:00Z',
    }),
  ];
  return {
    data: rows,
    meta: {
      total: overrides.meta?.total ?? rows.length,
      page: overrides.meta?.page ?? 1,
      per_page: overrides.meta?.per_page ?? 20,
      total_pages:
        overrides.meta?.total_pages ??
        Math.max(1, Math.ceil((overrides.meta?.total ?? rows.length) / 20)),
    },
  };
}

// ─── Dropdown fixtures (COMMON-002 roles / COMMON-003 ja / COMMON-004 kanri-shiten) ──

export interface RoleDropdownItem {
  role_id: number;
  role_code: string;
  role_name: string;
}

export interface JaDropdownItem {
  ja_id: number;
  ja_code: string;
  ja_name: string;
  todofuken_code: string;
  chuokai_flg: boolean;
}

export interface JaDropdownResponse {
  data: JaDropdownItem[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
}

export interface KanriShitenDropdownItem {
  kanri_shiten_id: number;
  kanri_shiten_code: string;
  kanri_shiten_name: string;
}

export function buildRoleDropdownList(): RoleDropdownItem[] {
  return [
    { role_id: 1, role_code: 'NICHINO_ADMIN', role_name: '日農（管理者）' },
    { role_id: 2, role_code: 'NICHINO_STAFF', role_name: '日農（担当者）' },
    { role_id: 3, role_code: 'CHUOKAI', role_name: '中央会' },
    { role_id: 4, role_code: 'JA_HONTEN', role_name: 'JA本店' },
    { role_id: 5, role_code: 'JA_KANRI_SHITEN', role_name: 'JA管理支店' },
  ];
}

export function buildJaDropdownResponse(
  overrides: Partial<JaDropdownResponse> = {},
): JaDropdownResponse {
  const rows = overrides.data ?? [
    {
      ja_id: 10,
      ja_code: '1301001001',
      ja_name: 'JA東京中央',
      todofuken_code: '13',
      chuokai_flg: false,
    },
    {
      ja_id: 11,
      ja_code: '1301002001',
      ja_name: 'JA東京みなみ',
      todofuken_code: '13',
      chuokai_flg: false,
    },
  ];
  return {
    data: rows,
    meta: {
      total: overrides.meta?.total ?? rows.length,
      page: overrides.meta?.page ?? 1,
      per_page: overrides.meta?.per_page ?? 50,
      has_more: overrides.meta?.has_more ?? false,
    },
  };
}

export function buildKanriShitenDropdownList(): KanriShitenDropdownItem[] {
  return [
    { kanri_shiten_id: 20, kanri_shiten_code: '113-5001-001', kanri_shiten_name: 'JA東京中央 本店管理支店' },
    { kanri_shiten_id: 21, kanri_shiten_code: '113-5001-002', kanri_shiten_name: 'JA東京中央 渋谷管理支店' },
  ];
}

// ─── Auth user fixture ─────────────────────────────────────────────

/**
 * NICHINO_ADMIN — the only role that can reach SCR-024 per
 * screen-design.md 機能定義 1.2 "日農管理者のみアクセス可能".
 * Override `role_code` to model the access-denied path.
 */
export function buildAuthUser(overrides: Record<string, unknown> = {}) {
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
    permissions: ['account.view', 'account.delete', 'account.create', 'account.update'],
    ...overrides,
  };
}

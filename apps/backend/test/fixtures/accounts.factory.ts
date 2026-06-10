// Screen: ACSMS-SCR-024 — アカウントマスタ明細検索画面
//
// Fixture builders for the joined account-row shape that
// `AccountsService.searchAccounts` returns (after LEFT JOIN with
// m_roles / m_todofuken / m_ja / m_kanri_shiten — see api.md §4.5)
// and the body of `AccountsService.deleteAccount` audit-log
// before_value snapshot.

import type { Account } from '@/database/entities/account.entity';

export interface AccountListRow {
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
  paper_flg: boolean;
  denshi_flg: boolean;
  created_at: string;
  updated_at: string | null;
}

export function buildAccountListRow(
  overrides: Partial<AccountListRow> = {},
): AccountListRow {
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
    paper_flg: true,
    denshi_flg: false,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
    ...overrides,
  };
}

/** Default 2-row admin + JA本店 list (matches api.md §レスポンス成功例). */
export function buildAccountListRows(): AccountListRow[] {
  return [
    buildAccountListRow({
      account_id: 1,
      login_id: 'admin001',
      account_name: '管理者 太郎',
      role_id: 1,
      role_name: '日農（管理者）',
    }),
    buildAccountListRow({
      account_id: 2,
      login_id: 'ja_honten001',
      account_name: 'JA本店 花子',
      role_id: 4,
      role_name: 'JA本店',
      todofuken_code: '13',
      todofuken_name: '東京都',
      ja_id: 10,
      ja_name: 'JA東京中央',
      kanri_shiten_id: null,
      kanri_shiten_name: null,
      paper_flg: true,
      denshi_flg: true,
      created_at: '2026-02-01T09:00:00Z',
      updated_at: '2026-03-15T11:00:00Z',
    }),
  ];
}

/** Builder used as the `repo.findOne` return for DELETE existence check. */
export function buildAccountEntity(overrides: Partial<Account> = {}): Account {
  const now = new Date();
  return {
    accountId: 5,
    loginId: 'ja_shiten001',
    passwordHash: '$2a$10$dummyhash',
    accountName: 'JA管理支店 次郎',
    roleId: 5,
    jaId: 10,
    kanriShitenId: 20,
    todofukenCode: '13',
    paperFlg: true,
    denshiFlg: false,
    email: 'shiten001@example.com',
    subEmail1: '',
    subEmail2: '',
    subEmail3: '',
    passwordUpdatedAt: null,
    lastLoginAt: null,
    loginFailureCount: 0,
    accountLockFlg: false,
    accountLockAt: null,
    biko: '',
    mfaEnableFlg: false,
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Account;
}

/** Canonical valid search query string for happy-path assertions. */
export function buildSearchAccountsQuery(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    login_id: 'admin',
    role_id: 1,
    page: 1,
    per_page: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
    ...overrides,
  };
}

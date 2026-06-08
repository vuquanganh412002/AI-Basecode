// Screen: ACSMS-SCR-025 — アカウントマスタ登録画面
//
// Fixture builders for the account detail/create/update flow shared
// between the SCR-025 service / controller / integration specs.

import type { Account } from '@/database/entities/account.entity';

/** Joined detail row shape returned by API-025-001. */
export interface AccountDetailResponse {
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
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export function buildAccountDetailResponse(
  overrides: Partial<AccountDetailResponse> = {},
): AccountDetailResponse {
  return {
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
    email: 'honten001@example.com',
    sub_email_1: 'honten001.sub1@example.com',
    sub_email_2: '',
    sub_email_3: '',
    paper_flg: true,
    denshi_flg: true,
    biko: '',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-03-15T11:00:00Z',
    ...overrides,
  };
}

/** Entity-shape row used as `repo.findOne` return for create/update existence checks. */
export function buildAccountEntity(overrides: Partial<Account> = {}): Account {
  const now = new Date();
  return {
    accountId: 2,
    loginId: 'ja_honten001',
    passwordHash: '$2a$10$dummyhash',
    accountName: 'JA本店 花子',
    roleId: 4,
    jaId: 10,
    kanriShitenId: null,
    todofukenCode: '13',
    paperFlg: true,
    denshiFlg: true,
    email: 'honten001@example.com',
    subEmail1: 'honten001.sub1@example.com',
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

/** Canonical valid CREATE body per api.md §リクエスト例. */
export function buildCreateAccountBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    login_id: 'ja_honten001',
    password: 'Password123!',
    role_id: 4,
    todofuken_code: '13',
    ja_id: 10,
    kanri_shiten_id: null,
    account_name: 'JA本店 花子',
    email: 'honten001@example.com',
    sub_email_1: 'honten001.sub1@example.com',
    sub_email_2: '',
    sub_email_3: '',
    paper_flg: true,
    denshi_flg: true,
    biko: '',
    ...overrides,
  };
}

/** Canonical valid UPDATE body per api.md §リクエスト例 (password blank → no-op). */
export function buildUpdateAccountBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    password: '',
    role_id: 4,
    todofuken_code: '13',
    ja_id: 10,
    kanri_shiten_id: null,
    account_name: 'JA本店 花子（更新）',
    email: 'honten001_new@example.com',
    sub_email_1: 'honten001.sub1_new@example.com',
    sub_email_2: 'manager@example.com',
    sub_email_3: '',
    paper_flg: true,
    denshi_flg: true,
    biko: '備考を追加しました',
    ...overrides,
  };
}

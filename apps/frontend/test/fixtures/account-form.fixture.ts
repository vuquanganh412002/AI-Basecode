// Test fixtures for ACSMS-SCR-025 (アカウントマスタ登録画面).
// Shapes mirror docs/design/ACSMS-SCR-025/ACSMS-SCR-025-api.md.

export interface AccountDetail {
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
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateAccountForm {
  login_id: string;
  password: string;
  role_id: number;
  todofuken_code: string | null;
  ja_id: number | null;
  kanri_shiten_id: number | null;
  account_name: string;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  biko: string;
}

export interface UpdateAccountForm {
  password: string;
  role_id: number;
  todofuken_code: string | null;
  ja_id: number | null;
  kanri_shiten_id: number | null;
  account_name: string;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  biko: string;
}

/** Default detail response (JA本店 with sub_email_1 set) for edit-mode mounts. */
export function buildAccountDetail(
  overrides: Partial<AccountDetail> = {},
): AccountDetail {
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
    account_lock_flg: false,
    biko: '',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-03-15T11:00:00Z',
    ...overrides,
  };
}

/** Canonical valid CREATE body. */
export function buildCreateAccountForm(
  overrides: Partial<CreateAccountForm> = {},
): CreateAccountForm {
  return {
    login_id: 'ja_honten_new',
    password: 'Password123!',
    role_id: 4,
    todofuken_code: '13',
    ja_id: 10,
    kanri_shiten_id: null,
    account_name: 'JA本店 新規',
    email: 'new@example.com',
    sub_email_1: '',
    sub_email_2: '',
    sub_email_3: '',
    paper_flg: true,
    denshi_flg: true,
    biko: '',
    ...overrides,
  };
}

/** Canonical valid UPDATE body (password blank = keep existing). */
export function buildUpdateAccountForm(
  overrides: Partial<UpdateAccountForm> = {},
): UpdateAccountForm {
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

// ─── Todofuken dropdown (COMMON-001) ───────────────────────────────

export interface TodofukenItem {
  todofuken_code: string;
  todofuken_name: string;
}

export function buildTodofukenList(): TodofukenItem[] {
  return [
    { todofuken_code: '01', todofuken_name: '北海道' },
    { todofuken_code: '13', todofuken_name: '東京都' },
    { todofuken_code: '27', todofuken_name: '大阪府' },
    { todofuken_code: '47', todofuken_name: '沖縄県' },
  ];
}

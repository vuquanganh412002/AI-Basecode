// Hand-written wrapper around the /api/v1/accounts endpoints.
// Functions here are what SCR-024 (AccountsListView) imports and what its
// unit spec mocks via vi.mock('@/api/account/account').
// Shapes mirror docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md.

import axiosInstance from '@/api/axios-instance';

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
  /** True when login attempts hit the lock threshold. SCR-024 list shows a ロック badge; SCR-025 edit form lets admin clear it. */
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

/** Query DTO for `GET /api/v1/accounts` (ACSMS-API-024-001). */
export interface ListAccountsQuery {
  login_id?: string;
  role_id?: number;
  ja_id?: number;
  kanri_shiten_id?: number;
  page?: number;
  per_page?: number;
  sort_by?: 'login_id' | 'account_name' | 'role_name' | 'todofuken_code' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

/** Response shape from `DELETE /api/v1/accounts/:account_id`. */
export interface AccountDeleteResponse {
  message: string;
}

/** GET /api/v1/accounts — ACSMS-API-024-001. */
export async function listAccounts(
  query: ListAccountsQuery = {},
): Promise<AccountListResponse> {
  const res = await axiosInstance.get<AccountListResponse>('/api/v1/accounts', {
    params: query,
  });
  return res.data;
}

/** DELETE /api/v1/accounts/:account_id — ACSMS-API-024-002. */
export async function removeAccount(
  accountId: number,
): Promise<AccountDeleteResponse> {
  const res = await axiosInstance.delete<AccountDeleteResponse>(
    `/api/v1/accounts/${accountId}`,
  );
  return res.data;
}

// ─── SCR-025 — アカウントマスタ登録画面 ───────────────────────────────

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
  /** True while the account is locked (login_failure_count ≥ threshold). */
  account_lock_flg: boolean;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateAccountBody {
  login_id: string;
  password: string;
  role_id: number;
  todofuken_code?: string | null;
  ja_id?: number | null;
  kanri_shiten_id?: number | null;
  account_name: string;
  email?: string;
  sub_email_1?: string;
  sub_email_2?: string;
  sub_email_3?: string;
  paper_flg?: boolean;
  denshi_flg?: boolean;
  biko?: string;
}

export interface UpdateAccountBody {
  password?: string;
  role_id: number;
  todofuken_code?: string | null;
  ja_id?: number | null;
  kanri_shiten_id?: number | null;
  account_name: string;
  email?: string;
  sub_email_1?: string;
  sub_email_2?: string;
  sub_email_3?: string;
  paper_flg?: boolean;
  denshi_flg?: boolean;
  /** Sending `false` triggers BE to reset login_failure_count to 0 (unlock). Omit to leave unchanged. */
  account_lock_flg?: boolean;
  biko?: string;
}

export interface AccountDetailResponse {
  data: AccountDetail;
}

export interface AccountWriteResponse {
  data: AccountDetail;
  message: string;
}

/** GET /api/v1/accounts/:account_id — ACSMS-API-025-001. */
export async function getAccount(accountId: number): Promise<AccountDetailResponse> {
  const res = await axiosInstance.get<AccountDetailResponse>(
    `/api/v1/accounts/${accountId}`,
  );
  return res.data;
}

/** POST /api/v1/accounts — ACSMS-API-025-002. */
export async function createAccount(
  body: CreateAccountBody,
): Promise<AccountWriteResponse> {
  const res = await axiosInstance.post<AccountWriteResponse>('/api/v1/accounts', body);
  return res.data;
}

/** PUT /api/v1/accounts/:account_id — ACSMS-API-025-003. */
export async function updateAccount(
  accountId: number,
  body: UpdateAccountBody,
): Promise<AccountWriteResponse> {
  const res = await axiosInstance.put<AccountWriteResponse>(
    `/api/v1/accounts/${accountId}`,
    body,
  );
  return res.data;
}

// ─── ACSMS-API-COMMON-005 — Account dropdown (defined alongside SCR-030) ──

export interface AccountDropdownItem {
  account_id: number;
  login_id: string;
  account_name: string;
  role_code: string;
  ja_id: number | null;
}

export interface AccountDropdownResponse {
  data: AccountDropdownItem[];
  meta: { total: number; page: number; per_page: number; has_more: boolean };
}

/** Query-string DTO for `GET /api/v1/account/dropdown`. */
export interface AccountDropdownQuery {
  /** Partial match on login_id OR account_name (ILIKE) — see `match_field`. */
  q?: string;
  /**
   * 'both' (default) = login_id OR account_name; 'name' = account_name only.
   * SCR-030 log view uses 'name' since its field label is just ユーザ名.
   */
  match_field?: 'both' | 'name';
  page?: number;
  per_page?: number;
  /** Edit-form escape hatch — BE prepends this account_id if not in page 1. */
  include_id?: number;
}

/** GET /api/v1/account/dropdown — ACSMS-API-COMMON-005. */
export async function listAccountDropdown(
  query: AccountDropdownQuery = {},
): Promise<AccountDropdownResponse> {
  const res = await axiosInstance.get<AccountDropdownResponse>(
    '/api/v1/account/dropdown',
    { params: query },
  );
  return res.data;
}

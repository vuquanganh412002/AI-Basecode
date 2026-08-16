// /api/v1/accounts 用の手書き wrapper。
// ACSMS-SCR-024 (AccountsListView) が import し、unit spec が
// vi.mock('@/api/account/account') でモックする関数群。
// 型は docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md に準拠。

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
  shiten_id: number | null;
  shiten_name: string | null;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  /** ログイン試行がロック閾値に達すると true。ACSMS-SCR-024 一覧は ロック バッジ表示、ACSMS-SCR-025 編集で admin が解除可。 */
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

/** `GET /api/v1/accounts` のクエリDTO（ACSMS-API-024-001）。 */
export interface ListAccountsQuery {
  login_id?: string;
  role_id?: number;
  todofuken_code?: string;
  ja_id?: number;
  kanri_shiten_id?: number;
  shiten_id?: number;
  page?: number;
  per_page?: number;
  sort_by?:
    | 'login_id'
    | 'account_name'
    | 'role_name'
    | 'todofuken_code'
    | 'created_at'
    | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/** `DELETE /api/v1/accounts/:account_id` のレスポンス形。 */
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
  shiten_id: number | null;
  shiten_name: string | null;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  /** アカウントがロック中の間 true（login_failure_count ≥ 閾値）。 */
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
  shiten_id?: number | null;
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
  shiten_id?: number | null;
  account_name: string;
  email?: string;
  sub_email_1?: string;
  sub_email_2?: string;
  sub_email_3?: string;
  paper_flg?: boolean;
  denshi_flg?: boolean;
  /** `false` を送ると BE が login_failure_count を 0 にリセット（ロック解除）。省略時は変更なし。 */
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

// ─── ACSMS-API-COMMON-005 — アカウント dropdown（SCR-030 と併せて定義） ──

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

/** `GET /api/v1/account/dropdown` のクエリDTO。 */
export interface AccountDropdownQuery {
  /** login_id OR account_name の部分一致（ILIKE）。`match_field` 参照。 */
  q?: string;
  /**
   * 'both'（既定）= login_id OR account_name、'name' = account_name のみ。
   * SCR-030 ログ画面は項目ラベルが ユーザ名 のみなので 'name' を使用。
   */
  match_field?: 'both' | 'name';
  page?: number;
  per_page?: number;
  /** 編集フォーム用の抜け道 — page 1 に無い場合 BE がこの account_id を先頭に付加。 */
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

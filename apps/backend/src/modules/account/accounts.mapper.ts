// Pure transform from the joined account-row (LEFT JOIN m_account x m_roles
// x m_todofuken x m_ja x m_kanri_shiten — see SCR-024 api.md §4.5) into the
// snake_case response shape the FE consumes. No Nest DI, no repository —
// importable from anywhere (service, tests).

import { toIso, toNumber } from '@/common/utils/mapper-helpers';

export interface AccountSearchRow {
  /** Raw row returned by the QueryBuilder.getRawMany() result. */
  account_id: number | string;
  login_id: string;
  account_name: string;
  role_id: number | string;
  role_name: string;
  todofuken_code: string | null;
  todofuken_name: string | null;
  ja_id: number | string | null;
  ja_name: string | null;
  kanri_shiten_id: number | string | null;
  kanri_shiten_name: string | null;
  shiten_id: number | string | null;
  shiten_name: string | null;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  account_lock_flg: boolean;
  created_at: Date | string;
  updated_at: Date | string | null;
}

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
  /** True when login attempts hit the lock threshold — admin can clear it from SCR-025 edit form. */
  account_lock_flg: boolean;
  created_at: string;
  updated_at: string | null;
}

// `toIso` / `toNumber` moved to `@/common/utils/mapper-helpers`.

/** Map a raw joined row → API list item per SCR-024 api.md §レスポンスデータ. */
export function toAccountListItem(row: AccountSearchRow): AccountListItem {
  return {
    account_id: Number(row.account_id),
    login_id: row.login_id,
    account_name: row.account_name,
    role_id: Number(row.role_id),
    role_name: row.role_name,
    todofuken_code: row.todofuken_code ?? null,
    todofuken_name: row.todofuken_name ?? null,
    ja_id: toNumber(row.ja_id),
    ja_name: row.ja_name ?? null,
    kanri_shiten_id: toNumber(row.kanri_shiten_id),
    kanri_shiten_name: row.kanri_shiten_name ?? null,
    shiten_id: toNumber(row.shiten_id),
    shiten_name: row.shiten_name ?? null,
    email: row.email ?? '',
    sub_email_1: row.sub_email_1 ?? '',
    sub_email_2: row.sub_email_2 ?? '',
    sub_email_3: row.sub_email_3 ?? '',
    paper_flg: Boolean(row.paper_flg),
    denshi_flg: Boolean(row.denshi_flg),
    account_lock_flg: Boolean(row.account_lock_flg),
    created_at: toIso(row.created_at) ?? '',
    updated_at: toIso(row.updated_at),
  };
}

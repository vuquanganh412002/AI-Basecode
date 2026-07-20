// Pure transform from the joined m_account row (LEFT JOIN m_roles x
// m_todofuken x m_ja x m_kanri_shiten — see SCR-025 api.md §4.3 / §4.5)
// into the snake_case detail-response shape. No Nest DI, no repo —
// importable from anywhere (service, tests).

import { toIso, toNumber } from '@/common/utils/mapper-helpers';

// Raw DB id columns arrive as number or string depending on the pg driver /
// aggregation. Aliased to avoid repeating the union across every id field.
type IdRaw = number | string;
type IdRawNullable = number | string | null;

export interface AccountDetailRow {
  account_id: IdRaw;
  login_id: string;
  account_name: string;
  role_id: IdRaw;
  role_name: string;
  todofuken_code: string | null;
  todofuken_name: string | null;
  ja_id: IdRawNullable;
  ja_name: string | null;
  kanri_shiten_id: IdRawNullable;
  kanri_shiten_name: string | null;
  shiten_id: IdRawNullable;
  shiten_name: string | null;
  email: string;
  sub_email_1: string;
  sub_email_2: string;
  sub_email_3: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  account_lock_flg: boolean;
  biko: string;
  created_at: Date | string;
  updated_at: Date | string | null;
}

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
  /** True when login attempts hit the lock threshold — surfaced so the admin form can clear it. */
  account_lock_flg: boolean;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

// `toIso` / `toNumber` moved to `@/common/utils/mapper-helpers` — see
// import at top of file.

/** Map a raw joined row → SCR-025 detail-response shape. */
export function toAccountDetail(row: AccountDetailRow): AccountDetail {
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
    biko: row.biko ?? '',
    created_at: toIso(row.created_at) ?? '',
    updated_at: toIso(row.updated_at),
  };
}

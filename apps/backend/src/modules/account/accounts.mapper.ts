// join 済み account 行（m_account × m_roles × m_todofuken × m_ja × m_kanri_shiten,
// ACSMS-SCR-024 api.md §4.5）→ FE 用 snake_case 応答形状への純粋変換。Nest DI / repo 不要で
// どこからでも import 可（service, tests）。

import { toIso, toNumber } from '@/common/utils/mapper-helpers';

type IdRaw = number | string;
type IdRawNullable = number | string | null;

export interface AccountSearchRow {
  /** Raw row returned by the QueryBuilder.getRawMany() result. */
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
  /** ログイン失敗がロック閾値に達すると true。admin が ACSMS-SCR-025 編集フォームで解除可。 */
  account_lock_flg: boolean;
  created_at: string;
  updated_at: string | null;
}

// `toIso` / `toNumber` moved to `@/common/utils/mapper-helpers`.

/** join 行 → ACSMS-SCR-024 api.md §レスポンスデータ の一覧アイテムへ変換。 */
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

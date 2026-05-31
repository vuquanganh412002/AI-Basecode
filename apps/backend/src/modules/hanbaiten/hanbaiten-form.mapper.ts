// Pure transform from the raw joined m_hanbaiten row (SELECT * + ISO
// dates per SCR-017 api.md §4.3) into the snake_case detail-response
// shape returned by GET/POST/PUT endpoints. No Nest DI, no repo —
// importable from anywhere (service, tests).

import { toIso, toNumber } from '@/common/utils/mapper-helpers';

/** Numeric column coming from pg as number-or-string, nullable. */
type NumOrStringNull = number | string | null;

/**
 * Raw row shape produced by HanbaitenService.buildDetailQuery(...).
 * Numeric BIGINT / NUMERIC columns may come back as string from pg
 * even when the entity declares `number`; coerce in the mapper so the
 * response JSON keeps the contract.
 */
export interface HanbaitenDetailRow {
  hanbaiten_id: number | string;
  ja_id: number | string;
  hanbaiten_code: string;
  hanbaiten_name: string;
  hanbaiten_name_kana: string | null;
  torihikisaki_no: string | null;
  todofuken_code: string | null;
  yubin_no: string | null;
  address: string | null;
  tel: string | null;
  fax: string | null;
  shocho_name: string | null;
  itaku_kubun: NumOrStringNull;
  haitatsuryo_tanka_id: NumOrStringNull;
  haitatsuryo_shiharai_cycle: NumOrStringNull;
  tesuryo_kubun: NumOrStringNull;
  tesuryo_amount: NumOrStringNull;
  bank_code: string | null;
  bank_name: string | null;
  bank_branch_code: string | null;
  bank_branch_name: string | null;
  yokin_shubetsu: NumOrStringNull;
  koza_no: string | null;
  koza_meigi: string | null;
  haiten_flg: boolean;
  biko: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

/** Snake-cased detail-response shape (mirrors api.md §3). */
export interface HanbaitenDetailResponse {
  hanbaiten_id: number;
  ja_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  hanbaiten_name_kana: string;
  torihikisaki_no: string;
  todofuken_code: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  shocho_name: string;
  itaku_kubun: number | null;
  haitatsuryo_tanka_id: number | null;
  haitatsuryo_shiharai_cycle: number | null;
  tesuryo_kubun: number | null;
  tesuryo_amount: number | null;
  bank_code: string;
  bank_name: string;
  bank_branch_code: string;
  bank_branch_name: string;
  yokin_shubetsu: number | null;
  koza_no: string;
  koza_meigi: string;
  haiten_flg: boolean;
  biko: string;
  created_at: string;
  updated_at: string | null;
}

// `toIso` / `toNumber` moved to `@/common/utils/mapper-helpers`.

/**
 * Map a raw joined row → SCR-017 detail-response shape. NOT NULL columns
 * surface as `""` when the source is null (project policy — see
 * `.claude/rules/nestjs.md §Nullable field serialization`). Nullable
 * columns surface as `null`.
 */
export function toHanbaitenDetail(
  row: HanbaitenDetailRow,
): HanbaitenDetailResponse {
  return {
    hanbaiten_id: Number(row.hanbaiten_id),
    ja_id: Number(row.ja_id),
    hanbaiten_code: row.hanbaiten_code ?? '',
    hanbaiten_name: row.hanbaiten_name ?? '',
    hanbaiten_name_kana: row.hanbaiten_name_kana ?? '',
    torihikisaki_no: row.torihikisaki_no ?? '',
    todofuken_code: row.todofuken_code ?? '',
    yubin_no: row.yubin_no ?? '',
    address: row.address ?? '',
    tel: row.tel ?? '',
    fax: row.fax ?? '',
    shocho_name: row.shocho_name ?? '',
    itaku_kubun: toNumber(row.itaku_kubun),
    haitatsuryo_tanka_id: toNumber(row.haitatsuryo_tanka_id),
    haitatsuryo_shiharai_cycle: toNumber(row.haitatsuryo_shiharai_cycle),
    tesuryo_kubun: toNumber(row.tesuryo_kubun),
    tesuryo_amount: toNumber(row.tesuryo_amount),
    bank_code: row.bank_code ?? '',
    bank_name: row.bank_name ?? '',
    bank_branch_code: row.bank_branch_code ?? '',
    bank_branch_name: row.bank_branch_name ?? '',
    yokin_shubetsu: toNumber(row.yokin_shubetsu),
    koza_no: row.koza_no ?? '',
    koza_meigi: row.koza_meigi ?? '',
    haiten_flg: Boolean(row.haiten_flg),
    biko: row.biko ?? '',
    created_at: toIso(row.created_at) ?? '',
    updated_at: toIso(row.updated_at),
  };
}

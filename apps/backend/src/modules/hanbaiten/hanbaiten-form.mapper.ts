// 結合済みの m_hanbaiten raw 行（SELECT * + ISO 日付・ACSMS-SCR-017 api.md §4.3）を、
// GET/POST/PUT が返す snake_case 詳細レスポンス形へ変換する純関数。Nest DI /
// repo を持たず、service からもテストからも import できる。

import { toIso, toNumber } from '@/common/utils/mapper-helpers';

/** pg から number/string で届く数値列（NULL 許容）。 */
type NumOrStringNull = number | string | null;

/**
 * HanbaitenService.buildDetailQuery(...) が返す raw 行の形。BIGINT / NUMERIC 列は
 * エンティティが `number` 宣言でも pg が string で返す場合があるため、mapper 側で
 * 数値化してレスポンス JSON の契約を保つ。
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
  furikomi_tesuryo_futan_kubun: NumOrStringNull;
  furikomi_tesuryo: NumOrStringNull;
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

/** snake_case 詳細レスポンス形（api.md §3 準拠）。 */
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
  furikomi_tesuryo_futan_kubun: number | null;
  furikomi_tesuryo: number | null;
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

// `toIso` / `toNumber` は `@/common/utils/mapper-helpers` へ移動。

/**
 * 結合済み raw 行 → ACSMS-SCR-017 詳細レスポンス形へ変換。NOT NULL 列は元が null なら
 * `""`、NULL 許容列は `null` を返す（プロジェクト方針・
 * `.claude/rules/nestjs.md §Nullable field serialization`）。
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
    furikomi_tesuryo_futan_kubun: toNumber(row.furikomi_tesuryo_futan_kubun),
    furikomi_tesuryo: toNumber(row.furikomi_tesuryo),
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

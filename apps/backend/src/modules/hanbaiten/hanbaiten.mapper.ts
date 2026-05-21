import { Hanbaiten } from '@/database/entities/hanbaiten.entity';

/**
 * Snake-cased list-row shape returned by `GET /api/v1/hanbaiten`.
 * Defined inline (rather than as a separate `*-response.dto.ts`) because
 * SCR-018 only emits this one response shape — the future SCR-017
 * detail / create / update endpoints will own their own DTO file.
 *
 * `tesuryo_amount` and `haitatsuryo_tanka_id` are NUMERIC / BIGINT in
 * Postgres; TypeORM surfaces them as `string` even though the entity
 * declares `number`. The mapper coerces both back to `number` (or
 * `null`) so the API response keeps the JSON shape promised by the
 * spec.
 */
export interface HanbaitenListItem {
  hanbaiten_id: number;
  ja_id: number;
  hanbaiten_code: string;
  hanbaiten_name: string;
  todofuken_code: string;
  todofuken_name: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  shocho_name: string;
  itaku_kubun: number | null;
  haitatsuryo_shiharai_cycle: number | null;
  tesuryo_kubun: number | null;
  tesuryo_amount: number | null;
  haiten_flg: boolean;
  created_at: string;
  updated_at: string | null;
}

function coerceNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * Map a `Hanbaiten` entity (camelCase columns) to the snake_case
 * list-row shape the API returns. Caller passes the resolved
 * `todofuken_name` (batch-looked-up after the main query) so this
 * mapper stays pure — no Nest DI, no IO.
 *
 * Pure-fn convention matches `ShitenService.findAll` →
 * `toShitenListItem` (see `src/modules/shiten/shiten.mapper.ts`).
 */
export function toHanbaitenListItem(
  row: Hanbaiten,
  todofukenName: string,
): HanbaitenListItem {
  return {
    hanbaiten_id: Number(row.hanbaitenId),
    ja_id: Number(row.jaId),
    hanbaiten_code: row.hanbaitenCode,
    hanbaiten_name: row.hanbaitenName,
    todofuken_code: row.todofukenCode,
    todofuken_name: todofukenName,
    yubin_no: row.yubinNo,
    address: row.address,
    tel: row.tel,
    fax: row.fax,
    shocho_name: row.shochoName,
    itaku_kubun: coerceNullableNumber(row.itakuKubun),
    haitatsuryo_shiharai_cycle: coerceNullableNumber(row.haitatsuryoShiharaiCycle),
    tesuryo_kubun: coerceNullableNumber(row.tesuryoKubun),
    tesuryo_amount: coerceNullableNumber(row.tesuryoAmount),
    haiten_flg: Boolean(row.haitenFlg),
    created_at: row.createdAt ? row.createdAt.toISOString() : '',
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

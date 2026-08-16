import { Hanbaiten } from '@/database/entities/hanbaiten.entity';

/**
 * `GET /api/v1/hanbaiten` が返す snake_case 一覧行の形。ACSMS-SCR-018 はこの1形のみ
 * 返すため別 `*-response.dto.ts` にせずインライン定義（ACSMS-SCR-017 の詳細/作成/更新は
 * 各自の DTO ファイルを持つ予定）。
 *
 * `furikomi_tesuryo` / `haitatsuryo_tanka_id` は Postgres の NUMERIC / BIGINT で、
 * エンティティが `number` 宣言でも TypeORM は `string` で返す。mapper で `number`
 * （または `null`）へ戻し、spec の JSON 形を保つ。
 */
export interface HanbaitenListItem {
  hanbaiten_id: number;
  ja_id: number;
  /** m_ja.ja_code から結合（本クエリ後に一括ルックアップ）。 */
  ja_code: string;
  /** m_ja.ja_name から結合（本クエリ後に一括ルックアップ）。 */
  ja_name: string;
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
  furikomi_tesuryo_futan_kubun: number | null;
  furikomi_tesuryo: number | null;
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
 * `Hanbaiten` エンティティ（camelCase 列）を API が返す snake_case 一覧行へ変換。
 * 解決済みの `todofuken_name`（本クエリ後に一括ルックアップ）は呼出側が渡すため、
 * mapper は純関数のまま（Nest DI / IO なし）。
 *
 * 純関数の方針は `ShitenService.findAll` → `toShitenListItem`
 * （`src/modules/shiten/shiten.mapper.ts`）に一致。
 */
export function toHanbaitenListItem(
  row: Hanbaiten,
  todofukenName: string,
  jaCode = '',
  jaName = '',
): HanbaitenListItem {
  return {
    hanbaiten_id: Number(row.hanbaitenId),
    ja_id: Number(row.jaId),
    ja_code: jaCode,
    ja_name: jaName,
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
    furikomi_tesuryo_futan_kubun: coerceNullableNumber(row.furikomiTesuryoFutanKubun),
    furikomi_tesuryo: coerceNullableNumber(row.furikomiTesuryo),
    haiten_flg: Boolean(row.haitenFlg),
    created_at: row.createdAt ? row.createdAt.toISOString() : '',
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

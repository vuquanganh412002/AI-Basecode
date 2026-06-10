import { Shiten } from '@/database/entities/shiten.entity';
import { ShitenDetailDto } from './dto/shiten-detail.dto';
import { ShitenListItemDto } from './dto/shiten-list-item.dto';

/**
 * Map a `Shiten` entity (camelCase columns) to the snake_case
 * `ShitenDetailDto` shape the API returns.
 *
 * Pure: no Nest DI, no IO. Service calls `toShitenDetail(saved)` after
 * the INSERT/UPDATE/SELECT to project camelCase → snake_case.
 */
export function toShitenDetail(shiten: Shiten): ShitenDetailDto {
  return {
    shiten_id: Number(shiten.shitenId),
    ja_id: Number(shiten.jaId),
    shiten_code: shiten.shitenCode,
    shiten_name: shiten.shitenName,
    shiten_name_kana: shiten.shitenNameKana,
    kinyu_shiten_flg: shiten.kinyuShitenFlg,
    // JASTEM 店舗単位 4 列 (NOT NULL DEFAULT '' — never returns null;
    // `?? ''` guards legacy rows where TypeORM might return undefined
    // for a column not present in older entity hydrates).
    jastem_toriatsukai_tenpo_code: shiten.jastemToriatsukaiTenpoCode ?? '',
    jastem_tenpo_name: shiten.jastemTenpoName ?? '',
    jastem_tyokin_shubetsu: shiten.jastemTyokinShubetsu ?? '',
    jastem_koza_no: shiten.jastemKozaNo ?? '',
    kanri_shiten_id: Number(shiten.kanriShitenId),
    biko: shiten.biko,
    created_at: shiten.createdAt ? shiten.createdAt.toISOString() : '',
    updated_at: shiten.updatedAt ? shiten.updatedAt.toISOString() : null,
  };
}

/**
 * List-row mapping for SCR-006 GET /api/v1/shiten. Same columns as
 * `ShitenDetailDto` PLUS `kanri_shiten_name` joined from
 * `m_kanri_shiten` by the service. Caller passes the resolved name
 * (batch-looked-up after the main query) so this mapper stays pure.
 */
export function toShitenListItem(
  shiten: Shiten,
  kanriShitenName: string,
): ShitenListItemDto {
  return {
    ...toShitenDetail(shiten),
    kanri_shiten_name: kanriShitenName,
  };
}

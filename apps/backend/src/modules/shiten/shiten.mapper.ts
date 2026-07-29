import { Shiten } from '@/database/entities/shiten.entity';
import { ShitenDetailDto } from './dto/shiten-detail.dto';
import { ShitenListItemDto } from './dto/shiten-list-item.dto';

/**
 * Shiten エンティティ (camelCase) → API 応答 ShitenDetailDto (snake_case)。
 * 純粋関数（Nest DI/IO なし）。service が INSERT/UPDATE/SELECT 後に呼ぶ。
 */
export function toShitenDetail(shiten: Shiten): ShitenDetailDto {
  return {
    shiten_id: Number(shiten.shitenId),
    ja_id: Number(shiten.jaId),
    shiten_code: shiten.shitenCode,
    shiten_name: shiten.shitenName,
    shiten_name_kana: shiten.shitenNameKana,
    kinyu_shiten_flg: shiten.kinyuShitenFlg,
    // JASTEM 店舗単位 4 列 (NOT NULL DEFAULT '')。?? '' は旧エンティティ
    // hydrate で列が undefined になる場合のガード。
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
 * SCR-006 GET /api/v1/shiten の list 行。ShitenDetailDto の列 +
 * kanri_shiten_name（service が m_kanri_shiten から解決した名前を渡す）。
 * mapper は純粋を保つ。
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

import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { KanriShitenListItemDto } from './dto/kanri-shiten-list-item.dto';
import { KanriShitenDetailDto } from './dto/kanri-shiten-detail.dto';

/**
 * Map a `KanriShiten` entity (camelCase columns) to the snake_case
 * `KanriShitenListItemDto` shape the API returns.
 *
 * `todofukenName` is hydrated separately by the service (batch lookup
 * against `m_todofuken`) — keeps the entity unbound from the prefecture
 * lookup table. Pure: no Nest DI, no IO.
 */
export function toKanriShitenListItem(
  ks: KanriShiten,
  todofukenName: string,
  jaName: string,
): KanriShitenListItemDto {
  return {
    kanri_shiten_id: Number(ks.kanriShitenId),
    ja_id: Number(ks.jaId),
    ja_name: jaName,
    kanri_shiten_code: ks.kanriShitenCode,
    kanri_shiten_name: ks.kanriShitenName,
    yubin_no: ks.yubinNo,
    todofuken_code: ks.todofukenCode,
    todofuken_name: todofukenName,
    address: ks.address,
    tel: ks.tel,
    fax: ks.fax,
    paper_flg: ks.paperFlg,
    denshi_flg: ks.denshiFlg,
  };
}

/**
 * Full detail mapping for SCR-009 endpoints (GET by id / POST create /
 * PUT update). Adds the columns the list endpoint elides (kana, biko,
 * created_at, updated_at).
 */
export function toKanriShitenDetail(
  ks: KanriShiten,
  todofukenName: string,
  jaName: string,
): KanriShitenDetailDto {
  return {
    kanri_shiten_id: Number(ks.kanriShitenId),
    ja_id: Number(ks.jaId),
    ja_name: jaName,
    kanri_shiten_code: ks.kanriShitenCode,
    kanri_shiten_name: ks.kanriShitenName,
    kanri_shiten_name_kana: ks.kanriShitenNameKana,
    todofuken_code: ks.todofukenCode,
    todofuken_name: todofukenName,
    yubin_no: ks.yubinNo,
    address: ks.address,
    tel: ks.tel,
    fax: ks.fax,
    paper_flg: ks.paperFlg,
    denshi_flg: ks.denshiFlg,
    biko: ks.biko,
    created_at: ks.createdAt ? ks.createdAt.toISOString() : '',
    updated_at: ks.updatedAt ? ks.updatedAt.toISOString() : null,
  };
}

import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { KanriShitenListItemDto } from './dto/kanri-shiten-list-item.dto';
import { KanriShitenDetailDto } from './dto/kanri-shiten-detail.dto';

/**
 * KanriShiten エンティティ (camelCase) → API 応答 KanriShitenListItemDto (snake_case)。
 * todofukenName は service が別途 hydrate（m_todofuken バッチ lookup）— エンティティを
 * 都道府県テーブルに束縛しない。純粋関数（Nest DI/IO なし）。
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
 * ACSMS-SCR-009 エンドポイント (GET by id / POST / PUT) の詳細マッピング。
 * list が省く列 (kana, biko, created_at, updated_at) を追加。
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

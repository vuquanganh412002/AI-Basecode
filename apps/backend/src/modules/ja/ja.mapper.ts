import { Ja } from '@/database/entities/ja.entity';
import { JaResponseDto } from './dto/ja-response.dto';

/**
 * Map a `Ja` entity (camelCase columns) to the snake_case
 * `JaResponseDto` shape that the API serializes.
 *
 * `todofukenName` is hydrated separately by the service (joined or
 * batch-looked-up against `m_todofuken`) because the entity carries
 * only `todofuken_code` — keeps the entity unbound from the prefecture
 * lookup table and lets the service decide JOIN vs batch fetch per
 * use case.
 *
 * Pure: no Nest DI, no IO. Easy to unit-test in isolation and reuse
 * across the controller / service / spec layers if needed.
 */
export function toJaResponse(ja: Ja, todofukenName: string): JaResponseDto {
  return {
    ja_id: Number(ja.jaId),
    ja_code: ja.jaCode,
    ja_name: ja.jaName,
    ja_name_kana: ja.jaNameKana,
    todofuken_code: ja.todofukenCode,
    todofuken_name: todofukenName,
    chuokai_flg: ja.chuokaiFlg,
    yubin_no: ja.yubinNo,
    address: ja.address,
    tel: ja.tel,
    fax: ja.fax,
    email: ja.email,
    tanto_busho: ja.tantoBusho,
    tanto_name: ja.tantoName,
    zei_kubun: ja.zeiKubun,
    jastem_itakusha_code: ja.jastemItakushaCode,
    jastem_itakusha_name: ja.jastemItakushaName,
    jastem_ja_code: ja.jastemJaCode,
    jastem_ja_name: ja.jastemJaName,
    biko: ja.biko,
    created_at: ja.createdAt ? ja.createdAt.toISOString() : '',
    updated_at: ja.updatedAt ? ja.updatedAt.toISOString() : null,
  };
}

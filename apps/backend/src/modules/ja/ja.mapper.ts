import { Ja } from '@/database/entities/ja.entity';
import { JaResponseDto } from './dto/ja-response.dto';

// Ja エンティティ(camelCase)→ API 用 snake_case JaResponseDto へマップ。
// todofukenName は service が別途注入(entity は todofuken_code のみ持つ)。
// entity を m_todofuken に縛らず、JOIN/batch を用途ごとに service が選べる。
// 純関数：Nest DI/IO なし。単体テストしやすく各層で再利用可。
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

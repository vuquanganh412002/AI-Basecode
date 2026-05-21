import { ApiProperty } from '@nestjs/swagger';

/**
 * Single row in `GET /api/v1/kanri-shiten` response data array.
 * Shape mirrors ACSMS-SCR-008-api.md §3 レスポンスデータ.
 */
export class KanriShitenListItemDto {
  @ApiProperty({ description: '管理支店ID' })
  kanri_shiten_id: number;

  @ApiProperty({ description: 'JA ID（DataScope判定用）' })
  ja_id: number;

  @ApiProperty({ description: 'JA名（m_jaからJOIN）' })
  ja_name: string;

  @ApiProperty({ description: '管理支店コード' })
  kanri_shiten_code: string;

  @ApiProperty({ description: '管理支店名' })
  kanri_shiten_name: string;

  @ApiProperty({ description: '郵便番号' })
  yubin_no: string;

  @ApiProperty({ description: '都道府県コード' })
  todofuken_code: string;

  @ApiProperty({ description: '都道府県名（m_todofukenからJOIN）' })
  todofuken_name: string;

  @ApiProperty({ description: '住所' })
  address: string;

  @ApiProperty({ description: '電話番号' })
  tel: string;

  @ApiProperty({ description: 'FAX番号' })
  fax: string;

  @ApiProperty({ description: '紙版取扱フラグ' })
  paper_flg: boolean;

  @ApiProperty({ description: '電子版取扱フラグ' })
  denshi_flg: boolean;
}

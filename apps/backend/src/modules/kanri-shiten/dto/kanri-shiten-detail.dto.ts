import { ApiProperty } from '@nestjs/swagger';

/**
 * 詳細形状: ACSMS-API-009-001 (GET) / 009-002 (POST 応答) / 009-003 (PUT 応答)。
 * KanriShitenListItemDto の全列 + kanri_shiten_name_kana, biko, created_at, updated_at。
 */
export class KanriShitenDetailDto {
  @ApiProperty() kanri_shiten_id: number;
  @ApiProperty() ja_id: number;
  @ApiProperty({ description: 'JA名（m_ja から JOIN — JA_KANRI_SHITEN は ja.view を持たないので JA dropdown を呼べず、この値で表示する）' })
  ja_name: string;
  @ApiProperty() kanri_shiten_code: string;
  @ApiProperty() kanri_shiten_name: string;
  @ApiProperty() kanri_shiten_name_kana: string;
  @ApiProperty() todofuken_code: string;
  @ApiProperty() todofuken_name: string;
  @ApiProperty() yubin_no: string;
  @ApiProperty() address: string;
  @ApiProperty() tel: string;
  @ApiProperty() fax: string;
  @ApiProperty() paper_flg: boolean;
  @ApiProperty() denshi_flg: boolean;
  @ApiProperty() biko: string;
  @ApiProperty({ description: 'ISO 8601' }) created_at: string;
  @ApiProperty({ description: 'ISO 8601', nullable: true }) updated_at: string | null;
}

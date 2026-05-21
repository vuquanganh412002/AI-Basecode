import { ApiProperty } from '@nestjs/swagger';

/**
 * Full detail shape for ACSMS-API-007-001 (GET) + 007-002 (POST response)
 * + 007-003 (PUT response). Matches `database-design.md §m_shiten` column
 * order; `biko` added per v1.3.
 */
export class ShitenDetailDto {
  @ApiProperty() shiten_id: number;
  @ApiProperty() ja_id: number;
  @ApiProperty() shiten_code: string;
  @ApiProperty() shiten_name: string;
  @ApiProperty() shiten_name_kana: string;
  @ApiProperty() kinyu_shiten_flg: boolean;
  @ApiProperty({
    example: '',
    description: 'JASTEM_データ送信取扱店舗コード ※空文字許容',
  })
  jastem_toriatsukai_tenpo_code: string;
  @ApiProperty({ example: '', description: 'JASTEM_店舗名 ※空文字許容' })
  jastem_tenpo_name: string;
  @ApiProperty({ example: '', description: 'JASTEM_貯金種別 ※空文字許容' })
  jastem_tyokin_shubetsu: string;
  @ApiProperty({ example: '', description: 'JASTEM_口座番号 ※空文字許容' })
  jastem_koza_no: string;
  @ApiProperty() kanri_shiten_id: number;
  @ApiProperty() biko: string;
  @ApiProperty({ description: 'ISO 8601' }) created_at: string;
  @ApiProperty({ description: 'ISO 8601', nullable: true }) updated_at: string | null;
}

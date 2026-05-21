import { ApiProperty } from '@nestjs/swagger';

/**
 * Single row in `GET /api/v1/shiten` response data array.
 * Shape mirrors ACSMS-SCR-006-api.md §レスポンスデータ.
 *
 * Same column set as `ShitenDetailDto`; kept separate so the list and
 * detail endpoints can evolve independently (e.g. list may strip biko
 * later, or detail may gain joined fields).
 */
export class ShitenListItemDto {
  @ApiProperty({ description: '支店ID' })
  shiten_id: number;

  @ApiProperty({ description: 'JA ID（DataScope判定用）' })
  ja_id: number;

  @ApiProperty({ description: '支店コード' })
  shiten_code: string;

  @ApiProperty({ description: '支店名称' })
  shiten_name: string;

  @ApiProperty({ description: '支店名称（カナ）' })
  shiten_name_kana: string;

  @ApiProperty({ description: '金融機関支店フラグ' })
  kinyu_shiten_flg: boolean;

  @ApiProperty({ description: '管理支店ID' })
  kanri_shiten_id: number;

  @ApiProperty({ description: '管理支店名（m_kanri_shitenからJOIN）' })
  kanri_shiten_name: string;

  @ApiProperty({ description: 'JASTEM_データ送信取扱店舗コード ※空文字許容', example: '' })
  jastem_toriatsukai_tenpo_code: string;

  @ApiProperty({ description: 'JASTEM_店舗名 ※空文字許容', example: '' })
  jastem_tenpo_name: string;

  @ApiProperty({ description: 'JASTEM_貯金種別 ※空文字許容', example: '' })
  jastem_tyokin_shubetsu: string;

  @ApiProperty({ description: 'JASTEM_口座番号 ※空文字許容', example: '' })
  jastem_koza_no: string;

  @ApiProperty({ description: '備考（空文字許容）' })
  biko: string;

  @ApiProperty({ description: 'ISO 8601 作成日時' })
  created_at: string;

  @ApiProperty({ description: 'ISO 8601 更新日時', nullable: true })
  updated_at: string | null;
}

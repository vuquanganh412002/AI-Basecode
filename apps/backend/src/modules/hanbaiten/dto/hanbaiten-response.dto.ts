import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Detail-shape response returned by SCR-017 endpoints
 *   - ACSMS-API-017-001 GET /api/v1/hanbaiten/:hanbaiten_id
 *   - ACSMS-API-017-002 POST /api/v1/hanbaiten
 *   - ACSMS-API-017-003 PUT /api/v1/hanbaiten/:hanbaiten_id
 *
 * Mirrors api.md §3 レスポンスデータ verbatim — snake_case fields, nullable
 * markers preserved per database-design.md §m_hanbaiten NULL許容 column.
 * NOT NULL string columns serialize as `""` when empty (project policy —
 * see `.claude/rules/nestjs.md §Nullable field serialization`).
 */
export class HanbaitenResponseDto {
  @ApiProperty({ description: '販売店ID' })
  hanbaiten_id!: number;

  @ApiProperty({ description: 'JA ID' })
  ja_id!: number;

  @ApiProperty({ description: '販売店コード' })
  hanbaiten_code!: string;

  @ApiProperty({ description: '販売店名' })
  hanbaiten_name!: string;

  @ApiProperty({ description: '販売店名（カナ）' })
  hanbaiten_name_kana!: string;

  @ApiProperty({ description: '適格請求書発行事業者番号' })
  torihikisaki_no!: string;

  @ApiProperty({ description: '都道府県コード（2桁）' })
  todofuken_code!: string;

  @ApiProperty({ description: '郵便番号' })
  yubin_no!: string;

  @ApiProperty({ description: '住所' })
  address!: string;

  @ApiProperty({ description: '電話番号' })
  tel!: string;

  @ApiProperty({ description: 'FAX番号' })
  fax!: string;

  @ApiProperty({ description: '所長名' })
  shocho_name!: string;

  @ApiPropertyOptional({
    description: '委託区分（1:振込, 2:日農委託, 9:その他）',
    nullable: true,
  })
  itaku_kubun!: number | null;

  @ApiPropertyOptional({ description: '配達手数料単価ID', nullable: true })
  haitatsuryo_tanka_id!: number | null;

  @ApiPropertyOptional({
    description: '配達手数料支払サイクル（月数）',
    nullable: true,
  })
  haitatsuryo_shiharai_cycle!: number | null;

  @ApiPropertyOptional({
    description: '振込手数料負担区分（1:JA, 2:販売店）',
    nullable: true,
  })
  tesuryo_kubun!: number | null;

  @ApiPropertyOptional({ description: '手数料金額', nullable: true })
  tesuryo_amount!: number | null;

  @ApiProperty({ description: '金融機関コード' })
  bank_code!: string;

  @ApiProperty({ description: '金融機関名' })
  bank_name!: string;

  @ApiProperty({ description: '口座支店コード' })
  bank_branch_code!: string;

  @ApiProperty({ description: '口座支店名' })
  bank_branch_name!: string;

  @ApiPropertyOptional({
    description: '口座種別（1:普通, 2:当座）',
    nullable: true,
  })
  yokin_shubetsu!: number | null;

  @ApiProperty({ description: '口座番号' })
  koza_no!: string;

  @ApiProperty({ description: '口座名義' })
  koza_meigi!: string;

  @ApiProperty({ description: '廃店フラグ（true:廃店, false:営業中）' })
  haiten_flg!: boolean;

  @ApiProperty({ description: '備考' })
  biko!: string;

  @ApiProperty({ description: '作成日時（ISO8601）' })
  created_at!: string;

  @ApiPropertyOptional({ description: '更新日時（ISO8601）', nullable: true })
  updated_at!: string | null;
}

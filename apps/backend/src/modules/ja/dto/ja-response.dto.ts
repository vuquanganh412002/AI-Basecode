import { ApiProperty } from '@nestjs/swagger';

/**
 * JA response DTO — shape returned by GET /api/v1/ja/:ja_id,
 * POST /api/v1/ja, and PUT /api/v1/ja/:ja_id.
 *
 * Nullable policy (`.claude/rules/nestjs.md §Nullable field serialization`):
 *   - m_ja columns are NOT NULL (empty strings for unfilled) → plain `string`, emit `""`
 *   - jastem_* columns are nullable → `string | null`, emit `null`
 *   - updated_at is nullable per api.md contract
 */
export class JaResponseDto {
  @ApiProperty({ example: 1 })
  ja_id!: number;

  @ApiProperty({ example: '1301001001' })
  ja_code!: string;

  @ApiProperty({ example: 'JA東京中央' })
  ja_name!: string;

  @ApiProperty({ example: 'ジェイエイトウキョウチュウオウ' })
  ja_name_kana!: string;

  @ApiProperty({ example: '13' })
  todofuken_code!: string;

  @ApiProperty({ example: '東京都', description: 'LEFT JOIN m_todofuken で取得' })
  todofuken_name!: string;

  @ApiProperty({ example: true })
  chuokai_flg!: boolean;

  @ApiProperty({ example: '1234' })
  bank_code!: string;

  @ApiProperty({ example: '農林中央金庫' })
  bank_name!: string;

  @ApiProperty({ example: '1000001' })
  yubin_no!: string;

  @ApiProperty({ example: '東京都千代田区丸の内1-1-1' })
  address!: string;

  @ApiProperty({ example: '0312345678' })
  tel!: string;

  @ApiProperty({ example: '0312345679' })
  fax!: string;

  @ApiProperty({ example: 'info@ja-tokyo-chuo.or.jp' })
  email!: string;

  @ApiProperty({ example: '総務部' })
  tanto_busho!: string;

  @ApiProperty({ example: '田中太郎' })
  tanto_name!: string;

  @ApiProperty({ example: 1, description: '税区分 ※m_code.code_category=\'ZEI_KUBUN\'を参照' })
  zei_kubun!: number;

  @ApiProperty({ example: '' })
  biko!: string;

  @ApiProperty({ example: '2026-04-07T10:00:00Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-04-07T15:30:00Z', nullable: true })
  updated_at!: string | null;
}

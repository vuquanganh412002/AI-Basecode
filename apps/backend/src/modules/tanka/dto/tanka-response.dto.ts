import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response shape for tanka endpoints (GET list, GET detail, POST, PUT).
 *
 * Nullability follows `m_tanka` DB schema (per `.claude/rules/nestjs.md
 * §Nullable field serialization`):
 *   - `tekiyo_end_date` NULLABLE → emit `null` when無期限
 *   - `updated_at` NULLABLE per project convention (created vs updated)
 *   - everything else NOT NULL → emit `""` / number / boolean
 */
export class TankaResponseDto {
  @ApiProperty() tanka_id: number;
  @ApiProperty() ja_id: number;
  @ApiProperty({ description: '1=新聞購読料, 2=配達手数料' }) tanka_type: number;
  @ApiProperty() tanka_code: string;
  @ApiProperty() tanka_name: string;
  @ApiProperty() kingaku_zeikomi: number;
  @ApiProperty() kingaku_zeinuki: number;
  @ApiProperty() tax_rate: number;
  @ApiProperty({ description: 'YYYY-MM-DD' }) tekiyo_start_date: string;
  @ApiPropertyOptional({ nullable: true, description: 'YYYY-MM-DD or null (無期限)' })
  tekiyo_end_date: string | null;
  @ApiProperty() biko: string;
  @ApiProperty() active_flg: boolean;
  @ApiProperty({ description: 'ISO 8601 (TIMESTAMPTZ)' }) created_at: string;
  @ApiPropertyOptional({ nullable: true, description: 'ISO 8601 or null' })
  updated_at: string | null;
}

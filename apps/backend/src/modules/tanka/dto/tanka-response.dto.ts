import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

/**
 * Item shape for tanka endpoints (GET detail, POST body, PUT body).
 * Subset shown in list endpoint via TankaListItemDto below.
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
  @ApiProperty({ description: 'キャンペーンフラグ（TRUE: 有効, FALSE: 無効）' })
  campaign_flg: boolean;
  @ApiProperty({ description: 'ISO 8601 (TIMESTAMPTZ)' }) created_at: string;
  @ApiPropertyOptional({ nullable: true, description: 'ISO 8601 or null' })
  updated_at: string | null;
}

/**
 * Slim row shape returned by the list endpoint — service projects only
 * the columns the table actually displays (no biko, no created/updated,
 * no JA-id since the list is already JA-scoped).
 */
export class TankaListItemDto {
  @ApiProperty() tanka_id: number;
  @ApiProperty() tanka_type: number;
  @ApiProperty() tanka_code: string;
  @ApiProperty() tanka_name: string;
  @ApiProperty({ description: 'YYYY-MM-DD' }) tekiyo_start_date: string;
  @ApiPropertyOptional({ nullable: true, description: 'YYYY-MM-DD or null' })
  tekiyo_end_date: string | null;
  @ApiProperty() kingaku_zeikomi: number;
  @ApiProperty() kingaku_zeinuki: number;
  @ApiProperty() tax_rate: number;
  @ApiProperty() active_flg: boolean;
  @ApiProperty({ description: 'キャンペーンフラグ（TRUE: 有効, FALSE: 無効）' })
  campaign_flg: boolean;
}

export class TankaListResponseDto {
  @ApiProperty({ type: [TankaListItemDto] })
  data: TankaListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/** Single-resource envelope (GET /:id). */
export class TankaDetailEnvelopeDto {
  @ApiProperty({ type: TankaResponseDto })
  data: TankaResponseDto;
}

/** Mutation success envelope (POST + PUT). */
export class TankaMutationResponseDto {
  @ApiProperty({ type: TankaResponseDto })
  data: TankaResponseDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message: string;
}

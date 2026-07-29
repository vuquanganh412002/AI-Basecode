import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

/**
 * tanka エンドポイント (GET詳細/POST/PUT body) の項目形。一覧は下の TankaListItemDto。
 * Nullability は m_tanka スキーマ準拠 (.claude/rules/nestjs.md §Nullable field serialization):
 *   - `tekiyo_end_date` NULLABLE → 無期限は null
 *   - `updated_at` NULLABLE (プロジェクト規約: created vs updated)
 *   - 他は NOT NULL → "" / number / boolean
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
 * 一覧エンドポイントが返す slim 行 — 表示カラムのみ射影 (biko / created・updated /
 * ja_id は無し。一覧は既に JA スコープ済み)。
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

/** 単一リソースエンベロープ (GET /:id)。 */
export class TankaDetailEnvelopeDto {
  @ApiProperty({ type: TankaResponseDto })
  data: TankaResponseDto;
}

/** 更新系成功エンベロープ (POST + PUT)。 */
export class TankaMutationResponseDto {
  @ApiProperty({ type: TankaResponseDto })
  data: TankaResponseDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message: string;
}

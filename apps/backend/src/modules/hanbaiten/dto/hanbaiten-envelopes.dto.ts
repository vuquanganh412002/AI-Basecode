import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

import { HanbaitenResponseDto } from './hanbaiten-response.dto';

/**
 * Slim row shape returned by GET /api/v1/hanbaiten — mirrors
 * `HanbaitenListItem` in hanbaiten.mapper.ts.
 */
export class HanbaitenListItemDto {
  @ApiProperty() hanbaiten_id: number;
  @ApiProperty() ja_id: number;
  @ApiProperty() hanbaiten_code: string;
  @ApiProperty() hanbaiten_name: string;
  @ApiProperty() todofuken_code: string;
  @ApiProperty() todofuken_name: string;
  @ApiProperty() yubin_no: string;
  @ApiProperty() address: string;
  @ApiProperty() tel: string;
  @ApiProperty() fax: string;
  @ApiProperty() shocho_name: string;

  @ApiPropertyOptional({ nullable: true }) itaku_kubun: number | null;
  @ApiPropertyOptional({ nullable: true }) haitatsuryo_shiharai_cycle: number | null;
  @ApiPropertyOptional({ nullable: true }) tesuryo_kubun: number | null;
  @ApiPropertyOptional({ nullable: true }) tesuryo_amount: number | null;

  @ApiProperty() haiten_flg: boolean;
  @ApiProperty() created_at: string;
  @ApiPropertyOptional({ nullable: true }) updated_at: string | null;
}

export class HanbaitenListResponseDto {
  @ApiProperty({ type: [HanbaitenListItemDto] })
  data: HanbaitenListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/** Single-resource envelope (GET /:hanbaiten_id). */
export class HanbaitenDetailEnvelopeDto {
  @ApiProperty({ type: HanbaitenResponseDto })
  data: HanbaitenResponseDto;
}

/** Mutation success envelope (POST + PUT). */
export class HanbaitenMutationResponseDto {
  @ApiProperty({ type: HanbaitenResponseDto })
  data: HanbaitenResponseDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message: string;
}

/**
 * POST /api/v1/hanbaiten/import response — summary of the Excel
 * import outcome.
 */
export class HanbaitenImportResultDto {
  @ApiProperty({ description: '1=full overwrite, 2=upsert (incremental)' })
  import_mode: number;
  @ApiProperty() total_rows: number;
  @ApiProperty() created_count: number;
  @ApiProperty() updated_count: number;
  @ApiProperty() skipped_count: number;
  @ApiProperty({ description: 'ISO 8601' }) imported_at: string;
}

export class HanbaitenImportResponseDto {
  @ApiProperty({ type: HanbaitenImportResultDto })
  data: HanbaitenImportResultDto;

  @ApiProperty({ example: '正常に取り込みました。' })
  message: string;
}

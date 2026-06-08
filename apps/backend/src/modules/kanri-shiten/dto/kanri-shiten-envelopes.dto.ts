import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

import { KanriShitenDetailDto } from './kanri-shiten-detail.dto';
import { KanriShitenDropdownItemDto } from './kanri-shiten-dropdown-query.dto';
import { KanriShitenListItemDto } from './kanri-shiten-list-item.dto';

/** GET /api/v1/kanri-shiten — paginated list response. */
export class KanriShitenListResponseDto {
  @ApiProperty({ type: [KanriShitenListItemDto] })
  data: KanriShitenListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/**
 * GET /api/v1/kanri-shiten/dropdown — flat list (no pagination).
 * The dropdown is JA-scoped so result sets are small.
 */
export class KanriShitenDropdownResponseDto {
  @ApiProperty({ type: [KanriShitenDropdownItemDto] })
  data: KanriShitenDropdownItemDto[];
}

/** Single-resource envelope (GET /:id). */
export class KanriShitenDetailEnvelopeDto {
  @ApiProperty({ type: KanriShitenDetailDto })
  data: KanriShitenDetailDto;
}

/** Mutation success envelope (POST + PUT). */
export class KanriShitenMutationResponseDto {
  @ApiProperty({ type: KanriShitenDetailDto })
  data: KanriShitenDetailDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message: string;
}

import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/responses.dto';

import { KanriShitenDetailDto } from './kanri-shiten-detail.dto';
import { KanriShitenDropdownItemDto } from './kanri-shiten-dropdown-query.dto';
import { KanriShitenListItemDto } from './kanri-shiten-list-item.dto';

/** GET /api/v1/kanri-shiten — ページ一覧応答。 */
export class KanriShitenListResponseDto {
  @ApiProperty({ type: [KanriShitenListItemDto] })
  data: KanriShitenListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/**
 * GET /api/v1/kanri-shiten/dropdown — フラットリスト（ページングなし）。
 * dropdown は JA スコープなので結果セットは小さい。
 */
export class KanriShitenDropdownResponseDto {
  @ApiProperty({ type: [KanriShitenDropdownItemDto] })
  data: KanriShitenDropdownItemDto[];
}

/** 単一リソース envelope (GET /:id)。 */
export class KanriShitenDetailEnvelopeDto {
  @ApiProperty({ type: KanriShitenDetailDto })
  data: KanriShitenDetailDto;
}

/** 更新成功 envelope (POST + PUT)。 */
export class KanriShitenMutationResponseDto {
  @ApiProperty({ type: KanriShitenDetailDto })
  data: KanriShitenDetailDto;

  @ApiProperty({
    description: 'Verb-only Japanese literal — 登録しました。 / 更新しました。',
    example: '登録しました。',
  })
  message: string;
}

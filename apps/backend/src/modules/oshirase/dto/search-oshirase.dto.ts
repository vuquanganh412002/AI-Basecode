import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';

/** Whitelist of sortable columns per api.md §4.1 of API-031-001. */
export const OSHIRASE_SEARCH_SORT_BY = [
  'oshirase_id',
  'title',
  'status',
  'publish_location',
  'publish_start_date',
  'created_at',
] as const;
export type OshiraseSearchSortBy = (typeof OSHIRASE_SEARCH_SORT_BY)[number];

/**
 * Query DTO for `GET /api/v1/oshirase` (ACSMS-API-031-001).
 *
 * Inherits `page` / `per_page` from {@link PaginationDto} (canonical
 * defaults: page=1, per_page=20, max 100, Japanese error messages).
 * Adds an `OSHIRASE_SEARCH_SORT_BY`-whitelisted `sort_by` + `sort_order`
 * — the enum varies per search endpoint so those two fields stay local.
 */
export class SearchOshiraseDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'ソート対象',
    enum: OSHIRASE_SEARCH_SORT_BY,
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(OSHIRASE_SEARCH_SORT_BY, {
    message:
      'sort_byはoshirase_id / title / status / publish_location / publish_start_date / created_atのいずれかで指定してください。',
  })
  sort_by?: OshiraseSearchSortBy;

  @ApiPropertyOptional({
    description: 'ソート順',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sort_orderはasc / descのいずれかで指定してください。',
  })
  sort_order?: 'asc' | 'desc';
}

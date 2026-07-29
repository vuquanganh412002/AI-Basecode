import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';

/** ソート可能カラムの許可リスト（API-031-001 api.md §4.1）。 */
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
 * GET /api/v1/oshirase (ACSMS-API-031-001) の Query DTO。
 * page / per_page は {@link PaginationDto} を継承（既定 page=1,
 * per_page=20, max 100, 日本語エラー）。sort_by / sort_order は
 * エンドポイント毎に enum が異なるためローカル定義
 * （`OSHIRASE_SEARCH_SORT_BY` で許可制）。
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

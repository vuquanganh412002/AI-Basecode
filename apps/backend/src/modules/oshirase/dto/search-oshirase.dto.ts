import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

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
 * Every field is optional; defaults: page=1, per_page=20,
 * sort_by=created_at, sort_order=desc.
 */
export class SearchOshiraseDto {
  @ApiPropertyOptional({ description: 'ページ番号（デフォルト: 1）', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageは整数で指定してください。' })
  @Min(1, { message: 'pageは1以上で指定してください。' })
  page?: number;

  @ApiPropertyOptional({
    description: '1ページあたりの件数（デフォルト: 20、最大: 100）',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'per_pageは整数で指定してください。' })
  @Min(1, { message: 'per_pageは1〜100の範囲で指定してください。' })
  @Max(100, { message: 'per_pageは1〜100の範囲で指定してください。' })
  per_page?: number;

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

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Shared base for every paginated query DTO (search-log, search-oshirase,
 * search-accounts, etc.). Carries ONLY `page` + `per_page` with the
 * canonical Japanese error messages and `default: 20` / `max: 100`.
 *
 * `sort_by` + `sort_order` are NOT here because each search endpoint
 * whitelists a different `@IsIn(...)` enum for `sort_by` — concrete
 * DTOs declare those two fields with their own column whitelist.
 *
 * Why a base class rather than mixing in via @nestjs/mapped-types:
 * the search DTOs each add 3-10 module-specific filters (date_from,
 * keyword, ja_id, status, …) plus their own sort_by/sort_order, so
 * `extends PaginationDto` is the natural shape. Sonar previously
 * counted these 22-line page/per_page blocks as duplicates across the
 * 3 search modules; centralising here eliminates ~66 dup lines.
 */
export class PaginationDto {
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
}

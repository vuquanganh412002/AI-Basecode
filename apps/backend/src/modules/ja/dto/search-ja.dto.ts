import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Whitelist of columns the client may sort by. Anything else is rejected
 * by `@IsIn` so a user-supplied `sort_by` cannot inject SQL into
 * `ORDER BY ${sort_by}` (the service still maps each value to a known
 * QueryBuilder column reference — see `SORT_COLUMN_MAP`).
 *
 * Source: api.md §1 リクエストパラメータ + §4.1.
 */
export const JA_SEARCH_SORT_BY = [
  'ja_code',
  'ja_name',
  'yubin_no',
  'todofuken_name',
  'tel',
  'address',
  'fax',
  'updated_at',
] as const;

export type JaSearchSortBy = (typeof JA_SEARCH_SORT_BY)[number];

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Query-string DTO for `GET /api/v1/ja` (ACSMS-API-004-001).
 *
 * All fields optional; class-transformer applies the defaults below when
 * the property is absent so callers always see a fully-populated object.
 */
export class SearchJaDto {
  @ApiPropertyOptional({ description: 'JAコード（部分一致）', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'JAコードは最大10文字で指定してください。' })
  ja_code?: string;

  @ApiPropertyOptional({ description: 'JA名（部分一致）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'JA名は最大100文字で指定してください。' })
  ja_name?: string;

  @ApiPropertyOptional({ default: 1, description: 'ページ番号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageは整数で指定してください。' })
  @Min(1, { message: 'pageは1以上で指定してください。' })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: '1ページの件数 (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'per_pageは整数で指定してください。' })
  @Min(1, { message: 'per_pageは1以上で指定してください。' })
  @Max(100, { message: 'per_pageは100以下で指定してください。' })
  per_page?: number = 20;

  @ApiPropertyOptional({
    enum: JA_SEARCH_SORT_BY,
    default: 'ja_code',
    description: 'ソート項目',
  })
  @IsOptional()
  @IsIn(JA_SEARCH_SORT_BY, {
    message:
      'sort_byは ja_code / ja_name / yubin_no / todofuken_name / tel / address / fax のいずれかで指定してください。',
  })
  sort_by?: JaSearchSortBy = 'ja_code';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'asc',
    description: 'ソート方向',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sort_orderは asc または desc で指定してください。',
  })
  sort_order?: 'asc' | 'desc' = 'asc';
}

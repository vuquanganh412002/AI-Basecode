import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

/** Whitelist of sortable columns per api.md §4.1. Any other value rejected. */
export const ACCOUNT_SEARCH_SORT_BY = [
  'login_id',
  'account_name',
  'role_id',
  'role_name',
  'todofuken_code',
  'created_at',
] as const;
export type AccountSearchSortBy = (typeof ACCOUNT_SEARCH_SORT_BY)[number];

/**
 * Query DTO for `GET /api/v1/accounts` (ACSMS-API-024-001).
 * Every field is optional; api.md §2 lists no 必須 column.
 */
export class SearchAccountsDto {
  @ApiPropertyOptional({ description: 'ログインID（部分一致）', maxLength: 20 })
  @IsOptional()
  @IsString({ message: 'ログインIDは文字列で指定してください。' })
  @MaxLength(20, { message: 'ログインIDは最大20文字で指定してください。' })
  login_id?: string;

  @ApiPropertyOptional({ description: '管理者区分（1〜5）', minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '管理者区分は整数で指定してください。' })
  @Min(1, { message: '管理者区分は1〜5の範囲で指定してください。' })
  @Max(5, { message: '管理者区分は1〜5の範囲で指定してください。' })
  role_id?: number;

  @ApiPropertyOptional({ description: 'JA ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'JA IDは整数で指定してください。' })
  ja_id?: number;

  @ApiPropertyOptional({ description: '管理支店ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_id?: number;

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
    description: 'ソート対象（login_id / account_name / role_id / role_name / todofuken_code / created_at）',
    enum: ACCOUNT_SEARCH_SORT_BY,
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(ACCOUNT_SEARCH_SORT_BY, {
    message:
      'sort_byはlogin_id / account_name / role_id / role_name / todofuken_code / created_atのいずれかで指定してください。',
  })
  sort_by?: AccountSearchSortBy;

  @ApiPropertyOptional({
    description: 'ソート順（asc / desc）',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sort_orderはasc / descのいずれかで指定してください。' })
  sort_order?: 'asc' | 'desc';
}

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

import { PaginationDto } from '@/common/dto/pagination.dto';

/** ソート可能列のホワイトリスト（api.md §4.1）。他の値は拒否。 */
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
 * `GET /api/v1/accounts` のクエリ DTO（ACSMS-API-024-001）。
 * {@link PaginationDto} から page/per_page を継承（既定20, 最大100）。login_id /
 * role / JA / branch フィルタと `ACCOUNT_SEARCH_SORT_BY` に限定した sort_by を追加。
 * 全項目任意（api.md §2 に必須列なし）。
 */
export class SearchAccountsDto extends PaginationDto {
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

  @ApiPropertyOptional({ description: '都道府県コード', maxLength: 2 })
  @IsOptional()
  @IsString({ message: '都道府県コードは文字列で指定してください。' })
  @MaxLength(2, { message: '都道府県コードは最大2文字で指定してください。' })
  todofuken_code?: string;

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

  @ApiPropertyOptional({ description: '所属支店ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '支店IDは整数で指定してください。' })
  shiten_id?: number;

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

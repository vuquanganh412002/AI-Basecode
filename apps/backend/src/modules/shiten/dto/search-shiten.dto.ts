import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * Whitelist of sortable columns. Originally `shiten_code` / `shiten_name`
 * per 画面定義§8.1; extended with `kanri_shiten_name` (joined from
 * `m_kanri_shiten`) since the parent-branch name is now the leading
 * context column. Service maps each value to a typed QueryBuilder
 * reference; `@IsIn` blocks SQL injection via user-supplied `sort_by`.
 */
export const SHITEN_SEARCH_SORT_BY = [
  'shiten_code',
  'shiten_name',
  'kanri_shiten_name',
  'updated_at',
] as const;
export type ShitenSearchSortBy = (typeof SHITEN_SEARCH_SORT_BY)[number];

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Query-string DTO for `GET /api/v1/shiten` (ACSMS-API-006-001).
 *
 * All fields optional; class-transformer applies defaults below so the
 * service always sees a fully-populated object.
 *
 * Inherits page/per_page from {@link PaginationDto}. The runtime default
 * (page=1, per_page=20) is applied by the service layer via `?? 1` /
 * `?? 20` because query params arrive as `undefined` when omitted.
 */
export class SearchShitenDto extends PaginationDto {
  @ApiPropertyOptional({ description: '支店名（部分一致検索）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '支店名は文字列で指定してください。' })
  @MaxLength(100, { message: '支店名は最大100文字で指定してください。' })
  shiten_name?: string;

  @ApiPropertyOptional({ description: '支店コード（部分一致検索）', maxLength: 3 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '支店コードは文字列で指定してください。' })
  @MaxLength(3, { message: '支店コードは最大3文字で指定してください。' })
  shiten_code?: string;

  @ApiPropertyOptional({ description: '管理支店ID（完全一致検索）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_id?: number;

  @ApiPropertyOptional({
    description: 'JASTEM_データ送信取扱店舗コード（部分一致検索）',
    maxLength: 3,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'データ送信取扱店舗コードは文字列で指定してください。' })
  @MaxLength(3, {
    message: 'データ送信取扱店舗コードは最大3文字で指定してください。',
  })
  jastem_toriatsukai_tenpo_code?: string;

  @ApiPropertyOptional({
    description:
      '金融機関支店フラグ（true=金融機関支店, false=金融機関支店以外, 未指定=全選択）',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // クエリ文字列は常に文字列で届くため、boolean に変換する。
    // 空文字 / null / undefined は「全選択」として undefined に正規化。
    if (value === '' || value === null || value === undefined) return undefined;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({
    message:
      '金融機関支店フラグはtrue / falseで指定してください。',
  })
  kinyu_shiten_flg?: boolean;

  @ApiPropertyOptional({
    enum: SHITEN_SEARCH_SORT_BY,
    default: 'updated_at',
    description:
      'ソート項目（shiten_code / shiten_name / kanri_shiten_name / updated_at）',
  })
  @IsOptional()
  @IsIn(SHITEN_SEARCH_SORT_BY, {
    message:
      'sort_byは shiten_code / shiten_name / kanri_shiten_name / updated_at のいずれかで指定してください。',
  })
  sort_by?: ShitenSearchSortBy = 'updated_at';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'ソート方向',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sort_orderは asc または desc で指定してください。',
  })
  sort_order?: 'asc' | 'desc' = 'desc';
}

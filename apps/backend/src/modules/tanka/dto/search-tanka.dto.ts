import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * Whitelist of columns the client may sort by. Anything else is rejected
 * by `@IsIn` so a user-supplied `sort_by` cannot inject SQL into
 * `ORDER BY ${sort_by}` (the service still maps each value to a known
 * QueryBuilder column reference — see `SORT_COLUMN_MAP`).
 *
 * Source: api.md §リクエストパラメータ + §4.5.
 */
export const TANKA_SEARCH_SORT_BY = [
  'tanka_code',
  'tanka_name',
  'kingaku_zeikomi',
  'kingaku_zeinuki',
  'tax_rate',
  'tekiyo_start_date',
  'tekiyo_end_date',
  'updated_at',
] as const;

export type TankaSearchSortBy = (typeof TANKA_SEARCH_SORT_BY)[number];

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** Coerce `'true'`/`'false'` (from query string) to a real boolean. */
const stringToBool = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return value;
};

/**
 * Query-string DTO for `GET /api/v1/tanka` (ACSMS-API-002-001).
 *
 * All fields optional. `active_flg` omitted means "return both states"
 * (per api.md §4.3 — 省略時は両方を返却).
 *
 * Inherits page/per_page from {@link PaginationDto}. The runtime default
 * (page=1, per_page=20) is applied by the service layer via `?? 1` /
 * `?? 20` because query params arrive as `undefined` when omitted.
 */
export class SearchTankaDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '単価種別（完全一致）。1=新聞購読料, 2=配達手数料',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '単価種別は数値で指定してください。' })
  tanka_type?: number;

  @ApiPropertyOptional({ description: '単価名（部分一致）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '単価名は文字列で指定してください。' })
  @MaxLength(100, { message: '単価名は最大100文字で指定してください。' })
  tanka_name?: string;

  @ApiPropertyOptional({
    description:
      '適用開始日フィルタ（YYYY-MM-DD）。tekiyo_start_date >= 指定値 で絞り込む',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '適用開始日は文字列で指定してください。' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '適用開始日は YYYY-MM-DD 形式で指定してください。',
  })
  tekiyo_start_date?: string;

  @ApiPropertyOptional({
    description:
      '適用終了日フィルタ（YYYY-MM-DD）。tekiyo_end_date <= 指定値 で絞り込む（NULL=無期限は対象外）',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '適用終了日は文字列で指定してください。' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '適用終了日は YYYY-MM-DD 形式で指定してください。',
  })
  tekiyo_end_date?: string;

  @ApiPropertyOptional({
    description:
      '状態フィルタ（true=有効中のみ、false=停止中のみ、省略=両方）',
  })
  @Transform(stringToBool)
  @IsOptional()
  @IsBoolean({ message: '有効フラグは真偽値で指定してください。' })
  active_flg?: boolean;

  @ApiPropertyOptional({
    description:
      'キャンペーンフラグ（true=有効のみ、false=無効のみ、省略=両方）',
  })
  @Transform(stringToBool)
  @IsOptional()
  @IsBoolean({ message: 'キャンペーンフラグは真偽値で指定してください。' })
  campaign_flg?: boolean;

  @ApiPropertyOptional({
    enum: TANKA_SEARCH_SORT_BY,
    default: 'updated_at',
    description: 'ソート対象カラム',
  })
  @IsOptional()
  @IsString({ message: 'ソート対象カラムは文字列で指定してください。' })
  @IsIn(TANKA_SEARCH_SORT_BY as unknown as string[], {
    message: 'ソート対象カラムが不正です。',
  })
  sort_by?: TankaSearchSortBy = 'updated_at';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'ソート方向',
  })
  @IsOptional()
  @IsString({ message: 'ソート方向は文字列で指定してください。' })
  @IsIn(['asc', 'desc'], { message: 'ソート方向は asc / desc のみ指定可能です。' })
  sort_order?: 'asc' | 'desc' = 'desc';
}

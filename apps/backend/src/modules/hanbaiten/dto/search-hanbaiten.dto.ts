import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * Whitelist of sortable columns. Per 画面設計書 v1.2 §8.1 only the two
 * local columns are exposed; this `@IsIn` guard blocks SQL-injection
 * attempts via user-supplied `sort_by`.
 */
export const HANBAITEN_SEARCH_SORT_BY = [
  'hanbaiten_code',
  'hanbaiten_name',
] as const;
export type HanbaitenSearchSortBy =
  (typeof HANBAITEN_SEARCH_SORT_BY)[number];

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Coerce stringified booleans ('true' / 'false') into real booleans —
 * Express query parsing always produces strings. Anything else is
 * returned unchanged so the downstream `@IsBoolean()` decorator can
 * reject it with a proper validation error.
 */
const stringToBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  return value;
};

/**
 * Query-string DTO for `GET /api/v1/hanbaiten` (ACSMS-API-018-001).
 *
 * All fields optional; class-transformer applies defaults below so the
 * service always sees a fully-populated object.
 *
 * Inherits page/per_page from {@link PaginationDto}. The runtime default
 * (page=1, per_page=20) is applied by the service layer via `?? 1` /
 * `?? 20` because query params arrive as `undefined` when omitted.
 */
export class SearchHanbaitenDto extends PaginationDto {
  @ApiPropertyOptional({ description: '販売店コード（部分一致検索）', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店コードは文字列で指定してください。' })
  @MaxLength(10, { message: '販売店コードは最大10文字で指定してください。' })
  hanbaiten_code?: string;

  @ApiPropertyOptional({ description: '販売店名（部分一致検索）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店名は文字列で指定してください。' })
  @MaxLength(100, { message: '販売店名は最大100文字で指定してください。' })
  hanbaiten_name?: string;

  @ApiPropertyOptional({ description: '電話番号（部分一致検索）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '電話番号は文字列で指定してください。' })
  @MaxLength(15, { message: '電話番号は最大15文字で指定してください。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号（部分一致検索）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で指定してください。' })
  @MaxLength(15, { message: 'FAX番号は最大15文字で指定してください。' })
  fax?: string;

  @ApiPropertyOptional({ description: '住所（部分一致検索）', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '住所は文字列で指定してください。' })
  @MaxLength(200, { message: '住所は最大200文字で指定してください。' })
  address?: string;

  @ApiPropertyOptional({ description: '所長名（部分一致検索）', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '所長名は文字列で指定してください。' })
  @MaxLength(50, { message: '所長名は最大50文字で指定してください。' })
  shocho_name?: string;

  // [staff-ja-filter] Explicit JA filter — for NICHINO_STAFF 代行入力
  // flow where the user picks a JA up-front via <BaseJaDropdown>.
  // Session-scoped roles ignore this (applyJaScope already pins
  // session.ja_id); the service applies it ONLY when session.ja_id
  // is null (NICHINO_*).
  @ApiPropertyOptional({
    description: 'JA絞り込み (NICHINO_STAFF 代行入力 専用)。',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ja_idは整数で指定してください。' })
  @Min(1, { message: 'ja_idは1以上で指定してください。' })
  ja_id?: number;

  @ApiPropertyOptional({
    description:
      '廃店フラグ（true:廃店も含む, false:廃店を除外）。省略時は false。',
    type: Boolean,
  })
  // `enableImplicitConversion: true` would coerce ANY non-empty string
  // to `true` via Boolean() before @Transform runs — including 'false'.
  // Forcing @Type(() => String) tells class-transformer to skip that
  // primitive coercion and leave the raw string in place, so the
  // stringToBoolean transform below can map 'true'/'false' correctly
  // and leave 'maybe' untouched for @IsBoolean to reject.
  @Type(() => String)
  @Transform(stringToBoolean)
  @IsOptional()
  @IsBoolean({ message: '廃店フラグはbooleanで指定してください。' })
  haiten_flg?: boolean;

  @ApiPropertyOptional({
    enum: HANBAITEN_SEARCH_SORT_BY,
    default: 'hanbaiten_code',
    description: 'ソート項目（hanbaiten_code / hanbaiten_name）',
  })
  @IsOptional()
  @IsIn(HANBAITEN_SEARCH_SORT_BY, {
    message:
      'sort_byは hanbaiten_code / hanbaiten_name のいずれかで指定してください。',
  })
  sort_by?: HanbaitenSearchSortBy = 'hanbaiten_code';

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

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Query-string DTO for `GET /api/v1/ja/dropdown` (ACSMS-API-COMMON-003).
 *
 * Unified contract powering two distinct use cases that share the
 * path:
 *
 *   1. Form free-text + infinite scroll (SCR-009 管理支店 create
 *      and friends). Pass `q` (matches `ja_code OR ja_name`),
 *      `page`, `per_page`, optional `include_id` for edit-form
 *      pre-selection when the chosen JA is past page 1.
 *
 *   2. Cascading filter (SCR-024 account search / SCR-025 register).
 *      Pass `todofuken_code` and/or `role_id`; the BE maps
 *      `role_id ∈ {3}` → `chuokai_flg=TRUE`, `role_id ∈ {4, 5}` →
 *      `chuokai_flg=FALSE`, others fall through.
 *
 * Returns a slimmed-down row shape — `{ja_id, ja_code, ja_name,
 * todofuken_code, chuokai_flg}` — no address/bank/etc payload bloat.
 * Sort is always `ja_code ASC` (predictable scroll, no per-call
 * sort_by/sort_order params unlike `SearchJaDto`).
 */
export class JaDropdownQueryDto {
  @ApiPropertyOptional({
    description: '検索キーワード。ja_code または ja_name に部分一致。',
    maxLength: 100,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '検索キーワードは文字列で指定してください。' })
  @MaxLength(100, { message: '検索キーワードは最大100文字で指定してください。' })
  q?: string;

  @ApiPropertyOptional({
    description: '都道府県コード（カスケード絞込み。完全一致）',
    maxLength: 2,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '都道府県コードは文字列で指定してください。' })
  @MaxLength(2, { message: '都道府県コードは2文字以内で指定してください。' })
  todofuken_code?: string;

  @ApiPropertyOptional({
    description:
      '管理者区分（カスケード絞込み。3:中央会→chuokai_flg=true、4,5:JA→chuokai_flg=false）',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'role_idは整数で指定してください。' })
  @Min(1, { message: 'role_idは1以上で指定してください。' })
  role_id?: number;

  @ApiPropertyOptional({ default: 1, description: 'ページ番号' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageは整数で指定してください。' })
  @Min(1, { message: 'pageは1以上で指定してください。' })
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, description: '1ページの件数 (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'per_pageは整数で指定してください。' })
  @Min(1, { message: 'per_pageは1以上で指定してください。' })
  @Max(100, { message: 'per_pageは100以下で指定してください。' })
  per_page?: number = 50;

  @ApiPropertyOptional({
    description:
      '編集フォーム用。指定された ja_id がページ1のヒット範囲に含まれない場合、レスポンス先頭に追加して返す。',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'include_idは整数で指定してください。' })
  @Min(1, { message: 'include_idは1以上で指定してください。' })
  include_id?: number;
}

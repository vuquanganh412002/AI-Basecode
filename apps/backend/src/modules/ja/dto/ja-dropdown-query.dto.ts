import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { BaseDropdownQueryDto } from '@/common/dto/base-dropdown-query.dto';

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Query-string DTO for `GET /api/v1/ja/dropdown` (ACSMS-API-COMMON-003).
 *
 * Extends {@link BaseDropdownQueryDto} for the standard shape
 * (`q`/`page`/`per_page`/`include_id`) and adds JA-specific filters:
 *
 *   1. Form free-text + infinite scroll (SCR-009 管理支店 create etc.).
 *      `q` matches `ja_code OR ja_name` by default; `match_field='name'`
 *      narrows to ja_name only (for SCR-024 account list, where ja_code
 *      is hidden in the UI).
 *
 *   2. Cascading filter (SCR-024 account search / SCR-025 register):
 *      pass `todofuken_code` and/or `role_id`; the BE maps
 *      `role_id ∈ {3}` → `chuokai_flg=TRUE`, `role_id ∈ {4, 5}` →
 *      `chuokai_flg=FALSE`, others fall through.
 *
 * Returns a slimmed-down row shape — `{ja_id, ja_code, ja_name,
 * todofuken_code, chuokai_flg}` — no address/bank/etc payload bloat.
 * Sort is always `ja_code ASC` (predictable scroll, no per-call
 * sort_by/sort_order params unlike `SearchJaDto`).
 */
export class JaDropdownQueryDto extends BaseDropdownQueryDto {
  // [match-field] Opt-in name-only search for callers that hide ja_code
  // in the UI (SCR-024 account list). Default 'both' preserves the
  // legacy behavior (ja_code OR ja_name) so existing call sites are
  // unaffected. Unknown values rejected by @IsIn rather than silently
  // falling through to 'both' — typo'd value would otherwise leak past
  // validation and confuse callers.
  @ApiPropertyOptional({
    description:
      '検索対象フィールド。"both"=ja_code OR ja_name (既定)、"name"=ja_nameのみ。',
    enum: ['both', 'name'],
    default: 'both',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsIn(['both', 'name'], {
    message: 'match_fieldは"both"または"name"で指定してください。',
  })
  match_field?: 'both' | 'name';

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
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * ソート可能列 allow-list（ACSMS-SCR-008 画面定義§8.1 が 3 つのクリック可能ヘッダを列挙）。
 * updated_at は暗黙の既定（初期表示は最新順）でヘッダには出さないが、@IsIn allow-list に
 * 含め `ORDER BY ${sort_by}` の SQL インジェクション安全性を保つ。
 * service が各値を typed QueryBuilder 列参照へマップ。
 */
export const KANRI_SHITEN_SEARCH_SORT_BY = [
  'kanri_shiten_code',
  'kanri_shiten_name',
  'todofuken_code',
  'updated_at',
] as const;

export type KanriShitenSearchSortBy =
  (typeof KANRI_SHITEN_SEARCH_SORT_BY)[number];

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * GET /api/v1/kanri-shiten (ACSMS-API-008-001) クエリ DTO。全項目任意。
 * page/per_page は {@link PaginationDto} 継承。既定 (page=1, per_page=20) は
 * 未指定時 undefined で届くため service 側で `?? 1` / `?? 20` を適用。
 */
export class SearchKanriShitenDto extends PaginationDto {
  @ApiPropertyOptional({ description: '管理支店コード（部分一致）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '管理支店コードは文字列で指定してください。' })
  @MaxLength(15, { message: '管理支店コードは最大15文字で指定してください。' })
  kanri_shiten_code?: string;

  @ApiPropertyOptional({ description: '管理支店名（部分一致）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '管理支店名は文字列で指定してください。' })
  @MaxLength(100, { message: '管理支店名は最大100文字で指定してください。' })
  kanri_shiten_name?: string;

  @ApiPropertyOptional({
    description: '都道府県コード（部分一致。プルダウン由来）',
    maxLength: 2,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '都道府県コードは文字列で指定してください。' })
  @MaxLength(2, { message: '都道府県コードは最大2文字で指定してください。' })
  todofuken_code?: string;

  @ApiPropertyOptional({ description: '電話番号（部分一致）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '電話番号は文字列で指定してください。' })
  @MaxLength(15, { message: '電話番号は最大15文字で指定してください。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号（部分一致）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で指定してください。' })
  @MaxLength(15, { message: 'FAX番号は最大15文字で指定してください。' })
  fax?: string;

  @ApiPropertyOptional({
    enum: KANRI_SHITEN_SEARCH_SORT_BY,
    default: 'updated_at',
    description:
      'ソート項目。画面定義§8.1の3カラムに加え、初期表示用の updated_at を受け付ける。',
  })
  @IsOptional()
  @IsIn(KANRI_SHITEN_SEARCH_SORT_BY, {
    message:
      'sort_byは kanri_shiten_code / kanri_shiten_name / todofuken_code / updated_at のいずれかで指定してください。',
  })
  sort_by?: KanriShitenSearchSortBy = 'updated_at';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'ソート方向（初期表示は updated_at の降順 — 最新更新が先頭）',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sort_orderは asc または desc で指定してください。',
  })
  sort_order?: 'asc' | 'desc' = 'desc';
}

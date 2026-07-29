import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '@/common/dto/pagination.dto';

// sort_by 許可列のホワイトリスト。@IsIn で他値を拒否し `ORDER BY
// ${sort_by}` への SQLインジェクションを防ぐ(service 側でも既知の QB 列へ
// マップ — SORT_COLUMN_MAP 参照)。Source: api.md §1 + §4.1。
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

// `GET /api/v1/ja` 用 DTO (ACSMS-API-004-001)。全項目 optional。
// page/per_page は {@link PaginationDto} 継承。省略時は query が undefined
// で届くため、既定(page=1, per_page=20)は service 側 `?? 1`/`?? 20` で付与。
export class SearchJaDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'JAコード（部分一致）', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'JAコードは文字列で指定してください。' })
  @MaxLength(10, { message: 'JAコードは最大10文字で指定してください。' })
  ja_code?: string;

  @ApiPropertyOptional({ description: 'JA名（部分一致）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'JA名は文字列で指定してください。' })
  @MaxLength(100, { message: 'JA名は最大100文字で指定してください。' })
  ja_name?: string;

  @ApiPropertyOptional({
    description: '都道府県コード（プルダウン由来。完全一致）',
    maxLength: 2,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '都道府県コードは文字列で指定してください。' })
  @MaxLength(2, { message: '都道府県コードは2文字以内で指定してください。' })
  todofuken_code?: string;

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

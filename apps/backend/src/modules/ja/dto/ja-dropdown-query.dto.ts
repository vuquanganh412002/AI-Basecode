import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { BaseDropdownQueryDto } from '@/common/dto/base-dropdown-query.dto';

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

// `GET /api/v1/ja/dropdown` 用 DTO (ACSMS-API-COMMON-003)。
// {@link BaseDropdownQueryDto}(q/page/per_page/include_id)を継承し、
// JA固有フィルタを追加：
//   1. フォーム free-text + 無限スクロール(SCR-009 管理支店 create等)。
//      q は既定で ja_code OR ja_name、match_field='name' で ja_name のみ
//      (ja_code 非表示の SCR-024 account list 向け)。
//   2. カスケード絞込み(SCR-024 検索 / SCR-025 登録)：todofuken_code /
//      role_id を渡す。role_id∈{3}→chuokai_flg=TRUE、{4,5}→FALSE、他は素通り。
// 返却は slim 行 {ja_id, ja_code, ja_name, todofuken_code, chuokai_flg}。
// ソートは常に ja_code ASC(SearchJaDto と違い sort パラメータなし)。
export class JaDropdownQueryDto extends BaseDropdownQueryDto {
  // [match-field] ja_code 非表示の呼び元(SCR-024)向け name-only 検索の
  // opt-in。既定 'both'(ja_code OR ja_name)で既存呼び元は不変。不正値は
  // @IsIn で拒否(素通りさせず typo を検知)。
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

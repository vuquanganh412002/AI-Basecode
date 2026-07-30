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

  /**
   * DataScope の適用範囲（既定 `own` = 自組織階層のみ）。
   *
   * `todofuken` を指定すると **中央会(CHUOKAI)に限り** 自JAではなく
   * 「自セッションの都道府県に属する全JA」を候補にする。SCR-022 ファイル
   * ダウンロード画面の JA 絞り込み専用（顧客要件 2026-07 で同画面の DataScope が
   * 同一都道府県へ拡大したため、絞り込み候補も揃える必要がある）。
   *
   * **拡大先の都道府県はクライアントではなくセッションの `todofuken_code` から
   * 決まる**。よって本パラメータでできるのは「自県のJA一覧を見る」ことだけで、
   * 他県を覗くことはできない。中央会以外のロールでは無視される（素通りで従来の
   * 自組織スコープ）。
   */
  @ApiPropertyOptional({
    description:
      'DataScope 範囲。todofuken 指定時は中央会のみ自都道府県の全JAを候補にする（SCR-022 専用）',
    enum: ['own', 'todofuken'],
    default: 'own',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsIn(['own', 'todofuken'], {
    message: 'scopeは"own"または"todofuken"で指定してください。',
  })
  scope?: 'own' | 'todofuken';
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * `@IsOptional` の前に空文字を `undefined` へ強制変換する。フォームは空の検索欄で
 * `q: ""` を送るため、これがないと文字列バリデータが拒否 or フィルタ扱いしてしまう。
 * .claude/rules/nestjs.md §DTO validation gotchas 参照。
 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * 全 `GET /api/v1/<resource>/dropdown` クエリ DTO の共通ベース。
 *
 * 共通ドロップダウン UX（キーワード検索 + 無限スクロール + `include_id` 退避）は
 * JA / account / tanka / 将来のリソースで同一のため、この4フィールドを1クラスに
 * 集約。具象 DTO は独自フィルタ（`role_id`, `match_field`, `tanka_type` …）を追加する。
 *
 * サブクラスはこれらを再宣言しないこと。継承デコレータでも `forbidNonWhitelisted`
 * + `transform: true` は正しく機能する。
 */
export class BaseDropdownQueryDto {
  @ApiPropertyOptional({
    description: '検索キーワード（部分一致）。',
    maxLength: 100,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '検索キーワードは文字列で指定してください。' })
  @MaxLength(100, { message: '検索キーワードは最大100文字で指定してください。' })
  q?: string;

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

  /**
   * 編集フォーム用の退避手段。選択中の id がヒットのページ1に含まれない場合、
   * サービスがその行を先頭に追加し、2回目の GET なしでラベルを解決する。具象 DTO
   * は説明文で意味を読み替える（ja_id, tanka_id）が、wire パラメータは `include_id` のまま。
   */
  @ApiPropertyOptional({
    description:
      '編集フォーム用。指定したIDがページ1のヒット範囲に含まれない場合、レスポンス先頭に追加して返す。',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'include_idは整数で指定してください。' })
  @Min(1, { message: 'include_idは1以上で指定してください。' })
  include_id?: number;
}

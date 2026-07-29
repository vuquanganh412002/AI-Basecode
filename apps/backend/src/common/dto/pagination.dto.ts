import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * 全ページング系クエリ DTO（search-log, search-oshirase, search-accounts …）の
 * 共通ベース。`page` + `per_page` のみを持つ（正準の日本語メッセージ、
 * `default: 20` / `max: 100`）。
 *
 * `sort_by` + `sort_order` はここに置かない — エンドポイントごとに `sort_by` の
 * `@IsIn(...)` 許可値が異なるため、具象 DTO で宣言する。
 *
 * @nestjs/mapped-types でなくベースクラスにしているのは、検索 DTO が独自フィルタ
 * 3〜10個 + 独自ソートを足すため `extends PaginationDto` が適するから。
 * 集約で3モジュール分の Sonar 重複行 約66行を削減。
 */
export class PaginationDto {
  @ApiPropertyOptional({ description: 'ページ番号（デフォルト: 1）', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageは整数で指定してください。' })
  @Min(1, { message: 'pageは1以上で指定してください。' })
  page?: number;

  @ApiPropertyOptional({
    description: '1ページあたりの件数（デフォルト: 20、最大: 100）',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'per_pageは整数で指定してください。' })
  @Min(1, { message: 'per_pageは1〜100の範囲で指定してください。' })
  @Max(100, { message: 'per_pageは1〜100の範囲で指定してください。' })
  per_page?: number;
}

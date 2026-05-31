import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Coerce blank strings to `undefined` BEFORE `@IsOptional` runs. Forms
 * post `q: ""` for an empty search box; without this transform
 * downstream string validators would either reject the empty string
 * or treat it as a deliberate filter. See `.claude/rules/nestjs.md
 * §DTO validation gotchas`.
 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Shared base for every `GET /api/v1/<resource>/dropdown` query DTO.
 *
 * The customer's "common dropdown" UX (server-side keyword search +
 * paginated infinite-scroll + `include_id` escape hatch for edit-form
 * pre-selection) is identical across JA / account / tanka / future
 * resources — so the four fields below live in ONE class and concrete
 * DTOs extend with their entity-specific filters (`role_id`,
 * `match_field`, `tanka_type`, etc.).
 *
 * Subclasses MUST NOT redeclare these fields. NestJS's
 * `forbidNonWhitelisted: true` ValidationPipe + `transform: true` work
 * correctly with inherited decorators.
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
   * Edit-form escape hatch. If the currently-selected resource id
   * falls outside the first page of search hits, the service prepends
   * that row to the response so the label resolves without a second
   * GET. Concrete DTOs may rename the *semantic* (e.g. "ja_id",
   * "tanka_id") via prose, but the wire param stays `include_id`.
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

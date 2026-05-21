import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/** Whitelist of sortable columns per api.md §4.1. */
export const LOG_SEARCH_SORT_BY = [
  'log_datetime',
  'log_type',
  'result_status',
] as const;
export type LogSearchSortBy = (typeof LOG_SEARCH_SORT_BY)[number];

/** YYYY/MM/DD HH:mm:ss format used by both date_from and date_to. */
const DATETIME_RE = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;

/** `@IsOptional` only skips null/undefined — strip blank strings first. */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Query DTO for `GET /api/v1/log` (ACSMS-API-030-001).
 * Every field is optional; api.md §2 lists no 必須 column.
 */
export class SearchLogDto {
  @ApiPropertyOptional({
    description: '期間（開始日時）YYYY/MM/DD HH:mm:ss',
    example: '2026/04/01 00:00:00',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'date_fromは文字列で指定してください。' })
  @Matches(DATETIME_RE, {
    message: 'date_fromはYYYY/MM/DD HH:mm:ss形式で指定してください。',
  })
  date_from?: string;

  @ApiPropertyOptional({
    description: '期間（終了日時）YYYY/MM/DD HH:mm:ss',
    example: '2026/04/17 23:59:59',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'date_toは文字列で指定してください。' })
  @Matches(DATETIME_RE, {
    message: 'date_toはYYYY/MM/DD HH:mm:ss形式で指定してください。',
  })
  date_to?: string;

  @ApiPropertyOptional({ description: 'ログ種別（1〜4）', minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'log_typeは整数で指定してください。' })
  @Min(1, { message: 'log_typeは1〜4で指定してください。' })
  @Max(4, { message: 'log_typeは1〜4で指定してください。' })
  log_type?: number;

  @ApiPropertyOptional({ description: 'アカウントID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'account_idは整数で指定してください。' })
  account_id?: number;

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

  @ApiPropertyOptional({
    description: 'ソート対象',
    enum: LOG_SEARCH_SORT_BY,
    default: 'log_datetime',
  })
  @IsOptional()
  @IsIn(LOG_SEARCH_SORT_BY, {
    message: 'sort_byはlog_datetime / log_type / result_statusのいずれかで指定してください。',
  })
  sort_by?: LogSearchSortBy;

  @ApiPropertyOptional({
    description: 'ソート順',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sort_orderはasc / descのいずれかで指定してください。' })
  sort_order?: 'asc' | 'desc';
}

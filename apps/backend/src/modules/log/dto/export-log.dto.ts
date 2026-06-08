import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/**
 * YYYY/MM/DD HH:mm:ss format used by both date_from and date_to.
 * Exported so SearchLogDto (and any future date-range DTO) can reuse
 * the same regex literal — the duplicate `const DATETIME_RE = …` in
 * search-log.dto.ts is now gone.
 */
export const LOG_DATETIME_RE = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;

/** `@IsOptional` only skips null/undefined — strip blank strings first. */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Query DTO for `GET /api/v1/log/export` (ACSMS-API-030-002).
 *
 * Carries ONLY the 4 filter fields shared with the list endpoint —
 * `SearchLogDto` extends this class and adds `page`/`per_page`/
 * `sort_by`/`sort_order`. The Sonar duplication detector previously
 * counted the 4 filter blocks twice; centralising here eliminates that.
 */
export class ExportLogDto {
  @ApiPropertyOptional({
    description: '期間（開始日時）YYYY/MM/DD HH:mm:ss',
    example: '2026/04/01 00:00:00',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'date_fromは文字列で指定してください。' })
  @Matches(LOG_DATETIME_RE, {
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
  @Matches(LOG_DATETIME_RE, {
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
}

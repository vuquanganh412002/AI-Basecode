import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/**
 * date_from / date_to 共通の YYYY/MM/DD HH:mm:ss 形式。SearchLogDto（や
 * 将来の date-range DTO）が同一 regex を再利用できるよう export。
 */
export const LOG_DATETIME_RE = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;

/** `@IsOptional` は null/undefined のみスキップ — 先に空文字を除去。 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * GET /api/v1/log/export (ACSMS-API-030-002) の Query DTO。
 * list エンドポイントと共有する4フィルタのみ保持 — SearchLogDto が本クラスを
 * extends し page/per_page/sort_by/sort_order を追加。ここに集約し Sonar の
 * 重複検知（4フィルタ二重計上）を解消。
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

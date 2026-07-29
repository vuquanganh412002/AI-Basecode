import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/** `YYYY-MM-DD` — 対象年月日（年月単位で集計、日は任意）。 */
const TARGET_MONTH_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 配達手数料支払情報 の 2 エンドポイント共用の query/body DTO:
 *   - GET  /api/v1/haitatsuryo/preview (ACSMS-API-021-001, query)
 *   - POST /api/v1/haitatsuryo/export  (ACSMS-API-021-002, body)
 *
 * target_month は必須（未入力時は ACSMS-MSG-021-001「必須項目です。」）。
 * haitatsuryo_shiharai_cycle は任意の整数 1〜12（未指定時は全サイクル対象）。
 */
export class HaitatsuryoQueryDto {
  @ApiProperty({ description: '対象年月日（YYYY-MM-DD）', example: '2026-04-01' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '対象年月は文字列で指定してください。' })
  @Matches(TARGET_MONTH_RE, {
    message: '対象年月はYYYY-MM-DD形式で指定してください。',
  })
  target_month!: string;

  @ApiPropertyOptional({
    description: '配達手数料支払サイクル（月数、1〜12）。未指定時は全サイクル対象',
    example: 3,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '配達手数料支払サイクルは整数で指定してください。' })
  @Min(1, { message: '配達手数料支払サイクルは1〜12で指定してください。' })
  @Max(12, { message: '配達手数料支払サイクルは1〜12で指定してください。' })
  haitatsuryo_shiharai_cycle?: number;

  // ── ページネーション（preview のみ使用。export は無視＝全件出力） ──

  @ApiPropertyOptional({ description: 'ページ番号（1始まり）', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ページ番号は整数で指定してください。' })
  @Min(1, { message: 'ページ番号は1以上で指定してください。' })
  page?: number = 1;

  @ApiPropertyOptional({ description: '1ページ件数（最大100）', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '1ページ件数は整数で指定してください。' })
  @Min(1, { message: '1ページ件数は1以上で指定してください。' })
  @Max(100, { message: '1ページ件数は100以下で指定してください。' })
  per_page?: number = 20;
}

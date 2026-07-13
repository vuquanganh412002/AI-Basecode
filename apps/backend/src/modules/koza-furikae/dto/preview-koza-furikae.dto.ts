import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/** `YYYY-MM-DD` 日付フォーマット。 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/v1/koza-furikae/preview のリクエストボディ (ACSMS-API-020-003 / v1.1)。
 * 「作成開始」= 集計してプレビュー一覧を返すステップ。集計は target_month を基準に
 * 行い、フィルタ（管理支店/支店/口座支店）で絞り込む。JASTEM 項目や金額は不要
 * （それらは「ファイル作成」= export で検証・使用する — D8）。
 */
export class PreviewKozaFurikaeDto {
  @ApiProperty({ description: '対象年月日（YYYY-MM-DD）', example: '2026-05-01' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '対象年月日は文字列で指定してください。' })
  @Matches(DATE_RE, { message: '対象年月日はYYYY-MM-DD形式で指定してください。' })
  target_month!: string;

  @ApiProperty({ description: '引落日（YYYY-MM-DD）', example: '2026-05-27' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '引落日は文字列で指定してください。' })
  @Matches(DATE_RE, { message: '引落日はYYYY-MM-DD形式で指定してください。' })
  hikiotoshi_date!: string;

  @ApiPropertyOptional({ description: '管理支店ID配列（絞込）', type: [Number] })
  @IsOptional()
  @IsArray({ message: '管理支店IDは配列で指定してください。' })
  @Type(() => Number)
  @IsInt({ each: true, message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_ids?: number[];

  @ApiPropertyOptional({ description: '支店ID配列（絞込）', type: [Number] })
  @IsOptional()
  @IsArray({ message: '支店IDは配列で指定してください。' })
  @Type(() => Number)
  @IsInt({ each: true, message: '支店IDは整数で指定してください。' })
  shiten_ids?: number[];

  @ApiPropertyOptional({ description: '口座支店ID配列（絞込）', type: [Number] })
  @IsOptional()
  @IsArray({ message: '口座支店IDは配列で指定してください。' })
  @Type(() => Number)
  @IsInt({ each: true, message: '口座支店IDは整数で指定してください。' })
  koza_shiten_ids?: number[];
}

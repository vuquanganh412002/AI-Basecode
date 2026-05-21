import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Create Tanka request body — ACSMS-API-003-002.
 *
 * `tanka_type` references `m_code.code_category='TANKA_TYPE'` (1=新聞購読料,
 * 2=配達手数料). Allowed-value check lives in the service via
 * `assertMCodeValues(this.codeService, [...])` so runtime additions to
 * m_code don't require a redeploy.
 */
export class CreateTankaDto {
  @ApiProperty({
    description: '単価種別（1=新聞購読料, 2=配達手数料）',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: '単価種別は数値で指定してください。' })
  tanka_type!: number;

  @ApiProperty({ description: '単価コード（一意制約）', maxLength: 10, example: 'T001' })
  @IsString({ message: '単価コードは文字列で入力してください。' })
  @IsNotEmpty({ message: '単価コードを入力してください。' })
  @MaxLength(10, { message: '単価コードは最大10文字で入力してください。' })
  tanka_code!: string;

  @ApiProperty({ description: '単価名', maxLength: 100, example: '基本購読料（月額）' })
  @IsString({ message: '単価名は文字列で入力してください。' })
  @IsNotEmpty({ message: '単価名を入力してください。' })
  @MaxLength(100, { message: '単価名は最大100文字で入力してください。' })
  tanka_name!: string;

  @ApiPropertyOptional({ description: '税率（%）0〜100', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '税率は数値で指定してください。' })
  @Min(0, { message: '税率は0以上で指定してください。' })
  @Max(100, { message: '税率は100以下で指定してください。' })
  tax_rate?: number;

  // DB column is NUMERIC(10, 0) — max 10 integer digits (9,999,999,999).
  // Without @Max the BE INSERT throws PostgreSQL numeric overflow which
  // surfaces as 500. @Max + @IsInt below makes it a clean 400 instead.
  @ApiPropertyOptional({ description: '税込金額（円）0〜9,999,999,999', example: 4900 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '税込金額は整数で指定してください。' })
  @Min(0, { message: '税込金額は0以上で指定してください。' })
  @Max(9_999_999_999, {
    message: '税込金額は10桁以下で入力してください。',
  })
  kingaku_zeikomi?: number;

  @ApiPropertyOptional({ description: '税抜金額（円）0〜9,999,999,999', example: 4455 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '税抜金額は整数で指定してください。' })
  @Min(0, { message: '税抜金額は0以上で指定してください。' })
  @Max(9_999_999_999, {
    message: '税抜金額は10桁以下で入力してください。',
  })
  kingaku_zeinuki?: number;

  @ApiProperty({ description: '適用開始日（YYYY-MM-DD）', example: '2026-04-01' })
  @IsString({ message: '適用開始日は文字列で入力してください。' })
  @IsNotEmpty({ message: '適用開始日を入力してください。' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '適用開始日は YYYY-MM-DD 形式で入力してください。',
  })
  tekiyo_start_date!: string;

  @ApiProperty({ description: '適用終了日（YYYY-MM-DD）', example: '2027-03-31' })
  @IsString({ message: '適用終了日は文字列で入力してください。' })
  @IsNotEmpty({ message: '適用終了日を入力してください。' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '適用終了日は YYYY-MM-DD 形式で入力してください。',
  })
  tekiyo_end_date!: string;

  @ApiPropertyOptional({ description: '備考（空欄可）', example: '' })
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください。' })
  biko?: string;

  @ApiPropertyOptional({
    description: '運用上の有効フラグ（省略時は TRUE）',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    return value;
  })
  @IsBoolean({ message: '有効フラグは真偽値で指定してください。' })
  active_flg?: boolean;
}

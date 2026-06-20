import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** `YYYY-MM-DD` — 適用日。 */
const TEKIYO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Coerce a query/body value into a number array. Query strings arrive as a
 * single value (`?kanri_shiten_id=20`) or an array; normalise both to
 * `number[]` so `@IsInt({ each: true })` can validate. Non-numeric members
 * become `NaN` → rejected by `@IsInt`.
 */
const toNumberArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) return value;
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => (v === '' || v === null ? Number.NaN : Number(v)));
};

/**
 * 管理支店ごとの備考（出力API body の `remarks` 配列の要素）。帳票の
 * 「＜備考＞」欄に印字する。
 */
export class ZougenNichinoRemarkDto {
  @ApiProperty({ description: '対象の管理支店ID', example: 20 })
  @Type(() => Number)
  @IsInt({ message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_id!: number;

  @ApiPropertyOptional({ description: '備考テキスト（最大1000文字）', maxLength: 1000 })
  @IsOptional()
  @IsString({ message: '備考は文字列で指定してください。' })
  @MaxLength(1000, { message: '備考は1000文字以内で入力してください。' })
  biko?: string;
}

/**
 * Shared query/body DTO for both 増減通知（日本農業新聞） endpoints:
 *   - GET  /api/v1/report/zougen-nichino/preview (ACSMS-API-029-001)
 *   - POST /api/v1/report/zougen-nichino/export  (ACSMS-API-029-002)
 *
 * tekiyo_date は必須（未入力時は ACSMS-MSG-029-004「必須項目です。」）。
 * kanri_shiten_id は任意の数値配列（未指定時は全管理支店対象）。
 * remarks は出力API のみで使用（プレビューでは無視される）。
 */
export class ZougenNichinoQueryDto {
  @ApiProperty({ description: '適用日（YYYY-MM-DD）', example: '2026-03-01' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '適用日は文字列で指定してください。' })
  @Matches(TEKIYO_DATE_RE, {
    message: '適用日はYYYY-MM-DD形式で指定してください。',
  })
  tekiyo_date!: string;

  @ApiPropertyOptional({
    description: '管理支店ID（複数選択可）。未指定時は全管理支店を対象とする',
    type: [Number],
  })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray({ message: '管理支店IDの形式が不正です。' })
  @IsInt({ each: true, message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_id?: number[];

  @ApiPropertyOptional({
    description: '管理支店ごとの備考（出力API のみ）。未指定可',
    type: [ZougenNichinoRemarkDto],
  })
  @IsOptional()
  @IsArray({ message: '備考の形式が不正です。' })
  @ValidateNested({ each: true })
  @Type(() => ZougenNichinoRemarkDto)
  remarks?: ZougenNichinoRemarkDto[];
}

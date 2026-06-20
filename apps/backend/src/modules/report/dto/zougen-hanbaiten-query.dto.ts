import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/** `YYYY-MM-DD` — 適用日。 */
const TEKIYO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Coerce a query/body value into a number array. Query strings arrive as a
 * single value (`?hanbaiten_id=200`) or an array (`?hanbaiten_id=200&…=201`);
 * normalise both to `number[]` so `@IsInt({ each: true })` can validate.
 * Non-numeric members become `NaN` → rejected by `@IsInt`.
 */
const toNumberArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) return value;
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => (v === '' || v === null ? Number.NaN : Number(v)));
};

/**
 * Shared query/body DTO for both 増減連絡票（販売店） endpoints:
 *   - GET  /api/v1/report/zougen-hanbaiten/preview (ACSMS-API-028-001)
 *   - POST /api/v1/report/zougen-hanbaiten/export  (ACSMS-API-028-002)
 *
 * tekiyo_date は必須（未入力時は ACSMS-MSG-028-004「必須項目です。」）。
 * hanbaiten_id / kanri_shiten_id は任意の数値配列（未指定時は全件対象）。
 */
export class ZougenHanbaitenQueryDto {
  @ApiProperty({ description: '適用日（YYYY-MM-DD）', example: '2026-05-01' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '適用日は文字列で指定してください。' })
  @Matches(TEKIYO_DATE_RE, {
    message: '適用日はYYYY-MM-DD形式で指定してください。',
  })
  tekiyo_date!: string;

  @ApiPropertyOptional({
    description: '販売店ID（複数選択可）。未指定時は全販売店を対象とする',
    type: [Number],
  })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray({ message: '販売店IDの形式が不正です。' })
  @IsInt({ each: true, message: '販売店IDは整数で指定してください。' })
  hanbaiten_id?: number[];

  @ApiPropertyOptional({
    description: '管理支店ID（複数選択可）。未指定時は全管理支店を対象とする',
    type: [Number],
  })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray({ message: '管理支店IDの形式が不正です。' })
  @IsInt({ each: true, message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_id?: number[];
}

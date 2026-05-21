// Screen: __SCREEN_ID__ — __SCREEN__
//
// Placeholders:
//   __ENTITY__ = entity class (e.g. "Tanka")
//
// Field rules copied from api.md §2 リクエストパラメータ. Validation decorators
// MUST match every constraint listed (required, min, max, pattern, etc.).
// @ApiProperty MUST accompany every field for Swagger/Orval.
//
// m_code-referenced columns (api.md description ends with ※m_code.code_category='XXX'を参照):
//   - DO NOT use @IsEnum — there is no TypeScript enum.
//   - Use @IsInt() (or @IsString) for shape only.
//   - Allowed-value check lives in the service via CodeService.has('XXX', dto.field).
//   See .claude/rules/nestjs.md §Master code values.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Create__ENTITY__Dto {
  @ApiProperty({ description: 'JA ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  ja_id: number;

  // TODO(/gen-code-backend): replace below with real fields from api.md §2.
  //   Each row maps to one property. For "必須=〇" add @IsNotEmpty.
  //   For varchar(n) add @MaxLength(n). For int add @Type + @IsInt + @Min/@Max.

  // @ApiProperty({ description: 'コード', example: 'A001', maxLength: 20 })
  // @IsString()
  // @IsNotEmpty()
  // @MaxLength(20)
  // @Matches(/^[A-Za-z0-9]+$/, { message: '半角英数字のみ入力可能です' })
  // xxx_code: string;

  // @ApiPropertyOptional({ description: '備考', example: '...' })
  // @IsOptional()
  // @IsString()
  // @MaxLength(1000)
  // biko?: string;
}

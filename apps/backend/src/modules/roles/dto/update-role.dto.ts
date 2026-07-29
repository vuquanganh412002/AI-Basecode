import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** `@IsOptional` の前に空文字を `undefined` に変換。 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * PUT /api/v1/roles/{role_id} のボディ（ACSMS-API-027-003）。
 * `role_code` は意図的に未宣言 — グローバル `ValidationPipe` の
 * `forbidNonWhitelisted: true` が紛れ込みを拒否。api.md §3 注記:
 * 「role_code は更新不可（画面側でdisabled）」。
 */
export class UpdateRoleDto {
  @ApiProperty({ description: 'ロール名称', maxLength: 20 })
  @IsString({ message: 'ロール名は文字列で入力してください。' })
  @IsNotEmpty({ message: 'ロール名は必須です。' })
  @MaxLength(20, { message: 'ロール名は最大20文字で入力してください。' })
  role_name!: string;

  @ApiPropertyOptional({ description: '説明', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '説明は文字列で入力してください。' })
  @MaxLength(200, { message: '説明は最大200文字で入力してください。' })
  description?: string;

  @ApiProperty({
    description: '紐付ける権限IDの配列（空配列で全権限解除）',
    type: [Number],
    example: [1, 2, 28],
  })
  @IsArray({ message: '権限IDは配列で指定してください。' })
  @Type(() => Number)
  @IsInt({ each: true, message: '権限IDは整数で指定してください。' })
  permission_ids!: number[];
}

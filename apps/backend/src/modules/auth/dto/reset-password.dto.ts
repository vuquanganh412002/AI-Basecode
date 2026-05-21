import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Half-width-only regex (printable ASCII excluding space). Same rule as
 * `LoginDto.password` — `パスワードは半角文字のみで入力してください。`
 * fires for full-width / space input.
 */
const HALFWIDTH_RE = /^[\x21-\x7E]+$/;

/**
 * Request body for ACSMS-API-012-003 — POST /api/v1/auth/reset-password.
 *
 * Validation is split across DTO + service for clear, single-concern
 * messages (priority picker only emits ONE message per field):
 *   DTO  : required → length 8-32 → half-width
 *   Service: ≥2 of 3 categories (alpha/digit/symbol) — see
 *           `AuthService.assertNewPasswordCategories`
 *           confirm_password === new_password match
 *           new_password ≠ login_id
 *
 * This mirrors `LoginDto`'s decorator chain so SCR-001 and SCR-012 emit
 * the same half-width / length error literals for the password field.
 */
export class ResetPasswordDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', minLength: 36, maxLength: 36 })
  @IsString({ message: 'リセットトークンを入力してください。' })
  @IsNotEmpty({ message: 'リセットトークンを入力してください。' })
  @Length(36, 36, { message: 'リセットトークンの形式が不正です。' })
  @IsUUID('all', { message: 'リセットトークンの形式が不正です。' })
  token!: string;

  @ApiProperty({ example: 'NewPass123', minLength: 8, maxLength: 32 })
  @IsString({ message: '新しいパスワードを入力してください。' })
  @IsNotEmpty({ message: '新しいパスワードを入力してください。' })
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください。' })
  @MaxLength(32, { message: 'パスワードは32文字以内で入力してください。' })
  @Matches(HALFWIDTH_RE, {
    message: 'パスワードは半角文字のみで入力してください。',
  })
  new_password!: string;

  @ApiProperty({ example: 'NewPass123', minLength: 8, maxLength: 32 })
  @IsString({ message: '確認用パスワードを入力してください。' })
  @IsNotEmpty({ message: '確認用パスワードを入力してください。' })
  confirm_password!: string;
}

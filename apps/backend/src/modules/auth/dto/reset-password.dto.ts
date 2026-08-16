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

// 半角のみ regex(空白除く印字可能 ASCII)。`LoginDto.password` と同一 —
// 全角/空白入力で `パスワードは半角文字のみで入力してください。`。
const HALFWIDTH_RE = /^[\x21-\x7E]+$/;

/**
 * ACSMS-API-012-003 — POST /api/v1/auth/reset-password リクエストボディ。
 * 検証は DTO + service に分割し1フィールド1メッセージ化(priority picker は1件のみ emit):
 *   DTO   : required → length 8-32 → 半角
 *   Service: 3種のうち2種以上(英字/数字/記号) / confirm_password === new_password /
 *           new_password ≠ login_id
 * LoginDto の decorator chain をミラーし ACSMS-SCR-001/ACSMS-SCR-012 で同一の半角/長さエラー文言。
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

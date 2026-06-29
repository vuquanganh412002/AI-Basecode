import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Request body for ACSMS-API-012-001 — POST /api/v1/auth/forgot-password.
 *
 * Accepts BOTH a login_id and an email. `email` is NOT unique in
 * m_account (it is a 通知先メールアドレス, ※空文字許容), so matching by email
 * alone would pick an arbitrary account among duplicates. The unique key
 * is `login_id`, so the service narrows by (login_id AND email) to target
 * exactly one account. Account existence is still hidden from the response
 * (always 200) per §セキュリティ #1 — account enumeration prevention; a
 * login_id/email pair that matches nothing yields the same success body as
 * a real one.
 */
export class ForgotPasswordDto {
  // login_id rules mirror LoginDto so the two screens validate identically.
  @ApiProperty({ example: 'admin01', maxLength: 20 })
  @IsString({ message: 'ユーザーIDを入力してください。' })
  @IsNotEmpty({ message: 'ユーザーIDを入力してください。' })
  @MaxLength(20, { message: 'ユーザーIDは20文字以内で入力してください。' })
  @Matches(/^[\x21-\x7E]+$/, {
    message: 'ユーザーIDは半角文字のみで入力してください。',
  })
  login_id!: string;

  @ApiProperty({ example: 'user@example.com', maxLength: 100 })
  @IsString({ message: 'メールアドレスを入力してください。' })
  @IsNotEmpty({ message: 'メールアドレスを入力してください。' })
  @MaxLength(100, { message: 'メールアドレスは100文字以内で入力してください。' })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください。' })
  email!: string;
}

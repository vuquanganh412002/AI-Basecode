import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Request body for ACSMS-API-012-001 — POST /api/v1/auth/forgot-password.
 *
 * The endpoint accepts only an email and is rate-limited at the controller
 * layer. Account existence is hidden from the response (always 200) per
 * §セキュリティ #1 — account enumeration prevention.
 */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', maxLength: 100 })
  @IsString({ message: 'メールアドレスを入力してください。' })
  @IsNotEmpty({ message: 'メールアドレスを入力してください。' })
  @MaxLength(100, { message: 'メールアドレスは100文字以内で入力してください。' })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください。' })
  email!: string;
}

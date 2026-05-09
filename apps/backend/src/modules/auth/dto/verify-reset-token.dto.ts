import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

/**
 * Request body for ACSMS-API-012-002 — POST /api/v1/auth/reset-password/verify.
 *
 * The token is the raw UUID surfaced to the user via email; the server
 * compares it against `t_mfa_otp.otp_code_hash` (bcrypt) of the active
 * row with `otp_type=2`.
 */
export class VerifyResetTokenDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', minLength: 36, maxLength: 36 })
  @IsString({ message: 'リセットトークンを入力してください。' })
  @IsNotEmpty({ message: 'リセットトークンを入力してください。' })
  @Length(36, 36, { message: 'リセットトークンの形式が不正です。' })
  @IsUUID('all', { message: 'リセットトークンの形式が不正です。' })
  token!: string;
}

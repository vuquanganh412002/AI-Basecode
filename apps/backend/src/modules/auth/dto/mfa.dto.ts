import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class MfaVerifyDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString({ message: 'MFAトークンは文字列で指定してください。' })
  @IsNotEmpty({ message: 'MFAトークンは必須です。' })
  mfa_token: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString({ message: '認証コードは文字列で指定してください。' })
  @IsNotEmpty({ message: '認証コードを入力してください。' })
  @Length(6, 6, { message: '認証コードは6桁の数字で入力してください。' })
  @Matches(/^\d{6}$/, { message: '認証コードは6桁の数字で入力してください。' })
  otp_code: string;
}

export class MfaResendDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString({ message: 'MFAトークンは文字列で指定してください。' })
  @IsNotEmpty({ message: 'MFAトークンは必須です。' })
  mfa_token: string;
}

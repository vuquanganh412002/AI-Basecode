import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', minLength: 1, maxLength: 20 })
  @IsString({ message: 'ユーザーIDを入力してください。' })
  @IsNotEmpty({ message: 'ユーザーIDを入力してください。' })
  @MaxLength(20, { message: 'ユーザーIDは20文字以内で入力してください。' })
  @Matches(/^[\x21-\x7E]+$/, { message: 'ユーザーIDは半角文字のみで入力してください。' })
  login_id: string;

  @ApiProperty({ example: 'Admin@1234', minLength: 8, maxLength: 32 })
  @IsString({ message: 'パスワードを入力してください。' })
  @IsNotEmpty({ message: 'パスワードを入力してください。' })
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください。' })
  @MaxLength(32, { message: 'パスワードは32文字以内で入力してください。' })
  @Matches(/^[\x21-\x7E]+$/, { message: 'パスワードは半角文字のみで入力してください。' })
  password: string;
}

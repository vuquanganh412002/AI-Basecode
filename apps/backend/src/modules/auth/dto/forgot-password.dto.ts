import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * ACSMS-API-012-001 — POST /api/v1/auth/forgot-password リクエストボディ。
 * login_id と email の両方を受ける。email は m_account で一意でない（通知先メール
 * アドレス, ※空文字許容）ため email 単独では重複中の任意行を拾う。一意キーは
 * login_id なので service は (login_id AND email) で1件に絞る。§セキュリティ #1 の
 * enumeration 対策で応答は常に 200、一致なしペアも実在と同一の成功ボディを返す。
 */
export class ForgotPasswordDto {
  // login_id ルールは LoginDto と同一（2画面で同じ検証）。
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

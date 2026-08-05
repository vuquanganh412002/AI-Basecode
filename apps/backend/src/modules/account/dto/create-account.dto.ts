import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { IsNotReservedLoginId } from '@/common/decorators/not-reserved-login-id.decorator';
import { IsStrongPassword } from '@/common/decorators/strong-password.decorator';

/**
 * 空文字 → undefined 変換。`@IsOptional()` は null/undefined のみスキップし "" は
 * 通さないため、フォームが送る `email: ""` を `@IsEmail` が 400 で弾くのを防ぐ。
 * `.claude/rules/nestjs.md §DTO validation gotchas` 参照。
 */
const blankToUndef = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * POST /api/v1/accounts のボディ（ACSMS-API-025-002）。
 * フィールド規則は docs/design/ACSMS-SCR-025 api.md §4.1 に準拠。
 */
export class CreateAccountDto {
  @ApiProperty({ description: 'ログインID（半角英数字+_）', maxLength: 20 })
  @IsString({ message: 'ログインIDは文字列で指定してください。' })
  @IsNotEmpty({ message: 'ログインIDは必須です。' })
  @MaxLength(20, { message: 'ログインIDは最大20文字で指定してください。' })
  @Matches(/^\w+$/, {
    message: 'ログインIDは半角英数字とアンダースコアのみで指定してください。',
  })
  @IsNotReservedLoginId()
  login_id!: string;

  @ApiProperty({ description: 'パスワード（8〜32文字、半角英字・数字・記号の3種のうち2種以上）', minLength: 8, maxLength: 32 })
  @IsString({ message: 'パスワードは文字列で指定してください。' })
  @IsNotEmpty({ message: 'パスワードは必須です。' })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ description: '管理者区分（1〜5）', minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt({ message: '管理者区分は整数で指定してください。' })
  @Min(1, { message: '管理者区分は1〜5の範囲で指定してください。' })
  @Max(5, { message: '管理者区分は1〜5の範囲で指定してください。' })
  role_id!: number;

  @ApiPropertyOptional({ description: '都道府県コード（2桁）', minLength: 2, maxLength: 2 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '都道府県コードは文字列で指定してください。' })
  @Length(2, 2, { message: '都道府県コードは2桁で指定してください。' })
  todofuken_code?: string | null;

  @ApiPropertyOptional({ description: 'JA ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'JA IDは整数で指定してください。' })
  ja_id?: number | null;

  @ApiPropertyOptional({ description: '管理支店ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_id?: number | null;

  @ApiPropertyOptional({
    description:
      '所属支店ID (FK: m_shiten)。JA管理支店アカウントのみ設定可（任意）。設定時は' +
      'その支店の読者のみ参照・編集・追加でき、帳票5画面は使用不可（顧客要件 2026-07）。',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '支店IDは整数で指定してください。' })
  shiten_id?: number | null;

  @ApiProperty({ description: 'アカウント名', maxLength: 50 })
  @IsString({ message: 'アカウント名は文字列で指定してください。' })
  @IsNotEmpty({ message: 'アカウント名は必須です。' })
  @MaxLength(50, { message: 'アカウント名は最大50文字で指定してください。' })
  account_name!: string;

  // [email-required] QA review 2026-05 — 主 通知先メールアドレスを必須化。空だと
  // SCR-023 の通知ワーカーが宛先を落とし、当該ユーザは通知を受け取れないため。
  // サブメールは任意のまま。
  @ApiProperty({ description: 'メールアドレス（最大100桁）', maxLength: 100 })
  @IsString({ message: 'メールアドレスは文字列で指定してください。' })
  @IsNotEmpty({ message: 'メールアドレスは必須です。' })
  @MaxLength(100, { message: 'メールアドレスは最大100文字で指定してください。' })
  @IsEmail({}, { message: 'メールアドレスの形式が不正です。' })
  email!: string;

  @ApiPropertyOptional({ description: 'サブメールアドレス1（空欄可、最大100桁）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @MaxLength(100, { message: 'サブメールアドレス1は最大100文字で指定してください。' })
  @IsEmail({}, { message: 'サブメールアドレス1の形式が不正です。' })
  sub_email_1?: string;

  @ApiPropertyOptional({ description: 'サブメールアドレス2（空欄可、最大100桁）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @MaxLength(100, { message: 'サブメールアドレス2は最大100文字で指定してください。' })
  @IsEmail({}, { message: 'サブメールアドレス2の形式が不正です。' })
  sub_email_2?: string;

  @ApiPropertyOptional({ description: 'サブメールアドレス3（空欄可、最大100桁）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @MaxLength(100, { message: 'サブメールアドレス3は最大100文字で指定してください。' })
  @IsEmail({}, { message: 'サブメールアドレス3の形式が不正です。' })
  sub_email_3?: string;

  @ApiPropertyOptional({ description: '紙版取扱フラグ（デフォルト false）' })
  @IsOptional()
  @IsBoolean({ message: '紙版取扱フラグはboolean型で指定してください。' })
  paper_flg?: boolean;

  @ApiPropertyOptional({ description: '電子版取扱フラグ（デフォルト false）' })
  @IsOptional()
  @IsBoolean({ message: '電子版取扱フラグはboolean型で指定してください。' })
  denshi_flg?: boolean;

  @ApiPropertyOptional({ description: '備考（空欄可）' })
  @IsOptional()
  @IsString({ message: '備考は文字列で指定してください。' })
  biko?: string;
}

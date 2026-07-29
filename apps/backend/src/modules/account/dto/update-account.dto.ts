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
  MaxLength,
  Max,
  Min,
} from 'class-validator';

import { IsStrongPassword } from '@/common/decorators/strong-password.decorator';

/** 空文字 → undefined（理由は create-account.dto.ts 参照）。 */
const blankToUndef = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * PUT /api/v1/accounts/{account_id} のボディ（ACSMS-API-025-003）。
 *
 * `login_id` は意図的に未宣言 — グローバル ValidationPipe の
 * `forbidNonWhitelisted: true` が紛れ込みを拒否（api.md §3 注記: login_id は
 * 更新不可、画面側でdisabled）。
 *
 * `password` は任意（空欄可）— 空/undefined は「変更なし」。非空時は
 * strong-password ポリシー適用。
 */
export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: 'パスワード（変更時のみ入力。空欄は変更しない）',
    minLength: 8,
    maxLength: 32,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'パスワードは文字列で指定してください。' })
  @IsStrongPassword()
  password?: string;

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

  // [email-required] QA review 2026-05 — 更新でも主 通知先メールアドレスを必須化。
  // `?: string` でなく `string` に保ち、service の `email: dto.email ?? ''` が列を
  // 誤って空にしないようにする。サブメールは任意のまま。
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

  @ApiPropertyOptional({ description: '紙版取扱フラグ' })
  @IsOptional()
  @IsBoolean({ message: '紙版取扱フラグはboolean型で指定してください。' })
  paper_flg?: boolean;

  @ApiPropertyOptional({ description: '電子版取扱フラグ' })
  @IsOptional()
  @IsBoolean({ message: '電子版取扱フラグはboolean型で指定してください。' })
  denshi_flg?: boolean;

  @ApiPropertyOptional({
    description:
      'アカウントロックフラグ。false を送ると login_failure_count もリセットされ、ロックが解除される。',
  })
  @IsOptional()
  @IsBoolean({
    message: 'アカウントロックフラグはboolean型で指定してください。',
  })
  account_lock_flg?: boolean;

  @ApiPropertyOptional({ description: '備考（空欄可）' })
  @IsOptional()
  @IsString({ message: '備考は文字列で指定してください。' })
  biko?: string;
}

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
  MaxLength,
} from 'class-validator';

/**
 * Class-transformer hook: collapse empty / whitespace-only string to
 * `undefined` so `@IsOptional()` correctly skips downstream validators
 * (e.g. `@Matches(/^\d+$/)` on optional fields like `tel`/`fax`).
 *
 * Without this, a frontend posting `tel: ""` triggers the regex check
 * and fails validation, even though `tel` is optional.
 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Create JA request body — API-005-002.
 *
 * `zei_kubun` references m_code.code_category='ZEI_KUBUN' (1=内税, 2=外税).
 * The allowed-value check lives in the service via CodeService.has().
 */
export class CreateJaDto {
  @ApiProperty({ description: 'JAコード（一意制約）', maxLength: 10, example: '1301003001' })
  @IsString({ message: 'JAコードは文字列で入力してください。' })
  @IsNotEmpty({ message: 'JAコードを入力してください。' })
  @MaxLength(10, { message: 'JAコードは10文字以内で入力してください。' })
  ja_code!: string;

  @ApiProperty({ description: 'JA名', maxLength: 200, example: 'JA東京みどり' })
  @IsString({ message: 'JA名は文字列で入力してください。' })
  @IsNotEmpty({ message: 'JA名を入力してください。' })
  @MaxLength(200, { message: 'JA名は200文字以内で入力してください。' })
  ja_name!: string;

  @ApiPropertyOptional({ description: 'JA名（カナ・半角カタカナ）', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'JA名(カナ)は文字列で入力してください。' })
  @MaxLength(200, { message: 'JA名(カナ)は200文字以内で入力してください。' })
  @Matches(/^[ｦ-ﾟ\s0-9]+$/u, {
    message: 'JA名(カナ)は半角カタカナ・半角数字で入力してください。',
  })
  ja_name_kana?: string;

  @ApiProperty({ description: '都道府県コード', example: '13' })
  @IsString({ message: '都道府県コードは文字列で入力してください。' })
  @IsNotEmpty({ message: '都道府県コードを入力してください。' })
  @Length(2, 2, { message: '都道府県コードは2文字で入力してください。' })
  todofuken_code!: string;

  @ApiProperty({ description: '中央会フラグ（true: 中央会, false: 単協）', example: false })
  @IsBoolean({ message: '中央会フラグにはtrue/falseを指定してください。' })
  chuokai_flg!: boolean;

  @ApiPropertyOptional({ description: '郵便番号（半角数字7桁）', example: '1600022' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '郵便番号は文字列で入力してください。' })
  @Matches(/^\d{7}$/, { message: '郵便番号は半角数字のみ（ハイフンなし）入力可能です。' })
  yubin_no?: string;

  @ApiPropertyOptional({ description: '住所', maxLength: 200 })
  @IsOptional()
  @IsString({ message: '住所は文字列で入力してください。' })
  @MaxLength(200, { message: '住所は200文字以内で入力してください。' })
  address?: string;

  @ApiPropertyOptional({ description: '電話番号（半角数字のみ）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '電話番号は文字列で入力してください。' })
  @MaxLength(15, { message: '電話番号は15文字以内で入力してください。' })
  @Matches(/^\d+$/, { message: '電話番号は半角数字のみ（ハイフンなし）入力可能です。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号（半角数字のみ）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で入力してください。' })
  @MaxLength(15, { message: 'FAX番号は15文字以内で入力してください。' })
  @Matches(/^\d+$/, { message: 'FAXは半角数字のみ（ハイフンなし）入力可能です。' })
  fax?: string;

  @ApiPropertyOptional({ description: 'メールアドレス', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'メールアドレスは文字列で入力してください。' })
  @MaxLength(100, { message: 'メールアドレスは100文字以内で入力してください。' })
  @IsEmail({}, { message: 'メールアドレスの形式が不正です。' })
  email?: string;

  @ApiPropertyOptional({ description: '担当部署名', maxLength: 100 })
  @IsOptional()
  @IsString({ message: '担当部署名は文字列で入力してください。' })
  @MaxLength(100, { message: '担当部署名は100文字以内で入力してください。' })
  tanto_busho?: string;

  @ApiPropertyOptional({ description: '担当者名', maxLength: 50 })
  @IsOptional()
  @IsString({ message: '担当者名は文字列で入力してください。' })
  @MaxLength(50, { message: '担当者名は50文字以内で入力してください。' })
  tanto_name?: string;

  @ApiProperty({
    description: '税区分 ※m_code.code_category=\'ZEI_KUBUN\'を参照（1:内税, 2:外税）',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: '税区分は整数で入力してください。' })
  zei_kubun!: number;

  // 委託者コード — half-width alphanumeric, NO space.
  @ApiPropertyOptional({ description: 'JASTEM_委託者コード ※空文字許容', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '委託者コードは文字列で入力してください。' })
  @MaxLength(10, { message: '委託者コードは10文字以内で入力してください。' })
  @Matches(/^[A-Za-z0-9]+$/, {
    message: '委託者コードは半角英数字で入力してください（スペース不可）。',
  })
  jastem_itakusha_code?: string;

  // 委託者名 — 銀行charset限定：半角カナ ｱ-ﾟ・A-Z・0-9・. ( ) -（顧客要件 2026-06-25。漢字/ひらがな/全角不可）。
  // FE: utils/kana.ts JASTEM_NAME_RE と正規表現・メッセージを一致させること。
  @ApiPropertyOptional({ description: 'JASTEM_委託者名 ※空文字許容', maxLength: 40 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '委託者名は文字列で入力してください。' })
  @MaxLength(40, { message: '委託者名は40文字以内で入力してください。' })
  @Matches(/^[ｱ-ﾟ A-Z0-9.()\-]+$/, {
    message:
      '委託者名は半角カタカナ・半角英大文字（A-Z）・半角数字・記号（. ( ) -）のみ入力できます。',
  })
  jastem_itakusha_name?: string;

  // 農協番号 — half-width digits only.
  @ApiPropertyOptional({ description: 'JASTEM_農協番号 ※空文字許容', maxLength: 4 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '農協番号は文字列で入力してください。' })
  @MaxLength(4, { message: '農協番号は4文字以内で入力してください。' })
  @Matches(/^\d+$/, {
    message: '農協番号は半角数字で入力してください。',
  })
  jastem_ja_code?: string;

  // 農協名 — 銀行charset限定：半角カナ ｱ-ﾟ・A-Z・0-9・. ( ) -（顧客要件 2026-06-25。漢字/ひらがな/全角不可）。
  // FE: utils/kana.ts JASTEM_NAME_RE と一致。
  @ApiPropertyOptional({ description: 'JASTEM_農協名 ※空文字許容', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '農協名は文字列で入力してください。' })
  @MaxLength(15, { message: '農協名は15文字以内で入力してください。' })
  @Matches(/^[ｱ-ﾟ A-Z0-9.()\-]+$/, {
    message:
      '農協名は半角カタカナ・半角英大文字（A-Z）・半角数字・記号（. ( ) -）のみ入力できます。',
  })
  jastem_ja_name?: string;

  @ApiPropertyOptional({ description: '備考', maxLength: 500 })
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください。' })
  @MaxLength(500, { message: '備考は500文字以内で入力してください。' })
  biko?: string;
}

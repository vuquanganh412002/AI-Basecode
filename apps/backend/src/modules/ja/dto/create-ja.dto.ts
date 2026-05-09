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
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  ja_code!: string;

  @ApiProperty({ description: 'JA名', maxLength: 200, example: 'JA東京みどり' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  ja_name!: string;

  @ApiPropertyOptional({ description: 'JA名（カナ）', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[ァ-ヶー　\s]+$/u, {
    message: 'JA名(カナ)は全角カタカナで入力してください。',
  })
  ja_name_kana?: string;

  @ApiProperty({ description: '都道府県コード', example: '13' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  todofuken_code!: string;

  @ApiProperty({ description: '中央会フラグ（true: 中央会, false: 単協）', example: false })
  @IsBoolean()
  chuokai_flg!: boolean;

  @ApiProperty({ description: '金融機関コード（半角数字4桁）', example: '1234' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, { message: '金融機関コードは半角数字4桁で入力してください。' })
  bank_code!: string;

  @ApiProperty({ description: '金融機関名', maxLength: 100, example: '農林中央金庫' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bank_name!: string;

  @ApiPropertyOptional({ description: '郵便番号（半角数字7桁）', example: '1600022' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @Matches(/^\d{7}$/, { message: '郵便番号は半角数字7桁で入力してください。' })
  yubin_no?: string;

  @ApiPropertyOptional({ description: '住所', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ description: '電話番号（半角数字のみ）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Matches(/^\d+$/, { message: '電話番号は半角数字のみで入力してください。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号（半角数字のみ）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Matches(/^\d+$/, { message: 'FAXは半角数字のみで入力してください。' })
  fax?: string;

  @ApiPropertyOptional({ description: 'メールアドレス', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsEmail({}, { message: 'メールアドレスの形式が不正です' })
  email?: string;

  @ApiPropertyOptional({ description: '担当部署名', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tanto_busho?: string;

  @ApiPropertyOptional({ description: '担当者名', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tanto_name?: string;

  @ApiProperty({
    description: '税区分 ※m_code.code_category=\'ZEI_KUBUN\'を参照（1:内税, 2:外税）',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  zei_kubun!: number;

  @ApiPropertyOptional({ description: '備考', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  biko?: string;
}

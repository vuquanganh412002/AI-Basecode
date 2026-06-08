import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Request body for ACSMS-API-009-003 — PUT /api/v1/kanri-shiten/:id.
 *
 * Drops `ja_id` + `kanri_shiten_code` from CreateKanriShitenDto:
 *   - `ja_id`: not in the update body (managed branch is fixed after creation)
 *   - `kanri_shiten_code`: immutable after create per api.md §APIS-009-003 注記
 *
 * `forbidNonWhitelisted: true` on the global ValidationPipe rejects extra
 * fields, but smuggled values would never bind because the DTO has no
 * matching property — `plainToInstance` drops them. Spec asserts that
 * (`dto.ja_id` is `undefined` even when client sneaks it in).
 *
 * Per api.md §4.1, required fields on update are `kanri_shiten_name` +
 * `todofuken_code`. All other fields are optional.
 */
export class UpdateKanriShitenDto {
  @ApiProperty({ description: '管理支店名', maxLength: 100 })
  @IsString({ message: '管理支店名を入力してください。' })
  @IsNotEmpty({ message: '管理支店名を入力してください。' })
  @MaxLength(100, { message: '管理支店名は最大100文字で入力してください。' })
  kanri_shiten_name!: string;

  @ApiPropertyOptional({ description: '管理支店名（カナ・半角カタカナ）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '管理支店名（カナ）は最大100文字で入力してください。' })
  @Matches(/^[ｦ-ﾟ\s0-9]+$/u, {
    message: '管理支店名(カナ)は半角カタカナ・半角数字で入力してください。',
  })
  kanri_shiten_name_kana?: string;

  @ApiProperty({ description: '都道府県コード（m_todofukenに存在すること）', minLength: 2, maxLength: 2 })
  @IsString({ message: '都道府県を選択してください。' })
  @IsNotEmpty({ message: '都道府県を選択してください。' })
  @Length(2, 2, { message: '都道府県コードは2文字で指定してください。' })
  todofuken_code!: string;

  @ApiPropertyOptional({ description: '郵便番号（半角数字7桁）', minLength: 7, maxLength: 7 })
  @Transform(blankToUndef)
  @IsOptional()
  @Matches(/^\d{7}$/, { message: '郵便番号は半角数字のみ（ハイフンなし）入力可能です。' })
  yubin_no?: string;

  @ApiPropertyOptional({ description: '住所', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '住所は最大200文字で入力してください。' })
  address?: string;

  @ApiPropertyOptional({ description: '電話番号（半角数字のみ）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @Matches(/^\d{1,15}$/, { message: '電話番号は半角数字のみ（ハイフンなし）入力可能です。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号（半角数字のみ）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @Matches(/^\d{1,15}$/, { message: 'FAXは半角数字のみ（ハイフンなし）入力可能です。' })
  fax?: string;

  @ApiPropertyOptional({ description: '紙版取扱フラグ', default: false })
  @IsOptional()
  @IsBoolean({ message: '紙版フラグはブール値で指定してください。' })
  paper_flg?: boolean;

  @ApiPropertyOptional({ description: '電子版取扱フラグ', default: false })
  @IsOptional()
  @IsBoolean({ message: '電子版フラグはブール値で指定してください。' })
  denshi_flg?: boolean;

  @ApiPropertyOptional({ description: '備考', maxLength: 500 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '備考は最大500文字で入力してください。' })
  biko?: string;
}

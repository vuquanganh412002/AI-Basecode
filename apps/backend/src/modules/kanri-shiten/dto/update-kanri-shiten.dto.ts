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
 * PUT /api/v1/kanri-shiten/:id (ACSMS-API-009-003) リクエストボディ。
 * CreateKanriShitenDto から ja_id + kanri_shiten_code を除外:
 *   - ja_id: 更新 body に無い（管理支店は作成後固定）
 *   - kanri_shiten_code: 作成後変更不可（api.md §APIS-009-003 注記）
 * global ValidationPipe の forbidNonWhitelisted: true が余剰フィールドを拒否するが、
 * smuggle 値は DTO に対応プロパティが無く plainToInstance が drop（spec が dto.ja_id=undefined を検証）。
 * api.md §4.1 の更新必須は kanri_shiten_name + todofuken_code、他は任意。
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

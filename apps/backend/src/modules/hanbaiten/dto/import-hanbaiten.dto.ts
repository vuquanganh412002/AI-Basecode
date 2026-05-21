import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Body of POST /api/v1/hanbaiten/import (ACSMS-API-019-002).
 *
 * Validation rules per docs/design/ACSMS-SCR-019/ACSMS-SCR-019-api.md §4.1.
 * - `import_mode` ∈ { NEW, UPDATE_ALL, UPDATE_PARTIAL }
 * - `selected_columns` carries 1..23 physical column names; the service
 *   layer re-asserts the `hanbaiten_code` membership for defence-in-depth
 *   (no DTO-level cross-field check is necessary since the rule
 *   collapses to "selected_columns must include hanbaiten_code").
 * - `rows` carries 1..500 row payloads. Cap is enforced again in the
 *   service to surface ROW_LIMIT_EXCEEDED with the project's error code
 *   when a future client bypasses the DTO max.
 *
 * m_code allow-list validation (itaku_kubun / tesuryo_kubun /
 * yokin_shubetsu) is the service layer's responsibility because
 * `class-validator` runs before Nest DI is wired.
 */

const IMPORT_MODES = ['NEW', 'UPDATE_ALL', 'UPDATE_PARTIAL'] as const;

export class ImportHanbaitenRowDto {
  @ApiProperty({ description: '販売店コード', maxLength: 10 })
  @IsString({ message: '販売店コードは文字列で指定してください。' })
  @IsNotEmpty({ message: '販売店コードは必須です。' })
  @MinLength(1, { message: '販売店コードは1文字以上で指定してください。' })
  @MaxLength(10, { message: '販売店コードは最大10文字で指定してください。' })
  hanbaiten_code!: string;

  @ApiPropertyOptional({ description: '販売店名称', maxLength: 100 })
  @IsOptional()
  @IsString({ message: '販売店名称は文字列で指定してください。' })
  @MaxLength(100, { message: '販売店名称は最大100文字で指定してください。' })
  hanbaiten_name?: string;

  @ApiPropertyOptional({ description: '販売店名称(カナ)', maxLength: 100 })
  @IsOptional()
  @IsString({ message: '販売店名称(カナ)は文字列で指定してください。' })
  @MaxLength(100, {
    message: '販売店名称(カナ)は最大100文字で指定してください。',
  })
  hanbaiten_name_kana?: string;

  @ApiPropertyOptional({ description: 'インボイス番号', maxLength: 20 })
  @IsOptional()
  @IsString({ message: 'インボイス番号は文字列で指定してください。' })
  @MaxLength(20, { message: 'インボイス番号は最大20文字で指定してください。' })
  torihikisaki_no?: string;

  @ApiPropertyOptional({ description: '郵便番号(7桁)' })
  @IsOptional()
  @IsString({ message: '郵便番号は文字列で指定してください。' })
  @Length(7, 7, { message: '郵便番号は7桁で指定してください。' })
  yubin_no?: string;

  @ApiPropertyOptional({ description: '住所', maxLength: 200 })
  @IsOptional()
  @IsString({ message: '住所は文字列で指定してください。' })
  @MaxLength(200, { message: '住所は最大200文字で指定してください。' })
  address?: string;

  @ApiPropertyOptional({ description: '電話番号', maxLength: 15 })
  @IsOptional()
  @IsString({ message: '電話番号は文字列で指定してください。' })
  @MaxLength(15, { message: '電話番号は最大15文字で指定してください。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号', maxLength: 15 })
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で指定してください。' })
  @MaxLength(15, { message: 'FAX番号は最大15文字で指定してください。' })
  fax?: string;

  @ApiPropertyOptional({ description: '所長名', maxLength: 50 })
  @IsOptional()
  @IsString({ message: '所長名は文字列で指定してください。' })
  @MaxLength(50, { message: '所長名は最大50文字で指定してください。' })
  shocho_name?: string;

  @ApiPropertyOptional({ description: '委託区分 (m_code ITAKU_KUBUN)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '委託区分は整数で指定してください。' })
  itaku_kubun?: number;

  @ApiPropertyOptional({ description: '配達手数料単価コード', maxLength: 10 })
  @IsOptional()
  @IsString({ message: '配達手数料単価コードは文字列で指定してください。' })
  @MaxLength(10, {
    message: '配達手数料単価コードは最大10文字で指定してください。',
  })
  haitatsuryo_tanka_code?: string;

  @ApiPropertyOptional({ description: '金融機関コード', maxLength: 4 })
  @IsOptional()
  @IsString({ message: '金融機関コードは文字列で指定してください。' })
  @MaxLength(4, { message: '金融機関コードは最大4文字で指定してください。' })
  bank_code?: string;

  @ApiPropertyOptional({ description: '金融機関名', maxLength: 100 })
  @IsOptional()
  @IsString({ message: '金融機関名は文字列で指定してください。' })
  @MaxLength(100, { message: '金融機関名は最大100文字で指定してください。' })
  bank_name?: string;

  @ApiPropertyOptional({ description: '配達手数料支払サイクル(月数)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '配達手数料支払サイクルは整数で指定してください。' })
  @Min(0, {
    message: '配達手数料支払サイクルは0以上で指定してください。',
  })
  haitatsuryo_shiharai_cycle?: number;

  @ApiPropertyOptional({ description: '口座支店コード', maxLength: 3 })
  @IsOptional()
  @IsString({ message: '口座支店コードは文字列で指定してください。' })
  @MaxLength(3, { message: '口座支店コードは最大3文字で指定してください。' })
  bank_branch_code?: string;

  @ApiPropertyOptional({ description: '口座支店名', maxLength: 100 })
  @IsOptional()
  @IsString({ message: '口座支店名は文字列で指定してください。' })
  @MaxLength(100, { message: '口座支店名は最大100文字で指定してください。' })
  bank_branch_name?: string;

  @ApiPropertyOptional({ description: '口座種別 (m_code YOKIN_SHUBETSU)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '口座種別は整数で指定してください。' })
  yokin_shubetsu?: number;

  @ApiPropertyOptional({ description: '口座番号', maxLength: 10 })
  @IsOptional()
  @IsString({ message: '口座番号は文字列で指定してください。' })
  @MaxLength(10, { message: '口座番号は最大10文字で指定してください。' })
  koza_no?: string;

  @ApiPropertyOptional({ description: '口座名義', maxLength: 50 })
  @IsOptional()
  @IsString({ message: '口座名義は文字列で指定してください。' })
  @MaxLength(50, { message: '口座名義は最大50文字で指定してください。' })
  koza_meigi?: string;

  @ApiPropertyOptional({ description: '手数料区分 (m_code TESURYO_KUBUN)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '手数料区分は整数で指定してください。' })
  tesuryo_kubun?: number;

  @ApiPropertyOptional({ description: '手数料金額(≧0)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '手数料金額は整数で指定してください。' })
  @Min(0, { message: '手数料金額は0以上で指定してください。' })
  tesuryo_amount?: number;

  @ApiPropertyOptional({ description: '備考' })
  @IsOptional()
  @IsString({ message: '備考は文字列で指定してください。' })
  biko?: string;

  @ApiPropertyOptional({ description: '廃店フラグ' })
  @IsOptional()
  @IsBoolean({ message: '廃店フラグはboolean型で指定してください。' })
  haiten_flg?: boolean;
}

export class ImportHanbaitenDto {
  @ApiProperty({
    description: '取込モード',
    enum: IMPORT_MODES,
  })
  @IsString({ message: '取込モードは文字列で指定してください。' })
  @IsNotEmpty({ message: '取込モードは必須です。' })
  @IsIn(IMPORT_MODES, {
    message:
      '取込モードは NEW / UPDATE_ALL / UPDATE_PARTIAL のいずれかを指定してください。',
  })
  import_mode!: (typeof IMPORT_MODES)[number];

  @ApiProperty({
    description: '取込対象列(物理名)。1〜23件。',
    type: [String],
  })
  @IsArray({ message: '取込対象列は配列で指定してください。' })
  @ArrayMinSize(1, { message: '取込対象列は1件以上で指定してください。' })
  @ArrayMaxSize(23, { message: '取込対象列は23件以下で指定してください。' })
  @IsString({ each: true, message: '取込対象列は文字列で指定してください。' })
  selected_columns!: string[];

  @ApiProperty({
    description: '取込データ。1〜500件。',
    type: [ImportHanbaitenRowDto],
  })
  @IsArray({ message: '取込データは配列で指定してください。' })
  @ArrayMinSize(1, { message: '取込データは1件以上で指定してください。' })
  @ArrayMaxSize(500, {
    message: '取込データ行数の上限(500行)を超えています。',
  })
  @ValidateNested({ each: true })
  @Type(() => ImportHanbaitenRowDto)
  rows!: ImportHanbaitenRowDto[];
}

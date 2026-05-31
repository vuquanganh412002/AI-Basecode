import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Empty-string → undefined transformer. `@IsOptional()` only skips
 * `null` / `undefined`, NOT `""`. Form posts send blank optional inputs
 * as `""` — without this, `@Matches` / `@MaxLength` would reject. See
 * `.claude/rules/nestjs.md §DTO validation gotchas`.
 */
const blankToUndef = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Half-width katakana regex. Project convention — half-width only
 * (Zengin / bank-CSV compatibility — see `.claude/rules/vue.md §Kana`).
 * Range `ｦ-ﾟ` (U+FF66-FF9F) covers letters + prolonged sound mark
 * + dakuten / handakuten. `\s` already includes the full-width space
 * U+3000, no need to add it explicitly.
 */
const HALF_WIDTH_KATAKANA_RE = /^[ｦ-ﾟ\s0-9]+$/u;

/**
 * Body for POST /api/v1/hanbaiten (ACSMS-API-017-002).
 *
 * Field rules sourced from docs/design/ACSMS-SCR-017 api.md §4.1
 * + 画面設計書 v1.2 §3.1. The conditional-required rule on No.17~23
 * (when itaku_kubun = 1) is a CROSS-FIELD check and lives in the
 * service layer (HanbaitenService.assertConditionalRequired), not here.
 * The m_code allow-list checks on itaku_kubun / tesuryo_kubun /
 * yokin_shubetsu also live in the service (CodeService.has) since
 * `class-validator` runs before Nest DI is wired.
 */
export class CreateHanbaitenDto {
  // [staff-ja-id] NICHINO_STAFF 代行入力 sends ja_id explicitly via the
  // form's <BaseJaDropdown> — session.ja_id is null for that role, so
  // the service falls back to this body field. Session-scoped roles
  // (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN) may also send it; the
  // service ignores it and uses session.ja_id instead, so cross-tenant
  // injection isn't possible.
  @ApiPropertyOptional({
    description: 'JA ID (NICHINO_STAFF 代行入力 専用)。',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'JA IDは整数で指定してください。' })
  @Min(1, { message: 'JA IDは1以上で指定してください。' })
  ja_id?: number;

  @ApiProperty({ description: '販売店コード', minLength: 1, maxLength: 10 })
  @IsString({ message: '販売店コードは文字列で指定してください。' })
  @IsNotEmpty({ message: '販売店コードは必須です。' })
  @MaxLength(10, { message: '販売店コードは最大10文字で指定してください。' })
  hanbaiten_code!: string;

  @ApiProperty({ description: '販売店名', minLength: 1, maxLength: 100 })
  @IsString({ message: '販売店名は文字列で指定してください。' })
  @IsNotEmpty({ message: '販売店名は必須です。' })
  @MaxLength(100, { message: '販売店名は最大100文字で指定してください。' })
  hanbaiten_name!: string;

  @ApiPropertyOptional({
    description: '販売店名（カナ、半角カタカナ）',
    maxLength: 100,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店名（カナ）は文字列で指定してください。' })
  @MaxLength(100, {
    message: '販売店名（カナ）は最大100文字で指定してください。',
  })
  @Matches(HALF_WIDTH_KATAKANA_RE, {
    message: '販売店名(カナ)は半角カタカナ・半角数字で入力してください。',
  })
  hanbaiten_name_kana?: string;

  @ApiPropertyOptional({
    description: '都道府県コード（2桁）',
    minLength: 2,
    maxLength: 2,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '都道府県コードは文字列で指定してください。' })
  @Length(2, 2, { message: '都道府県コードは2桁で指定してください。' })
  todofuken_code?: string;

  @ApiPropertyOptional({
    description: '適格請求書発行事業者番号',
    maxLength: 20,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '適格請求書発行事業者番号は文字列で指定してください。' })
  @MaxLength(20, {
    message: '適格請求書発行事業者番号は最大20文字で指定してください。',
  })
  torihikisaki_no?: string;

  @ApiPropertyOptional({ description: '郵便番号', maxLength: 7 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '郵便番号は文字列で指定してください。' })
  @MaxLength(7, { message: '郵便番号は最大7文字で指定してください。' })
  yubin_no?: string;

  @ApiPropertyOptional({ description: '住所', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '住所は文字列で指定してください。' })
  @MaxLength(200, { message: '住所は最大200文字で指定してください。' })
  address?: string;

  @ApiPropertyOptional({ description: '電話番号', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '電話番号は文字列で指定してください。' })
  @MaxLength(15, { message: '電話番号は最大15文字で指定してください。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で指定してください。' })
  @MaxLength(15, { message: 'FAX番号は最大15文字で指定してください。' })
  fax?: string;

  @ApiPropertyOptional({ description: '所長名', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '所長名は文字列で指定してください。' })
  @MaxLength(50, { message: '所長名は最大50文字で指定してください。' })
  shocho_name?: string;

  @ApiPropertyOptional({
    description: '委託区分（m_code.code_category=ITAKU_KUBUN）',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '委託区分は整数で指定してください。' })
  itaku_kubun?: number | null;

  @ApiPropertyOptional({
    description: '配達手数料単価ID（FK:m_tanka）',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '配達手数料単価IDは整数で指定してください。' })
  haitatsuryo_tanka_id?: number | null;

  @ApiPropertyOptional({
    description: '配達手数料支払サイクル（月数）',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '配達手数料支払サイクルは整数で指定してください。' })
  haitatsuryo_shiharai_cycle?: number | null;

  @ApiPropertyOptional({
    description: '振込手数料負担区分（m_code.code_category=TESURYO_KUBUN）',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '振込手数料負担区分は整数で指定してください。' })
  tesuryo_kubun?: number | null;

  @ApiPropertyOptional({ description: '手数料金額（≧0）', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '手数料金額は数値で指定してください。' })
  @Min(0, { message: '手数料金額は0以上で指定してください。' })
  tesuryo_amount?: number | null;

  @ApiPropertyOptional({
    description: '金融機関コード（itaku_kubun=1の場合は必須）',
    maxLength: 4,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '金融機関コードは文字列で指定してください。' })
  @MaxLength(4, {
    message: '金融機関コードは最大4文字で指定してください。',
  })
  bank_code?: string;

  @ApiPropertyOptional({
    description: '金融機関名（itaku_kubun=1の場合は必須）',
    maxLength: 100,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '金融機関名は文字列で指定してください。' })
  @MaxLength(100, {
    message: '金融機関名は最大100文字で指定してください。',
  })
  bank_name?: string;

  @ApiPropertyOptional({
    description: '口座支店コード（itaku_kubun=1の場合は必須）',
    maxLength: 3,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座支店コードは文字列で指定してください。' })
  @MaxLength(3, {
    message: '口座支店コードは最大3文字で指定してください。',
  })
  bank_branch_code?: string;

  @ApiPropertyOptional({
    description: '口座支店名（itaku_kubun=1の場合は必須）',
    maxLength: 100,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座支店名は文字列で指定してください。' })
  @MaxLength(100, {
    message: '口座支店名は最大100文字で指定してください。',
  })
  bank_branch_name?: string;

  @ApiPropertyOptional({
    description:
      '口座種別（m_code.code_category=YOKIN_SHUBETSU、itaku_kubun=1の場合は必須）',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '口座種別は整数で指定してください。' })
  yokin_shubetsu?: number | null;

  @ApiPropertyOptional({
    description: '口座番号（itaku_kubun=1の場合は必須）',
    maxLength: 10,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座番号は文字列で指定してください。' })
  @MaxLength(10, { message: '口座番号は最大10文字で指定してください。' })
  koza_no?: string;

  @ApiPropertyOptional({
    description: '口座名義（itaku_kubun=1の場合は必須）',
    maxLength: 50,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座名義は文字列で指定してください。' })
  @MaxLength(50, { message: '口座名義は最大50文字で指定してください。' })
  koza_meigi?: string;

  @ApiPropertyOptional({
    description: '廃店フラグ（true:廃店, false:営業中、省略時はfalse）',
  })
  @IsOptional()
  @IsBoolean({ message: '廃店フラグはboolean型で指定してください。' })
  haiten_flg?: boolean;

  @ApiPropertyOptional({ description: '備考' })
  @IsOptional()
  @IsString({ message: '備考は文字列で指定してください。' })
  biko?: string;
}

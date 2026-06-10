import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Coerce blank cells (`""` after xlsx sheet_to_json with `defval: ''`)
 * to `undefined` so `@IsOptional` actually short-circuits the
 * downstream length / format validators. Per `.claude/rules/nestjs.md
 * §DTO validation gotchas #1`. Wire BEFORE `@IsOptional()` so the
 * coerced `undefined` reaches it.
 *
 * Also coerce a JS `number` → `string`. Excel stores numeric-looking
 * cells (郵便番号, 金融機関コード, 口座番号, 口座支店コード, …) as numbers,
 * so `sheet_to_json` hands them to the DTO as `number`. These columns
 * are VARCHAR on the BE (leading zeros / fixed widths matter), so a bare
 * `@IsString` would reject the whole row — and because the failure is a
 * nested-row error it collapses to a single generic
 * "取込データ / 入力値が不正です" line. Stringifying here lets a numeric
 * cell pass `@IsString`, and the downstream `@Length` / `@Matches` still
 * catch genuinely malformed values with their field-level message.
 */
const blankToUndef = ({ value }: { value: unknown }) => {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
};

/**
 * Numeric variant — replaces the `@Type(() => Number) + @Transform(blankToUndef)`
 * combo for optional numeric fields. `@Type(() => Number)` runs at the
 * class-transformer step and turns `""` into `0`, defeating the blank
 * transform downstream. This single-pass version handles BOTH coercions:
 *   - blank string / null / undefined → undefined  (so @IsOptional skips)
 *   - non-blank string                → Number(s)  (so @IsInt passes)
 *   - already numeric                 → pass through
 * Use INSTEAD of `@Type(() => Number)` on optional numeric DTO fields.
 */
const blankOrNumber = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  return value;
};

/**
 * Half-width katakana regex — mirrors create-hanbaiten.dto.ts (kept inline
 * per `.claude/rules/vue.md §Kana` so the FE/BE contract stays grep-able).
 * Range `ｦ-ﾟ` (U+FF66-FF9F) = letters + prolonged mark + dakuten/handakuten;
 * `\s` already includes the full-width space U+3000. Half-width digits are
 * allowed (店名 may carry a 半角 number).
 */
const HALF_WIDTH_KATAKANA_RE = /^[ｦ-ﾟ\s0-9]+$/u;

/**
 * Excel-friendly boolean coercion for 廃店フラグ. xlsx cells reach the DTO
 * as a JS boolean, a number, or a string ('TRUE' / '1' / '○' / …) depending
 * on how the user typed the cell — a bare `@IsBoolean` would 400 the whole
 * import on a perfectly intended `1`. Maps the common truthy/falsy forms;
 * blank → undefined (so `@IsOptional` skips, service defaults to false); an
 * unrecognised value passes through unchanged so `@IsBoolean` rejects it
 * with the field-level message.
 */
const TRUE_TOKENS = new Set(['true', '1', '○', '〇', '◯', '✓', 'yes', 'y']);
const FALSE_TOKENS = new Set(['false', '0', '×', '✕', 'no', 'n']);
const excelToBool = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const t = value.trim().toLowerCase();
    if (t === '') return undefined;
    if (TRUE_TOKENS.has(t)) return true;
    if (FALSE_TOKENS.has(t)) return false;
  }
  return value;
};

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
 * m_code allow-list validation (itaku_kubun / furikomi_tesuryo_futan_kubun /
 * yokin_shubetsu) is the service layer's responsibility because
 * `class-validator` runs before Nest DI is wired.
 */

const IMPORT_MODES = ['NEW', 'UPDATE_ALL', 'UPDATE_PARTIAL'] as const;

export class ImportHanbaitenRowDto {
  @ApiProperty({ description: '販売店コード', maxLength: 10 })
  @Transform(blankToUndef)
  @IsString({ message: '販売店コードは文字列で指定してください。' })
  @IsNotEmpty({ message: '販売店コードは必須です。' })
  @MinLength(1, { message: '販売店コードは1文字以上で指定してください。' })
  @MaxLength(10, { message: '販売店コードは最大10文字で指定してください。' })
  hanbaiten_code!: string;

  @ApiPropertyOptional({ description: '販売店名称', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店名称は文字列で指定してください。' })
  @MaxLength(100, { message: '販売店名称は最大100文字で指定してください。' })
  hanbaiten_name?: string;

  @ApiPropertyOptional({ description: '販売店名称(カナ)', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '販売店名称(カナ)は文字列で指定してください。' })
  @MaxLength(100, {
    message: '販売店名称(カナ)は最大100文字で指定してください。',
  })
  @Matches(HALF_WIDTH_KATAKANA_RE, {
    message: '販売店名称(カナ)は半角カタカナ・半角数字で入力してください。',
  })
  hanbaiten_name_kana?: string;

  @ApiPropertyOptional({ description: 'インボイス番号', maxLength: 20 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'インボイス番号は文字列で指定してください。' })
  @MaxLength(20, { message: 'インボイス番号は最大20文字で指定してください。' })
  torihikisaki_no?: string;

  @ApiPropertyOptional({ description: '郵便番号(7桁)' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '郵便番号は文字列で指定してください。' })
  @Length(7, 7, { message: '郵便番号は7桁で指定してください。' })
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
  @Matches(/^\d+$/, {
    message: '電話番号は半角数字のみ（ハイフンなし）入力可能です。',
  })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で指定してください。' })
  @MaxLength(15, { message: 'FAX番号は最大15文字で指定してください。' })
  @Matches(/^\d+$/, {
    message: 'FAXは半角数字のみ（ハイフンなし）入力可能です。',
  })
  fax?: string;

  @ApiPropertyOptional({ description: '所長名', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '所長名は文字列で指定してください。' })
  @MaxLength(50, { message: '所長名は最大50文字で指定してください。' })
  shocho_name?: string;

  @ApiPropertyOptional({ description: '委託区分 (m_code ITAKU_KUBUN)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '委託区分は整数で指定してください。' })
  itaku_kubun?: number;

  @ApiPropertyOptional({ description: '配達手数料単価コード', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '配達手数料単価コードは文字列で指定してください。' })
  @MaxLength(10, {
    message: '配達手数料単価コードは最大10文字で指定してください。',
  })
  haitatsuryo_tanka_code?: string;

  @ApiPropertyOptional({ description: '金融機関コード', maxLength: 4 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '金融機関コードは文字列で指定してください。' })
  @MaxLength(4, { message: '金融機関コードは最大4文字で指定してください。' })
  bank_code?: string;

  @ApiPropertyOptional({ description: '金融機関名', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '金融機関名は文字列で指定してください。' })
  @MaxLength(100, { message: '金融機関名は最大100文字で指定してください。' })
  bank_name?: string;

  @ApiPropertyOptional({ description: '配達手数料支払サイクル(月数)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '配達手数料支払サイクルは整数で指定してください。' })
  @Min(0, {
    message: '配達手数料支払サイクルは0以上で指定してください。',
  })
  haitatsuryo_shiharai_cycle?: number;

  @ApiPropertyOptional({ description: '口座支店コード', maxLength: 3 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座支店コードは文字列で指定してください。' })
  @MaxLength(3, { message: '口座支店コードは最大3文字で指定してください。' })
  bank_branch_code?: string;

  @ApiPropertyOptional({ description: '口座支店名', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座支店名は文字列で指定してください。' })
  @MaxLength(100, { message: '口座支店名は最大100文字で指定してください。' })
  bank_branch_name?: string;

  @ApiPropertyOptional({ description: '口座種別 (m_code YOKIN_SHUBETSU)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '口座種別は整数で指定してください。' })
  yokin_shubetsu?: number;

  @ApiPropertyOptional({ description: '口座番号', maxLength: 10 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座番号は文字列で指定してください。' })
  @MaxLength(10, { message: '口座番号は最大10文字で指定してください。' })
  koza_no?: string;

  @ApiPropertyOptional({ description: '口座名義', maxLength: 50 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '口座名義は文字列で指定してください。' })
  @MaxLength(50, { message: '口座名義は最大50文字で指定してください。' })
  koza_meigi?: string;

  @ApiPropertyOptional({ description: '振込手数料負担区分 (m_code TESURYO_KUBUN)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '振込手数料負担区分は整数で指定してください。' })
  furikomi_tesuryo_futan_kubun?: number;

  @ApiPropertyOptional({ description: '振込手数料(≧0)' })
  @Transform(blankOrNumber)
  @IsOptional()
  @IsInt({ message: '振込手数料は整数で指定してください。' })
  @Min(0, { message: '振込手数料は0以上で指定してください。' })
  furikomi_tesuryo?: number;

  @ApiPropertyOptional({ description: '備考' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '備考は文字列で指定してください。' })
  biko?: string;

  @ApiPropertyOptional({ description: '廃店フラグ' })
  @Transform(excelToBool)
  @IsOptional()
  @IsBoolean({ message: '廃店フラグは true / false（1 / 0）で指定してください。' })
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

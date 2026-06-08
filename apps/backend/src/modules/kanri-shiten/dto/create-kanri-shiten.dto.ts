import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Coerce blank strings to `undefined` BEFORE `@IsOptional` runs. Forms
 * post `tel: ""` for empty inputs; without this transform `@Matches(/^\d+$/)`
 * would reject the empty string and 400. See `.claude/rules/nestjs.md
 * §DTO validation gotchas`.
 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Canonical 管理支店コード shape — three HALF-WIDTH DIGIT groups joined
 * by hyphens (3-4-3 = e.g. "013-3300-001"). Customer spec rejects any
 * non-digit character (alphabet was previously accepted by mistake —
 * fixed 2026-05-19). Mirrored on the FE as `KANRI_SHITEN_CODE_REGEX`
 * in `apps/frontend/src/utils/formatters.ts`.
 */
const KANRI_SHITEN_CODE_REGEX = /^\d{3}-\d{4}-\d{3}$/;

/**
 * Normalise a 管理支店コード input:
 *   - If already dashed (`NNN-NNNN-NNN`) → keep as-is.
 *   - If exactly 10 digits (no dashes) → insert dashes at positions
 *     3 and 7 → `NNN-NNNN-NNN`.
 *   - Otherwise → return trimmed input unchanged so the @Matches check
 *     below produces the expected validation error.
 * Belt-and-suspenders with the FE `formatKanriShitenCode()` helper — if
 * a client bypasses the form, the BE still stores the canonical form.
 */
const normalizeKanriShitenCode = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (KANRI_SHITEN_CODE_REGEX.test(trimmed)) return trimmed;
  if (/^\d{10}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 7)}-${trimmed.slice(7)}`;
  }
  return trimmed;
};

/**
 * Request body for ACSMS-API-009-002 — POST /api/v1/kanri-shiten.
 *
 * Field constraints mirror api.md §リクエストパラメータ + §4.1.
 * `paper_flg` / `denshi_flg` default to `false` per api.md and
 * `database-design.md §m_kanri_shiten`.
 */
export class CreateKanriShitenDto {
  @ApiProperty({ description: 'JA ID（m_ja.ja_idに存在すること）', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'JAを選択してください。' })
  ja_id!: number;

  @ApiProperty({
    description:
      '管理支店コード（一意制約）。フォーマット「XXX-XXXX-XXX」（半角英数字）。'
      + 'ハイフン無しの10桁入力は自動的にハイフンを挿入する。',
    example: '113-3300-001',
    maxLength: 12,
  })
  // Normalise FIRST (bare 10 chars → dashed), THEN enforce the strict
  // dashed shape. @Matches runs after the transform per class-validator
  // execution order.
  @Transform(normalizeKanriShitenCode)
  @IsString({ message: '管理支店コードを入力してください。' })
  @IsNotEmpty({ message: '管理支店コードを入力してください。' })
  @Matches(KANRI_SHITEN_CODE_REGEX, {
    message:
      '管理支店コードは「NNN-NNNN-NNN」の形式（半角数字とハイフンのみ）で入力してください。',
  })
  kanri_shiten_code!: string;

  @ApiProperty({ description: '管理支店名', maxLength: 100 })
  @IsString({ message: '管理支店名を入力してください。' })
  @IsNotEmpty({ message: '管理支店名を入力してください。' })
  @MaxLength(100, { message: '管理支店名は最大100文字で入力してください。' })
  kanri_shiten_name!: string;

  @ApiPropertyOptional({ description: '管理支店名（カナ・半角カタカナ）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '管理支店名（カナ）は文字列で入力してください。' })
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
  @IsString({ message: '郵便番号は文字列で入力してください。' })
  @Matches(/^\d{7}$/, { message: '郵便番号は半角数字のみ（ハイフンなし）入力可能です。' })
  yubin_no?: string;

  @ApiPropertyOptional({ description: '住所', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '住所は文字列で入力してください。' })
  @MaxLength(200, { message: '住所は最大200文字で入力してください。' })
  address?: string;

  @ApiPropertyOptional({ description: '電話番号（半角数字のみ）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '電話番号は文字列で入力してください。' })
  @Matches(/^\d{1,15}$/, { message: '電話番号は半角数字のみ（ハイフンなし）入力可能です。' })
  tel?: string;

  @ApiPropertyOptional({ description: 'FAX番号（半角数字のみ）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'FAX番号は文字列で入力してください。' })
  @Matches(/^\d{1,15}$/, { message: 'FAX番号は半角数字のみ（ハイフンなし）入力可能です。' })
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
  @IsString({ message: '備考は文字列で入力してください。' })
  @MaxLength(500, { message: '備考は最大500文字で入力してください。' })
  biko?: string;
}

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

// 空文字→undefined（@IsOptional 前に実行）。フォームは空入力を tel: "" で送るため、
// これ無しだと @Matches(/^\d+$/) が空文字を拒否し 400。.claude/rules/nestjs.md §DTO validation gotchas
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * 管理支店コード正規形 — 半角数字 3 群をハイフン連結 (3-4-3 = 例 "013-3300-001")。
 * 顧客仕様は非数字を拒否（以前アルファベットを誤許容 — 2026-05-19 修正）。
 * FE の apps/frontend/src/utils/formatters.ts `KANRI_SHITEN_CODE_REGEX` とミラー。
 */
const KANRI_SHITEN_CODE_REGEX = /^\d{3}-\d{4}-\d{3}$/;

/**
 * 管理支店コードの正規化:
 *   - ハイフン付き (NNN-NNNN-NNN) → そのまま。
 *   - 10 桁数字（ハイフン無し）→ 位置 3, 7 にハイフン挿入 → NNN-NNNN-NNN。
 *   - それ以外 → trim のみ（下の @Matches が期待どおりのエラーを出す）。
 * FE formatKanriShitenCode() との二重防御 — フォーム迂回でも BE が正規形で保存。
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
 * POST /api/v1/kanri-shiten (ACSMS-API-009-002) リクエストボディ。
 * 制約は api.md §リクエストパラメータ + §4.1。paper_flg / denshi_flg 既定 false
 * (api.md, database-design.md §m_kanri_shiten)。
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
  // 先に正規化（10 桁→ハイフン付き）、その後厳密形を強制。
  // class-validator の実行順で @Matches は transform 後に走る。
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

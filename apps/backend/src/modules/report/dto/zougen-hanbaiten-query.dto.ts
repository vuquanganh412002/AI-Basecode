import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/** `YYYY-MM-DD` — 適用日。 */
const TEKIYO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * クエリ/body 値を number 配列へ正規化する。単一値（`?hanbaiten_id=200`）でも配列
 * （`?hanbaiten_id=200&…=201`）でも `number[]` に揃え、`@IsInt({ each: true })` で
 * 検証できるようにする。数値化できない要素は `NaN` → `@IsInt` で弾かれる。
 */
const toNumberArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) return value;
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => (v === '' || v === null ? Number.NaN : Number(v)));
};

/**
 * 増減連絡票（販売店）の両エンドポイント共通のクエリ/body DTO:
 *   - GET  /api/v1/report/zougen-hanbaiten/preview (ACSMS-API-028-001)
 *   - POST /api/v1/report/zougen-hanbaiten/export  (ACSMS-API-028-002)
 *
 * tekiyo_date は必須（未入力時は ACSMS-MSG-028-004「必須項目です。」）。
 * hanbaiten_id / kanri_shiten_id は任意の数値配列（未指定時は全件対象）。
 */
export class ZougenHanbaitenQueryDto {
  @ApiProperty({ description: '適用日（YYYY-MM-DD）', example: '2026-05-01' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '適用日は文字列で指定してください。' })
  @Matches(TEKIYO_DATE_RE, {
    message: '適用日はYYYY-MM-DD形式で指定してください。',
  })
  tekiyo_date!: string;

  @ApiPropertyOptional({
    description: '販売店ID（複数選択可）。未指定時は全販売店を対象とする',
    type: [Number],
  })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray({ message: '販売店IDの形式が不正です。' })
  @IsInt({ each: true, message: '販売店IDは整数で指定してください。' })
  hanbaiten_id?: number[];

  @ApiPropertyOptional({
    description: '管理支店ID（複数選択可）。未指定時は全管理支店を対象とする',
    type: [Number],
  })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray({ message: '管理支店IDの形式が不正です。' })
  @IsInt({ each: true, message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_id?: number[];

  // ─── ページ送り（preview のみ。export PDF は全件で無視）───────────────
  @ApiPropertyOptional({
    description: '文書ページ番号（1始まり）。preview のみ。未指定時は1',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ページ番号は整数で指定してください。' })
  @Min(1, { message: 'ページ番号は1以上で指定してください。' })
  page?: number;

  @ApiPropertyOptional({
    description: '1ページのレコード数。preview のみ。未指定時は15',
    example: 15,
    default: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '1ページの行数は整数で指定してください。' })
  @Min(1, { message: '1ページの行数は1以上で指定してください。' })
  @Max(500, { message: '1ページの行数は500以下で指定してください。' })
  per_page?: number;

  // ─── 発行日時（export のみ。PDFフッタに印字）───────────────────────────
  @ApiPropertyOptional({
    description: '発行日時（プレビュー押下時刻 YYYY/MM/DD HH:mm）。export のみ',
    example: '2026/06/25 10:58',
  })
  @IsOptional()
  @IsString({ message: '発行日時は文字列で指定してください。' })
  @Matches(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/, {
    message: '発行日時はYYYY/MM/DD HH:mm形式で指定してください。',
  })
  issued_at?: string;
}

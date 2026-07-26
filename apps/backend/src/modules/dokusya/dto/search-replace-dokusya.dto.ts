import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { DokusyaShubetsu } from '@/common/enums';

/**
 * Empty-string → undefined transformer. `@IsOptional()` only skips
 * `null` / `undefined`, NOT `""`. GET requests serialise blank inputs
 * as `?shimei=` — without this the format / length checks would reject
 * them at 400. See `.claude/rules/nestjs.md §DTO validation gotchas`.
 */
const blankToUndef = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** Allow-list of columns the FE can sort by (api.md §4.1 sort_by). */
const ALLOWED_SORT_COLUMNS = [
  'kanri_shiten_name',
  'shiten_name',
  'kumiaiin_code',
  'hanbaiten_code',
] as const;

/** `YYYY-MM-DD` literal — date-only filter format. */
const DATE_FORMAT_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FORMAT_MSG = '日付はYYYY-MM-DDの形式で指定してください。';

/**
 * Query DTO for `GET /api/v1/dokusya/replace-hanbaiten/search`
 * (ACSMS-API-015-001). Every search filter is optional; pagination /
 * sort carry project defaults (page=1, per_page=20,
 * sort_by=kumiaiin_code, sort_order=asc).
 *
 * The date_from > date_to correlation is a SERVICE-level business rule
 * (api.md §4.1 → DATE_RANGE_INVALID) — the DTO only checks each side's
 * YYYY-MM-DD format.
 */
export class SearchReplaceDokusyaDto {
  // ─── Equality filters ──────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '管理支店ID' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_id?: number;

  @ApiPropertyOptional({ description: '支店ID' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '支店IDは整数で指定してください。' })
  shiten_id?: number;

  @ApiPropertyOptional({ description: '配達販売店ID' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '販売店IDは整数で指定してください。' })
  hanbaiten_id?: number;

  // ─── Partial-match filters ────────────────────────────────────────────
  @ApiPropertyOptional({ description: '組合員コード（部分一致）', maxLength: 20 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '組合員コードは文字列で指定してください。' })
  @MaxLength(20, { message: '組合員コードは最大20文字で指定してください。' })
  kumiaiin_code?: string;

  @ApiPropertyOptional({ description: '氏名（shimei_sei + shimei_mei）部分一致', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '氏名は文字列で指定してください。' })
  @MaxLength(100, { message: '氏名は最大100文字で指定してください。' })
  shimei?: string;

  @ApiPropertyOptional({ description: 'かな氏名 部分一致', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'かな氏名は文字列で指定してください。' })
  @MaxLength(200, { message: 'かな氏名は最大200文字で指定してください。' })
  shimei_kana?: string;

  @ApiPropertyOptional({ description: '配達先住所（部分一致）', maxLength: 300 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '配達先住所は文字列で指定してください。' })
  @MaxLength(300, { message: '配達先住所は最大300文字で指定してください。' })
  haitatsu_address?: string;

  // ─── Date ranges (YYYY-MM-DD; from ≦ to enforced in service) ────────────
  @ApiPropertyOptional({ description: '購読開始日（範囲開始）YYYY-MM-DD' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読開始日（FROM）は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  dokusya_kaishi_date_from?: string;

  @ApiPropertyOptional({ description: '購読開始日（範囲終了）YYYY-MM-DD ※from ≦ to' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読開始日（TO）は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  dokusya_kaishi_date_to?: string;

  // ─── 情報変更適用日（必須・未来日のみ／顧客要件 2026-07。販売店適用日は廃止し
  //     joho に一本化）──────────────────────────────────────────────────────
  // この日付で「置換可能」な購読者のみ返す（dokusya_kaishi_date ≦ 適用日 かつ
  // dokusya_chushi_date が null または 適用日より後）。未来日チェックはサービス層。
  @ApiProperty({ description: '情報変更適用日（YYYY-MM-DD、必須）。紙版=未来日のみ／電子版=本日のみ（種別依存・サービス層）' })
  @IsNotEmpty({ message: '適用日を入力してください。' })
  @IsString({ message: '適用日は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  joho_henko_tekiyo_date!: string;

  // ─── 購読種別（必須・1:紙版 / 2:電子版 のみ／顧客要件 2026-07）──────────────
  // 一括置換の対象種別。紙版は未来日で予約置換、電子版は当日のみ置換（適用日ルール
  // は種別依存・サービス層）。この種別で購読者を絞り込む。3:併読 は対象外。
  @ApiProperty({
    description: '購読種別（1:紙版, 2:電子版）。一括置換の対象種別で絞り込む。',
    enum: [DokusyaShubetsu.PAPER, DokusyaShubetsu.DIGITAL],
  })
  @Type(() => Number)
  @IsInt({ message: '購読種別は整数で指定してください。' })
  @IsIn([DokusyaShubetsu.PAPER, DokusyaShubetsu.DIGITAL], {
    message: '購読種別は紙版または電子版で指定してください。',
  })
  dokusya_shubetsu!: number;

  // ─── Pagination + sort ────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'ページ番号（デフォルト: 1）', minimum: 1, default: 1 })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ページ番号は整数で指定してください。' })
  @Min(1, { message: 'ページ番号は1以上で指定してください。' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '1ページの件数（デフォルト: 20、最大: 100）',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '1ページの件数は整数で指定してください。' })
  @Min(1, { message: '1ページの件数は1以上で指定してください。' })
  @Max(100, { message: '1ページの件数は100以下で指定してください。' })
  per_page?: number = 20;

  @ApiPropertyOptional({
    description: 'ソートカラム',
    enum: ALLOWED_SORT_COLUMNS,
    default: 'kumiaiin_code',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'ソートカラムは文字列で指定してください。' })
  @IsIn([...ALLOWED_SORT_COLUMNS], { message: 'ソートカラムの値が不正です。' })
  sort_by?: string = 'kumiaiin_code';

  @ApiPropertyOptional({ description: 'ソート順（asc / desc、デフォルト: asc）', enum: ['asc', 'desc'] })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'ソート順は文字列で指定してください。' })
  @IsIn(['asc', 'desc'], { message: 'ソート順はasc / descのいずれかで指定してください。' })
  sort_order?: 'asc' | 'desc' = 'asc';
}

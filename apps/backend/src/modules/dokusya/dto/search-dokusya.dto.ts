import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Empty-string → undefined transformer. `@IsOptional()` only skips
 * `null` / `undefined`, NOT `""`. Form GET requests serialise blank
 * inputs as `?email=` — without this, `@IsEmail` rejects them at 400.
 * See `.claude/rules/nestjs.md §DTO validation gotchas`.
 */
const blankToUndef = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** Allow-list of columns the FE can sort by (api.md §4.1 sort_by). */
const ALLOWED_SORT_COLUMNS = [
  'dokusya_id',
  'kanri_shiten_id',
  'shiten_id',
  'kumiaiin_code',
  'hanbaiten_id',
  'shoki_dokusya_kaishi_date',
  'dokusya_chushi_date',
  'updated_at',
] as const;

/** YYYY/MM/DD literal — matches `'2026/01/01'` format. */
const DATE_FORMAT_RE = /^\d{4}\/\d{2}\/\d{2}$/;
const DATE_FORMAT_MSG = '日付はYYYY/MM/DDの形式で指定してください。';

/**
 * Query DTO for both:
 *   - GET /api/v1/dokusya          (list search — pagination + sort applied)
 *   - GET /api/v1/dokusya/export   (Excel export — page/per_page/sort_by/sort_order ignored)
 *
 * Both endpoints reuse the same DTO; the export controller drops the
 * pagination fields after binding. The DTO models FIELD-level validation;
 * date-range from ≦ to correlation is enforced via class-validator's
 * `@ValidateIf` on the `*_to` side so the spec's "either side carries
 * the error" assertion holds.
 *
 * sort_by allow-list is enforced HERE (not in the service) so the
 * search-dokusya.dto.ts.spec assertion sees a property-level error.
 * The service still re-validates the column against the SORT_COLUMN_MAP
 * to keep the SQL safe — belt-and-braces.
 */
export class SearchDokusyaDto {
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

  @ApiPropertyOptional({
    description: '引落元口座支店コード（部分一致）。物理カラムは bank_branch_code（レガシー名）',
    maxLength: 3,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '引落元口座支店コードは文字列で指定してください。' })
  @MaxLength(3, { message: '引落元口座支店コードは最大3文字で指定してください。' })
  jastem_toriatsukai_tenpo_code?: string;

  @ApiPropertyOptional({
    description: '引落元口座支店名（部分一致）。物理カラムは bank_branch_name（レガシー名）',
    maxLength: 100,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '引落元口座支店名は文字列で指定してください。' })
  @MaxLength(100, { message: '引落元口座支店名は最大100文字で指定してください。' })
  jastem_tenpo_name?: string;

  @ApiPropertyOptional({ description: '氏名（shimei_sei + shimei_mei）部分一致', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '氏名は文字列で指定してください。' })
  @MaxLength(100, { message: '氏名は最大100文字で指定してください。' })
  full_name?: string;

  @ApiPropertyOptional({ description: 'かな氏名 部分一致', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'かな氏名は文字列で指定してください。' })
  @MaxLength(100, { message: 'かな氏名は最大100文字で指定してください。' })
  full_name_kana?: string;

  @ApiPropertyOptional({ description: '連絡先１（部分一致）', maxLength: 15 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '連絡先１は文字列で指定してください。' })
  @MaxLength(15, { message: '連絡先１は最大15文字で指定してください。' })
  renrakusaki_1?: string;

  @ApiPropertyOptional({ description: '配達先住所（部分一致）', maxLength: 200 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '配達先住所は文字列で指定してください。' })
  @MaxLength(200, { message: '配達先住所は最大200文字で指定してください。' })
  haitatsu?: string;

  @ApiPropertyOptional({ description: 'メールアドレス（部分一致、メール形式）', maxLength: 100 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'メールアドレスは文字列で指定してください。' })
  @MaxLength(100, { message: 'メールアドレスは最大100文字で指定してください。' })
  @IsEmail({}, { message: '正しいメール形式を入力してください。' })
  email?: string;

  @ApiPropertyOptional({ description: '請求開始月（YYYYMM、部分一致）', maxLength: 6 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '請求開始月は文字列で指定してください。' })
  @MaxLength(6, { message: '請求開始月は最大6文字で指定してください。' })
  seikyu_kaishi_month?: string;

  // ─── Date ranges ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '購読開始日（範囲開始）YYYY/MM/DD' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読開始日（FROM）は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  shoki_dokusya_kaishi_date_from?: string;

  @ApiPropertyOptional({ description: '購読開始日（範囲終了）YYYY/MM/DD ※from ≦ to' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読開始日（TO）は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  @ValidateIf(
    (o: SearchDokusyaDto) =>
      typeof o.shoki_dokusya_kaishi_date_from === 'string' &&
      typeof o.shoki_dokusya_kaishi_date_to === 'string' &&
      o.shoki_dokusya_kaishi_date_from > o.shoki_dokusya_kaishi_date_to,
  )
  @Matches(/^$/, {
    message: '購読開始日（TO）は購読開始日（FROM）以降の日付を指定してください。',
  })
  shoki_dokusya_kaishi_date_to?: string;

  @ApiPropertyOptional({ description: '購読中止日（範囲開始）YYYY/MM/DD' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読中止日（FROM）は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  dokusya_chushi_date_from?: string;

  @ApiPropertyOptional({ description: '購読中止日（範囲終了）YYYY/MM/DD ※from ≦ to' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '購読中止日（TO）は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  @ValidateIf(
    (o: SearchDokusyaDto) =>
      typeof o.dokusya_chushi_date_from === 'string' &&
      typeof o.dokusya_chushi_date_to === 'string' &&
      o.dokusya_chushi_date_from > o.dokusya_chushi_date_to,
  )
  @Matches(/^$/, {
    message: '購読中止日（TO）は購読中止日（FROM）以降の日付を指定してください。',
  })
  dokusya_chushi_date_to?: string;

  @ApiPropertyOptional({ description: '適用日（範囲開始）YYYY/MM/DD' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '適用日（FROM）は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  joho_henko_tekiyo_date_from?: string;

  @ApiPropertyOptional({ description: '適用日（範囲終了）YYYY/MM/DD ※from ≦ to' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '適用日（TO）は文字列で指定してください。' })
  @Matches(DATE_FORMAT_RE, { message: DATE_FORMAT_MSG })
  @ValidateIf(
    (o: SearchDokusyaDto) =>
      typeof o.joho_henko_tekiyo_date_from === 'string' &&
      typeof o.joho_henko_tekiyo_date_to === 'string' &&
      o.joho_henko_tekiyo_date_from > o.joho_henko_tekiyo_date_to,
  )
  @Matches(/^$/, {
    message: '適用日（TO）は適用日（FROM）以降の日付を指定してください。',
  })
  joho_henko_tekiyo_date_to?: string;

  // ─── m_code-bound integers (shape check only — value validated in service) ─
  @ApiPropertyOptional({ description: '購読種別（1:紙版, 2:電子版, 3:併読）' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '購読種別は整数で指定してください。' })
  @IsIn([1, 2, 3], { message: '購読種別の値が不正です。' })
  dokusya_shubetsu?: number;

  @ApiPropertyOptional({
    description: '支払方法（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '支払方法は整数で指定してください。' })
  @IsIn([1, 2, 3, 4, 5, 6, 9], { message: '支払方法の値が不正です。' })
  shiharai_hoho?: number;

  @ApiPropertyOptional({ description: '手続種類（0:解約, 1:新規）' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '手続種類は整数で指定してください。' })
  @IsIn([0, 1], { message: '手続種類の値が不正です。' })
  tetsuzuki_shurui?: number;

  @ApiPropertyOptional({ description: '電子版承認ステータス（0:未承認, 1:承認済み, 2:否認）' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '電子版承認ステータスは整数で指定してください。' })
  @IsIn([0, 1, 2], { message: '電子版承認ステータスの値が不正です。' })
  denshi_shonin_status?: number;

  // ─── 失効単価参照フラグ（SCR-020 error gate 連携・顧客要件2026-07）──────────
  // true のとき、参照する購読料単価(tanka_type=1)が active_flg=FALSE の購読者
  // だけを抽出する（口座振替出力時に失効単価参照でブロックされた購読者を手動で
  // 新単価へ移行するための絞込）。GETクエリは文字列で届くため truthy 値のみ
  // true に変換し、それ以外は undefined にして絞り込まない。
  @ApiPropertyOptional({
    description:
      '失効単価(active_flg=false)を参照する購読者のみ抽出（true/1 のときのみ有効）',
    type: Boolean,
  })
  @Transform(({ value }) =>
    value === true || value === 'true' || value === '1' ? true : undefined,
  )
  @IsOptional()
  @IsBoolean({ message: '失効単価フラグの値が不正です。' })
  inactive_tanka_flg?: boolean;

  // ─── Pagination + sort ────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'ページ番号（デフォルト: 1）', minimum: 1 })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ページ番号は整数で指定してください。' })
  @Min(1, { message: 'ページ番号は1以上で指定してください。' })
  page?: number = 1;

  @ApiPropertyOptional({ description: '1ページの件数（デフォルト: 20、最大: 100）', minimum: 1, maximum: 100 })
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
    default: 'updated_at',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'ソートカラムは文字列で指定してください。' })
  @IsIn([...ALLOWED_SORT_COLUMNS], {
    message: 'ソートカラムの値が不正です。',
  })
  sort_by?: string = 'updated_at';

  @ApiPropertyOptional({ description: 'ソート順（asc / desc、デフォルト: desc）', enum: ['asc', 'desc'] })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'ソート順は文字列で指定してください。' })
  @IsIn(['asc', 'desc'], { message: 'ソート順はasc / descのいずれかで指定してください。' })
  sort_order?: 'asc' | 'desc' = 'desc';
}

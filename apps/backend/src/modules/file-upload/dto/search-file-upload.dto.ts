import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Coerce blank `""` / null / undefined to `undefined` so `@IsOptional`
 * short-circuits — query strings from the FE arrive as `''` rather
 * than missing keys, and class-validator's `@IsOptional` doesn't skip
 * empty strings by itself. Pair BEFORE `@IsOptional()`.
 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

// SCR-022 + SCR-023 share this list endpoint. SCR-023 added `file_size`
// as a sortable column per api.md §リクエストパラメータ row 5.
const SORTABLE_COLUMNS = [
  'upload_datetime',
  'file_name',
  'created_by',
  // 作成者列は表示名（m_account.account_name）でソートする。一覧画面の
  // ソートキーは列の `key='created_by_name'` を送るため許可値に含める。
  'created_by_name',
  'file_size',
] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

/**
 * Query DTO for `GET /api/v1/file-upload` (ACSMS-API-022-001).
 *
 * All fields are optional per api.md §リクエストパラメータ; the service
 * applies defaults (page=1, per_page=20, sort_by='upload_datetime',
 * sort_order='desc'). `sort_by` is whitelisted to prevent SQL
 * injection through dynamic ORDER BY composition.
 */
export class SearchFileUploadDto {
  @ApiPropertyOptional({ description: 'ファイル名（部分一致 LIKE）', maxLength: 255 })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: 'ファイル名は文字列で指定してください。' })
  @MaxLength(255, { message: 'ファイル名は最大255文字で指定してください。' })
  file_name?: string;

  @ApiPropertyOptional({ description: '都道府県コード（半角数字 2 桁）', example: '13' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '都道府県コードは文字列で指定してください。' })
  @Matches(/^\d{2}$/, {
    message: '都道府県コードは半角数字2桁で入力してください。',
  })
  todofuken_code?: string;

  // SCR-023 — JA filter (NICHINO_* only per api.md request param note).
  @ApiPropertyOptional({ description: 'JA ID（NICHINO_ADMIN/STAFFのみ指定可。指定なしの場合は全JA）' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'JA IDは整数で指定してください。' })
  @Min(1, { message: 'JA IDは1以上で指定してください。' })
  ja_id?: number;

  // SCR-023 — status filter (m_code.code_category='FILE_UPLOAD_STATUS').
  @ApiPropertyOptional({ description: '処理ステータス（1:処理中, 2:完了, 3:エラー）' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '処理ステータスは整数で指定してください。' })
  @IsIn([1, 2, 3], { message: '処理ステータスは1〜3で指定してください。' })
  status?: number;

  @ApiPropertyOptional({ description: 'ページ番号（1-indexed）', default: 1, minimum: 1 })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ページ番号は整数で指定してください。' })
  @Min(1, { message: 'ページ番号は 1 以上で指定してください。' })
  page?: number;

  @ApiPropertyOptional({
    description: '1ページあたりの件数',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '1ページあたりの件数は整数で指定してください。' })
  @Min(1, { message: '1ページあたりの件数は1〜100の範囲で指定してください。' })
  @Max(100, { message: '1ページあたりの件数は1〜100の範囲で指定してください。' })
  per_page?: number;

  @ApiPropertyOptional({
    description: 'ソート対象カラム',
    enum: SORTABLE_COLUMNS,
    default: 'upload_datetime',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @IsIn(SORTABLE_COLUMNS, {
    message: 'ソート対象カラムが不正です。',
  })
  sort_by?: (typeof SORTABLE_COLUMNS)[number];

  @ApiPropertyOptional({ description: 'ソート順', enum: SORT_ORDERS, default: 'desc' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsIn(SORT_ORDERS, { message: 'ソート順は asc または desc を指定してください。' })
  sort_order?: (typeof SORT_ORDERS)[number];
}

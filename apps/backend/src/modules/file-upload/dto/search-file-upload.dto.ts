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

import { FileUploadStatus } from '@/common/constants/file-upload-status.constant';

/**
 * 空文字 `""` / null / undefined を `undefined` に寄せ `@IsOptional` を
 * short-circuit させる。FE のクエリ文字列は欠落キーでなく `''` で届き、
 * class-validator の `@IsOptional` は空文字を単体では skip しないため。
 * `@IsOptional()` の前に置く。
 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

// ACSMS-SCR-022 + ACSMS-SCR-023 が共有する一覧エンドポイント。ACSMS-SCR-023 で
// api.md §リクエストパラメータ row 5 に従い `file_size` をソート列に追加。
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
 * `GET /api/v1/file-upload` (ACSMS-API-022-001) のクエリ DTO。
 *
 * 全フィールド任意(api.md §リクエストパラメータ)。既定値は service が付与
 * (page=1, per_page=20, sort_by='upload_datetime', sort_order='desc')。
 * `sort_by` は動的 ORDER BY 経由の SQL 注入を防ぐため許可値でホワイトリスト化。
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

  // ACSMS-SCR-023 — JA フィルタ(api.md 注記より NICHINO_* のみ指定可)。
  @ApiPropertyOptional({ description: 'JA ID（NICHINO_ADMIN/STAFFのみ指定可。指定なしの場合は全JA）' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'JA IDは整数で指定してください。' })
  @Min(1, { message: 'JA IDは1以上で指定してください。' })
  ja_id?: number;

  // ACSMS-SCR-023 — ステータスフィルタ(m_code.code_category='FILE_UPLOAD_STATUS')。
  @ApiPropertyOptional({ description: '処理ステータス（1:処理中, 2:完了, 3:エラー）' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '処理ステータスは整数で指定してください。' })
  @IsIn(Object.values(FileUploadStatus), {
    message: '処理ステータスは1〜3で指定してください。',
  })
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

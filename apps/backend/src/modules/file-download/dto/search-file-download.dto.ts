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
 * 空文字 `""` / null / undefined を undefined へ寄せる（`@IsOptional` の前に置く）。
 */
const blankToUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const SORT_KEYS = [
  'download_datetime',
  'file_name',
  'file_size',
  'created_by',
  'created_by_name',
] as const;

/** `GET /api/v1/file-download` クエリ（SCR-022 一覧）。 */
export class SearchFileDownloadDto {
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

  @ApiPropertyOptional({ description: 'JA ID（NICHINO_*のみ指定可。指定なしは全JA）' })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'JA IDは整数で指定してください。' })
  @Min(1, { message: 'JA IDは1以上で指定してください。' })
  ja_id?: number;

  @ApiPropertyOptional({
    description: 'ダウンロード種別（1:口座振替, 2:その他, 3:増減連絡票, 4:増減通知書, 5:購読者名簿）',
  })
  @Transform(blankToUndef)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ダウンロード種別は整数で指定してください。' })
  @IsIn([1, 2, 3, 4, 5], { message: 'ダウンロード種別は1〜5で指定してください。' })
  download_type?: number;

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

  @ApiPropertyOptional({ description: '並び替え項目', enum: SORT_KEYS })
  @Transform(blankToUndef)
  @IsOptional()
  @IsIn(SORT_KEYS as unknown as string[], {
    message: '並び替え項目が不正です。',
  })
  sort_by?: string;

  @ApiPropertyOptional({ description: '並び順', enum: ['asc', 'desc'], default: 'desc' })
  @Transform(blankToUndef)
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: '並び順は asc / desc で指定してください。' })
  sort_order?: 'asc' | 'desc';
}

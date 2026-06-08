import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

/**
 * Request body for `POST /api/v1/dokusya/replace-hanbaiten`
 * (ACSMS-API-015-002). The "当日以降の日付のみ可" (>= today) check on
 * `hanbaiten_tekiyo_date` is a SERVICE-level business rule (api.md §4.1)
 * — this DTO enforces required + YYYY-MM-DD format only.
 */
export class ReplaceHanbaitenDto {
  @ApiProperty({
    description: '対象購読者IDの配列（1〜1000件）',
    type: [Number],
    example: [5001, 5002],
  })
  @IsArray({ message: '対象購読者IDは配列で指定してください。' })
  @ArrayMinSize(1, { message: '対象購読者を1件以上選択してください。' })
  @ArrayMaxSize(1000, { message: '対象購読者は最大1000件まで選択できます。' })
  @IsInt({ each: true, message: '対象購読者IDは整数で指定してください。' })
  @Type(() => Number)
  dokusya_ids: number[];

  @ApiProperty({ description: '置換先の販売店ID', example: 201 })
  @Type(() => Number)
  @IsInt({ message: '置換先販売店IDは整数で指定してください。' })
  @IsPositive({ message: '置換先販売店IDは正の整数で指定してください。' })
  new_hanbaiten_id: number;

  @ApiProperty({ description: '販売店適用日（YYYY-MM-DD、当日以降）', example: '2026-06-01' })
  @IsNotEmpty({ message: '販売店適用日を入力してください。' })
  @IsString({ message: '販売店適用日は文字列で指定してください。' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '販売店適用日はYYYY-MM-DDの形式で指定してください。',
  })
  hanbaiten_tekiyo_date: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/**
 * プレビューで編集した1行分の振替金額（ACSMS-SCR-020 v1.1）。
 * export リクエストの `rows[]` にネストされる。`dokusya_id` は突合キー、
 * `furikae_kingaku` は編集後金額。サーバは client の `dokusya_id` を信用せず、
 * スコープ再集計した集合と突合してからのみ金額を上書きする（security.md Layer2/4）。
 */
export class ExportRowDto {
  @ApiProperty({ description: '購読者ID（突合キー）', example: 1 })
  @Type(() => Number)
  @IsInt({ message: '購読者IDは整数で指定してください。' })
  dokusya_id!: number;

  @ApiProperty({
    description: '振替金額（編集後・半角数字10桁以内・0以上）',
    example: 4900,
  })
  @Type(() => Number)
  @IsInt({ message: '金額は整数で入力してください。' })
  @Min(0, { message: '金額は0以上で入力してください。' })
  @Max(9_999_999_999, { message: '金額は10桁以内で入力してください。' })
  furikae_kingaku!: number;
}

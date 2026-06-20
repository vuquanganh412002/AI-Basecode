import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/** `YYYY-MM-DD` — 適用日。 */
const TEKIYO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Coerce a query value into a number array. Query strings arrive as a
 * single value (`?hanbaiten_ids=1`) or an array (`?hanbaiten_ids=1&…=2`);
 * normalise both to `number[]` so `@IsInt({ each: true })` can validate.
 * Non-numeric members become `NaN` → rejected by `@IsInt`.
 */
const toNumberArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) return value;
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => (v === '' || v === null ? Number.NaN : Number(v)));
};

/**
 * Shared query DTO for both 購読者名簿 endpoints:
 *   - GET /api/v1/report/meibo/preview  (ACSMS-API-026-001)
 *   - GET /api/v1/report/meibo/export   (ACSMS-API-026-002)
 *
 * 併読(3) は本帳票では対象外なので dokusya_shubetsu は 1/2 のみ許可。
 * hanbaiten_ids / kanri_shiten_ids の「帳票種別に応じた1件以上必須」は
 * 横断的な条件付き必須のため ReportService 側で検証する。
 */
export class MeiboReportQueryDto {
  @ApiProperty({ description: '適用日（YYYY-MM-DD）', example: '2026-04-01' })
  @IsNotEmpty({ message: '必須項目です。' })
  @IsString({ message: '適用日は文字列で指定してください。' })
  @Matches(TEKIYO_DATE_RE, {
    message: '適用日はYYYY-MM-DD形式で指定してください。',
  })
  tekiyo_date!: string;

  @ApiProperty({
    description: '帳票種別（hanbaiten: 販売店別 / kanri_shiten: 管理支店別）',
    enum: ['hanbaiten', 'kanri_shiten'],
    example: 'hanbaiten',
  })
  @IsNotEmpty({ message: '帳票種別を選択してください。' })
  @IsIn(['hanbaiten', 'kanri_shiten'], {
    message: '帳票種別の値が不正です。',
  })
  report_type!: 'hanbaiten' | 'kanri_shiten';

  @ApiPropertyOptional({
    description: '販売店ID（複数選択可）。report_type=hanbaiten のとき1件以上必須',
    type: [Number],
  })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray({ message: '販売店IDの形式が不正です。' })
  @IsInt({ each: true, message: '販売店IDは整数で指定してください。' })
  hanbaiten_ids?: number[];

  @ApiPropertyOptional({
    description: '管理支店ID（複数選択可）。report_type=kanri_shiten のとき1件以上必須',
    type: [Number],
  })
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray({ message: '管理支店IDの形式が不正です。' })
  @IsInt({ each: true, message: '管理支店IDは整数で指定してください。' })
  kanri_shiten_ids?: number[];

  @ApiPropertyOptional({
    description:
      '購読種別フィルタ ※m_code.code_category=DOKUSYA_SHUBETSU を参照（1:紙版, 2:電子版）。併読(3)は本帳票では選択不可。未指定時は紙版＋電子版の両方',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '購読種別は整数で指定してください。' })
  @IsIn([1, 2], { message: '購読種別の値が不正です。' })
  dokusya_shubetsu?: number;

  @ApiPropertyOptional({
    description:
      '購読料支払サイクル（月数: 1:毎月, 2:隔月, 3:3ヶ月, 6:半年, 12:年払い）。report_type=kanri_shiten のときのみ有効',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '購読料支払サイクルは整数で指定してください。' })
  shiharai_cycle?: number;
}

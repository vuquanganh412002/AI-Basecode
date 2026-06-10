import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

/**
 * SCR-023 — multipart upload body. The `files` field is consumed by
 * Multer's `FilesInterceptor('files')` and reaches the controller as
 * `Express.Multer.File[]`, so it does NOT appear on this DTO — only
 * the `ja_ids[]` text fields do.
 *
 * multipart/form-data delivers every value as a STRING ('12345' not
 * 12345), so we transform stringy ids into integers before validation.
 * The DTO MUST also reject empty arrays per api.md §エラー一覧 row 11
 * (TARGET_JA_REQUIRED).
 */
export class UploadFileUploadDto {
  @ApiProperty({
    description:
      '対象JAのID配列。multipartの繰り返しフィールド `ja_ids[]=12345&ja_ids[]=67890` 形式。1つ以上必須。',
    type: [Number],
    example: [12345, 67890],
  })
  // [coerce-string-to-int] multipart sends '12345' — coerce before
  // @IsInt() fails on every entry. Wrap-single-into-array handles the
  // case where the client sends only ONE ja_ids field (multipart then
  // omits the array shape).
  @Transform(({ value }) => {
    let raw: unknown[];
    if (Array.isArray(value)) {
      raw = value;
    } else if (value == null) {
      raw = [];
    } else {
      raw = [value];
    }
    return raw.map((v) => {
      if (typeof v === 'number') return v;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    });
  })
  @IsArray({ message: '対象JAを1つ以上選択してください。' })
  @ArrayMinSize(1, { message: '対象JAを1つ以上選択してください。' })
  @IsInt({ each: true, message: '対象JAは整数で指定してください。' })
  @IsPositive({ each: true, message: '対象JAは1以上の整数で指定してください。' })
  @Type(() => Number)
  ja_ids: number[];

  // [scr-023-fe-passthrough] The FE sends a `削除予定日` value alongside
  // the multipart upload (screen-design.md 画面項目定義 No.7). The BE
  // currently derives `scheduled_delete_date = NOW()+180days`
  // internally, so the value isn't consumed yet — but it MUST be
  // declared so the global ValidationPipe's `forbidNonWhitelisted:
  // true` doesn't reject the field. When the BE adds per-upload
  // override support, the service will read this field directly.
  @ApiPropertyOptional({
    description:
      '削除予定日 (YYYY/MM/DD)。画面で選択した値をそのまま保存する。未指定の場合のみ BE が アップロード日+180日 を既定値として設定する。',
    example: '2026/12/31',
  })
  @IsOptional()
  @IsString({ message: '削除予定日は文字列で指定してください。' })
  @Matches(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: '削除予定日はYYYY/MM/DD形式で指定してください。',
  })
  scheduled_delete_date?: string;
}

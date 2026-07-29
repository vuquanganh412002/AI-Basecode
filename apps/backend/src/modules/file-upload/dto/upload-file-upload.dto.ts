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
 * SCR-023 — multipart upload の body。`files` 欄は Multer の
 * `FilesInterceptor('files')` が消費し controller へ `Express.Multer.File[]`
 * で届くため本 DTO には現れない(テキスト欄 `ja_ids[]` のみ)。
 *
 * multipart/form-data は全値を文字列('12345')で渡すので、バリデーション前に
 * 整数へ transform する。空配列は api.md §エラー一覧 row 11
 * (TARGET_JA_REQUIRED)に従い reject 必須。
 */
export class UploadFileUploadDto {
  @ApiProperty({
    description:
      '対象JAのID配列。multipartの繰り返しフィールド `ja_ids[]=12345&ja_ids[]=67890` 形式。1つ以上必須。',
    type: [Number],
    example: [12345, 67890],
  })
  // [coerce-string-to-int] multipart は '12345' を送るので @IsInt() が全要素で
  // 落ちる前に整数化。単一 ja_ids のみ送信時(multipart が配列形を省く)は
  // 単値→配列にラップして吸収。
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

  // [scr-023-fe-passthrough] FE は multipart upload に `削除予定日` を添えて送る
  // (screen-design.md 画面項目定義 No.7)。ここで宣言しないと グローバル
  // ValidationPipe の `forbidNonWhitelisted: true` が本欄を拒否する。
  // service はこの値をそのまま保存し、未指定時のみ アップロード日+180日 を既定に。
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

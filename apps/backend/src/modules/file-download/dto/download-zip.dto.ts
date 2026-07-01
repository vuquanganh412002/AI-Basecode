import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
} from 'class-validator';

/** Max files bundled into one 一括ダウンロード ZIP — guards backend memory. */
export const MAX_ZIP_FILES = 50;

/**
 * Request body for POST /api/v1/file-download/download-zip — the list of
 * file_download_id to bundle into one ZIP (一括ダウンロード, SCR-022 §8).
 */
export class DownloadZipDto {
  @ApiProperty({
    description: '一括ダウンロード対象の file_download_id 配列（1〜50件・重複不可）',
    type: [Number],
    example: [101, 102, 103],
  })
  @IsArray({ message: 'ファイルIDの形式が不正です。' })
  @ArrayNotEmpty({ message: 'ファイルを選択してください。' })
  @ArrayMaxSize(MAX_ZIP_FILES, {
    message: `一括ダウンロードは最大${MAX_ZIP_FILES}件までです。`,
  })
  @ArrayUnique({ message: 'ファイルIDが重複しています。' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'ファイルIDは整数で指定してください。' })
  file_download_ids!: number[];
}

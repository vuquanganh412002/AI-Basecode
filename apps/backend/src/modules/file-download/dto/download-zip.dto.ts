import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
} from 'class-validator';

/** 一括ダウンロード ZIP 1 つに束ねる最大件数 — BE のメモリを保護。 */
export const MAX_ZIP_FILES = 50;

/**
 * POST /api/v1/file-download/download-zip の body — 1 ZIP に束ねる
 * file_download_id の配列（一括ダウンロード, ACSMS-SCR-022 §8）。
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

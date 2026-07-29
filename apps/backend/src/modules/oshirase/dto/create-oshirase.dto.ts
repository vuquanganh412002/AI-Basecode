import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import {
  OshiraseStatus,
  OshiraseType,
  PublishLocation,
} from '@/common/enums';

/** YYYY/MM/DD HH:mm — service が Date へパース。 */
const DATETIME_RE = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/;

/** POST /api/v1/oshirase (ACSMS-API-031-003) — api.md §リクエストパラメータ に一致。 */
export class CreateOshiraseDto {
  @ApiProperty({ description: 'お知らせタイトル', minLength: 1, maxLength: 200 })
  @IsString({ message: 'お知らせタイトルは文字列で指定してください。' })
  @IsNotEmpty({ message: 'お知らせタイトルは必須です。' })
  @MaxLength(200, { message: 'お知らせタイトルは最大200文字で指定してください。' })
  title: string;

  @ApiProperty({
    description:
      '公開場所（1:ログイン画面, 2:メニュー画面, 3:メニュー画面（締め切り時間）。3 は oshirase_type=4 専用）',
    enum: [1, 2, 3],
  })
  @Type(() => Number)
  @IsInt({ message: '公開場所は整数で指定してください。' })
  @IsIn(Object.values(PublishLocation), {
    message:
      '公開場所は1（ログイン画面）／2（メニュー画面）／3（メニュー画面（締め切り時間））で指定してください。',
  })
  publish_location: number;

  @ApiProperty({ description: '状態（1:下書き, 2:公開, 3:非公開）', enum: [1, 2, 3] })
  @Type(() => Number)
  @IsInt({ message: '状態は整数で指定してください。' })
  @IsIn(Object.values(OshiraseStatus), {
    message: '状態は1（下書き）／2（公開）／3（非公開）で指定してください。',
  })
  status: number;

  @ApiProperty({ description: '表示開始日時 YYYY/MM/DD HH:mm', example: '2026/04/20 09:00' })
  @IsString({ message: '表示開始日時は文字列で指定してください。' })
  @IsNotEmpty({ message: '表示開始日時は必須です。' })
  @Matches(DATETIME_RE, {
    message: '表示開始日時はYYYY/MM/DD HH:mm形式で指定してください。',
  })
  publish_start_date: string;

  @ApiPropertyOptional({
    description: '表示終了日時 YYYY/MM/DD HH:mm（NULL=無期限）',
    example: '2026/04/30 23:59',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: '表示終了日時は文字列で指定してください。' })
  @Matches(DATETIME_RE, {
    message: '表示終了日時はYYYY/MM/DD HH:mm形式で指定してください。',
  })
  publish_end_date: string | null;

  @ApiPropertyOptional({ description: 'JA ID（NULL=全JA向け）', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt({ message: 'JA IDは整数で指定してください。' })
  ja_id: number | null;

  @ApiProperty({
    description: 'お知らせ種別（1:システム, 2:重要, 3:一般, 4:締め切り時間）',
    enum: [1, 2, 3, 4],
  })
  @Type(() => Number)
  @IsInt({ message: 'お知らせ種別は整数で指定してください。' })
  @IsIn(Object.values(OshiraseType), {
    message: 'お知らせ種別は1（システム）／2（重要）／3（一般）／4（締め切り時間）で指定してください。',
  })
  oshirase_type: number;

  @ApiPropertyOptional({
    description: '対象管理者区分（カンマ区切り、未入力=全選択）',
    maxLength: 20,
    default: '',
  })
  @IsOptional()
  @IsString({ message: '対象管理者区分は文字列で指定してください。' })
  @MaxLength(20, { message: '対象管理者区分は最大20文字で指定してください。' })
  target_kanri_kubun?: string;

  @ApiProperty({ description: '内容', minLength: 1, maxLength: 2000 })
  @IsString({ message: '内容は文字列で指定してください。' })
  @IsNotEmpty({ message: '内容は必須です。' })
  @MaxLength(2000, { message: '内容は最大2000文字で指定してください。' })
  content: string;
}

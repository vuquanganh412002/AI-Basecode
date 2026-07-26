import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * ACSMS-API-011-004 — 電子版承認のリクエストボディ。
 *
 * 承認待ち(denshi_shonin_status=0) の電子版読者は、承認画面で「新聞単価」だけ
 * 編集できる（他項目は読取専用・顧客要件 2026-07）。承認時にこの単価を保存
 * してからステータスを承認(1)へ確定する。省略時は単価を変更しない。
 */
export class ApproveDokusyaDto {
  @ApiPropertyOptional({
    description: '新聞単価ID（承認時に更新する場合のみ指定）',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '新聞単価の値が不正です。' })
  @Min(1, { message: '新聞単価の値が不正です。' })
  tanka_id?: number;
}

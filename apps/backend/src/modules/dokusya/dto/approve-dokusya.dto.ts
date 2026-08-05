import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

import { DenshiShoninEditDto } from './denshi-shonin-edit.dto';

/**
 * ACSMS-API-011-004 — 電子版承認のリクエストボディ。
 *
 * 承認待ち(denshi_shonin_status=0) の電子版読者は、承認画面で「新聞単価」と
 * 支払方法 + 引落口座4項目（DenshiShoninEditDto・#56524）だけ編集できる。承認時にそれらを
 * 保存してからステータスを承認(1)へ確定する。省略したフィールドは変更しない。
 */
export class ApproveDokusyaDto extends DenshiShoninEditDto {
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

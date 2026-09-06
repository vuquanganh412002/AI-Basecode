import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * ACSMS-API-011-007 — 単価初回登録（denshi_shonin_status=NULL 専用）のリクエスト
 * ボディ。対象は承認ワークフロー自体が存在しないカテゴリ（電子版クレジットカード・
 * 併読・電子版無料会員）— 電子版同期は「単価は承認画面で登録する」前提で
 * tanka_id を持たせないため、このカテゴリは承認/否認が発生せず tanka_id=null の
 * まま固まってしまう不具合（2026-08）への対応。単価は必須（このアクションの
 * 唯一の目的が単価確定のため、承認画面の任意項目とは異なる）。
 */
export class RegisterTankaDokusyaDto {
  @ApiProperty({ description: '新聞単価ID', example: 5 })
  @Type(() => Number)
  @IsInt({ message: '新聞単価の値が不正です。' })
  @Min(1, { message: '新聞単価の値が不正です。' })
  tanka_id: number;
}

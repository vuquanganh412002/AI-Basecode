import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * GET /api/v1/oshirase/login (ACSMS-API-001-006) の Query DTO。
 * ログイン画面バナー（未認証）は常に publish_location=1 のため場所切替
 * パラメータ不要。メニュー画面版は GET /api/v1/oshirase/menu
 * (SCR-010 API-010-001)。
 */
export class LoginOshiraseQueryDto {
  @ApiPropertyOptional({
    default: 20,
    maximum: 20,
    description: '最大取得件数（デフォルト: 20、最大: 20）',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 20;
}

export class LoginOshiraseItemDto {
  oshirase_id: number;
  oshirase_type: number;
  oshirase_type_label: string;
  title: string;
  publish_start_date: string;
}

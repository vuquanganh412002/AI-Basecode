import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_OSHIRASE_LIST_LIMIT } from '@/modules/oshirase/oshirase.constants';

/**
 * GET /api/v1/oshirase/login (ACSMS-API-001-006) の Query DTO。
 * ログイン画面バナー（未認証）は常に publish_location=1 のため場所切替
 * パラメータ不要。メニュー画面版は GET /api/v1/oshirase/menu
 * (ACSMS-SCR-010 ACSMS-API-010-001)。
 */
export class LoginOshiraseQueryDto {
  @ApiPropertyOptional({
    default: MAX_OSHIRASE_LIST_LIMIT,
    maximum: MAX_OSHIRASE_LIST_LIMIT,
    description: `最大取得件数（デフォルト: ${MAX_OSHIRASE_LIST_LIMIT}、最大: ${MAX_OSHIRASE_LIST_LIMIT}）`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_OSHIRASE_LIST_LIMIT)
  limit?: number = MAX_OSHIRASE_LIST_LIMIT;
}

export class LoginOshiraseItemDto {
  oshirase_id: number;
  oshirase_type: number;
  oshirase_type_label: string;
  title: string;
  publish_start_date: string;
}

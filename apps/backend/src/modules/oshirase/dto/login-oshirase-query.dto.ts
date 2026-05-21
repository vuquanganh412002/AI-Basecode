import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query DTO for `GET /api/v1/oshirase/login` (ACSMS-API-001-006).
 *
 * The login-screen banner is unauthenticated and always hits
 * publish_location=1 — there's no need for a query param to switch
 * locations. The menu-screen variant lives at
 * `GET /api/v1/oshirase/menu` (SCR-010 API-010-001).
 */
export class LoginOshiraseQueryDto {
  @ApiPropertyOptional({
    default: 10,
    maximum: 10,
    description: '最大取得件数（デフォルト: 10、最大: 10）',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 10;
}

export class LoginOshiraseItemDto {
  oshirase_id: number;
  oshirase_type: number;
  oshirase_type_label: string;
  title: string;
  publish_start_date: string;
}

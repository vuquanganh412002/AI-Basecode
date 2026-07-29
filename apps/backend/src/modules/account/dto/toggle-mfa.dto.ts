import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * `PATCH /api/v1/account/me/mfa` のボディ。
 * 自己 MFA on/off トグル。`account_id` は URL/body でなく認証済セッションから読むため、
 * 呼出者は自分のフラグのみ切替可。
 */
export class ToggleMfaDto {
  @ApiProperty({
    description: 'true to enable MFA, false to disable',
    example: true,
  })
  @IsBoolean({ message: 'enabledはboolean型である必要があります' })
  enabled: boolean;
}

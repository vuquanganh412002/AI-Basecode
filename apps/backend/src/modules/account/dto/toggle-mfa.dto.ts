import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * Body shape for `PATCH /api/v1/account/me/mfa`.
 *
 * Self-service MFA on/off toggle. The endpoint reads `account_id`
 * from the authenticated session, NOT from the URL or body — the
 * caller can only toggle their own flag.
 */
export class ToggleMfaDto {
  @ApiProperty({
    description: 'true to enable MFA, false to disable',
    example: true,
  })
  @IsBoolean({ message: 'enabledはboolean型である必要があります' })
  enabled: boolean;
}

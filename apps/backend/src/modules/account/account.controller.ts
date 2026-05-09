import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { extractAuditContext } from '../../common/utils/audit-context';
import type { SessionPayload } from '../auth/session.service';
import { AccountService } from './account.service';
import { ToggleMfaDto } from './dto/toggle-mfa.dto';

@ApiTags('account')
@Controller('api/v1/account')
@UseGuards(SessionAuthGuard)
@ApiCookieAuth('session_id')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Patch('me/mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Toggle the caller's own MFA flag (self-service).",
    description:
      'Reads account_id from the authenticated session — the body cannot ' +
      'specify an arbitrary account. Logs an UPDATE entry to t_log.',
  })
  @ApiResponse({ status: 200, description: 'MFA flag updated' })
  @ApiResponse({ status: 401, description: 'Session invalid' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async toggleMfa(
    @Body() dto: ToggleMfaDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    const result = await this.accountService.toggleMfa(
      Number(session.account_id),
      dto.enabled,
      extractAuditContext(req),
    );
    return { data: result };
  }
}

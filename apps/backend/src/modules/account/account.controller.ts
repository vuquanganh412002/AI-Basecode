import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
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

import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { extractAuditContext } from '@/common/utils/audit-context';
import type { SessionPayload } from '@/modules/auth/session.service';
import { SuccessMessageDto } from '@/common/dto/responses.dto';
import { AccountService } from './account.service';
import { AccountDropdownQueryDto } from './dto/account-dropdown-query.dto';
import {
  AccountDetailEnvelopeDto,
  AccountDropdownResponseDto,
  AccountListResponseDto,
  AccountMutationResponseDto,
  ToggleMfaResponseDto,
} from './dto/account-response.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { SearchAccountsDto } from './dto/search-accounts.dto';
import { ToggleMfaDto } from './dto/toggle-mfa.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

/**
 * 2つの面を担当:
 * - `/api/v1/account/me/mfa` — 自己 MFA トグル（ヘッダー）。
 * - `/api/v1/accounts` — admin 検索+削除（ACSMS-SCR-024）。
 * クラス `@Controller()` は path 無しで各 endpoint がフルルートを宣言。単数
 * `account/...` と複数 `accounts/...` を同一クラスで共存させるため。
 */
@ApiTags('account')
@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
@ApiCookieAuth('session_id')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  // ─── self-service MFA toggle (header) ────────────────────────────
  @Patch('account/me/mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Toggle the caller's own MFA flag (self-service).",
    description:
      'Reads account_id from the authenticated session — the body cannot ' +
      'specify an arbitrary account. Logs an UPDATE entry to t_log.',
  })
  @ApiResponse({ status: 200, type: ToggleMfaResponseDto })
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

  // ─── ACSMS-API-COMMON-005 — GET /api/v1/account/dropdown ─────────
  // [shared-dropdown-rule] 認証のみ — @Permissions なし。共有フォーム用 dropdown
  // （ACSMS-SCR-030 ログ参照画面と併設）。データ境界は AccountService.getDropdown →
  // applyBranchScope（制限役職は自 JA / kanri_shiten のみ）。画面アクセスは各ルートの guard。
  @Get('account/dropdown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'アカウントプルダウン取得 — ACSMS-API-COMMON-005' })
  @ApiResponse({ status: 200, type: AccountDropdownResponseDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  async getAccountDropdown(
    @Query() query: AccountDropdownQueryDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.accountService.getAccountDropdown(query, session);
  }

  // ─── ACSMS-API-024-001 — GET /api/v1/accounts ────────────────────
  @Get('accounts')
  @HttpCode(HttpStatus.OK)
  @Permissions('account.view')
  @ApiOperation({ summary: 'アカウント一覧取得 — ACSMS-API-024-001' })
  @ApiResponse({ status: 200, type: AccountListResponseDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async searchAccounts(
    @Query() query: SearchAccountsDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.accountService.searchAccounts(query, session);
  }

  // ─── ACSMS-API-025-001 — GET /api/v1/accounts/:account_id ────────
  @Get('accounts/:account_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('account.view')
  @ApiOperation({ summary: 'アカウント詳細取得 — ACSMS-API-025-001' })
  @ApiResponse({ status: 200, type: AccountDetailEnvelopeDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定されたアカウントが見つかりません。' })
  async getAccountDetail(
    @Param('account_id', ParseIntPipe) accountId: number,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.accountService.getAccountDetail(accountId, session);
  }

  // ─── ACSMS-API-025-002 — POST /api/v1/accounts ───────────────────
  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('account.create')
  @ApiOperation({ summary: 'アカウント登録 — ACSMS-API-025-002' })
  @ApiResponse({ status: 201, type: AccountMutationResponseDto })
  @ApiResponse({ status: 400, description: '入力内容にエラーがあります' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async createAccount(
    @Body() dto: CreateAccountDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.accountService.createAccount(dto, session, req);
  }

  // ─── ACSMS-API-025-003 — PUT /api/v1/accounts/:account_id ────────
  @Put('accounts/:account_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('account.update')
  @ApiOperation({ summary: 'アカウント更新 — ACSMS-API-025-003' })
  @ApiResponse({ status: 200, type: AccountMutationResponseDto })
  @ApiResponse({ status: 400, description: '入力内容にエラーがあります' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定されたアカウントが見つかりません。' })
  async updateAccount(
    @Param('account_id', ParseIntPipe) accountId: number,
    @Body() dto: UpdateAccountDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.accountService.updateAccount(accountId, dto, session, req);
  }

  // ─── ACSMS-API-024-002 — DELETE /api/v1/accounts/:account_id ─────
  @Delete('accounts/:account_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('account.delete')
  @ApiOperation({ summary: 'アカウント削除 — ACSMS-API-024-002' })
  @ApiResponse({ status: 200, type: SuccessMessageDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定されたアカウントが見つかりません。' })
  @ApiResponse({ status: 409, description: '関連データが存在するため削除できません。' })
  async deleteAccount(
    @Param('account_id', ParseIntPipe) accountId: number,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.accountService.deleteAccount(accountId, session, req);
  }
}

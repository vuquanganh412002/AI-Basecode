import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
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

import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { SessionPayload } from '@/modules/auth/session.service';

import {
  RoleDetailEnvelopeDto,
  RoleDropdownResponseDto,
  RoleListResponseDto,
  RoleMutationResponseDto,
} from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

/**
 * 認可 — `role.view`（seeder.md §2.14, §3 matrix で NICHINO_ADMIN のみ付与）。
 * 旧 `RoleAdminGuard`（削除）の `role_code === 'NICHINO_ADMIN'` 直判定を置換 —
 * security.md §Layer 1 が求める `@Permissions('model.action')` に統一。
 *
 * Dropdown(`ACSMS-API-COMMON-002`)は @Permissions を付けず PermissionsGuard を
 * true 通過させる — SCR-024/SCR-025 admin 画面（利用者は NICHINO_ADMIN でない）が
 * role select 用に必要。class の SessionAuthGuard は残るので匿名は 401。
 */
@ApiTags('roles')
@ApiCookieAuth('session_id')
@Controller('roles')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ─── ACSMS-API-027-001 ──────────────────────────────────────────────
  @Get()
  @Permissions('role.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ロール一覧取得 — ACSMS-API-027-001' })
  @ApiResponse({ status: 200, type: RoleListResponseDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  findAll() {
    return this.rolesService.findAll();
  }

  // ─── ACSMS-API-COMMON-002 ───────────────────────────────────────────
  // スリム dropdown — @Permissions なしで任意の認証ユーザが role select を得る
  // (SCR-024/SCR-025)。リテラル path 'dropdown' を先に一致させるため
  // `@Get(':role_id')` の前に宣言（後だと param ルートが拾い ParseIntPipe が 400）。
  @Get('dropdown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ロールプルダウン取得 — ACSMS-API-COMMON-002' })
  @ApiResponse({ status: 200, type: RoleDropdownResponseDto })
  findDropdown() {
    return this.rolesService.listRolesDropdown();
  }

  // ─── ACSMS-API-027-002 ──────────────────────────────────────────────
  @Get(':role_id')
  @Permissions('role.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ロール詳細取得 — ACSMS-API-027-002' })
  @ApiResponse({ status: 200, type: RoleDetailEnvelopeDto })
  @ApiResponse({ status: 404, description: '指定されたロールが見つかりません' })
  findOne(@Param('role_id', ParseIntPipe) roleId: number) {
    return this.rolesService.findOne(roleId);
  }

  // ─── ACSMS-API-027-003 ──────────────────────────────────────────────
  // role.view は編集 gate も兼ねる — seeder.md に `role.update` は無く、matrix は
  // NICHINO_ADMIN のみに `role.view` を与える（顧客が想定する唯一の編集役職）。
  @Put(':role_id')
  @Permissions('role.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ロール更新 — ACSMS-API-027-003' })
  @ApiResponse({ status: 200, type: RoleMutationResponseDto })
  @ApiResponse({ status: 400, description: '入力内容にエラーがあります' })
  @ApiResponse({ status: 404, description: '指定されたロールが見つかりません' })
  update(
    @Param('role_id', ParseIntPipe) roleId: number,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    const session = (req as Request & { user: SessionPayload }).user;
    return this.rolesService.update(roleId, dto, session, req);
  }
}

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
 * Authorization — `role.view` permission (seeder.md §2.14, granted to
 * NICHINO_ADMIN only in §3 matrix). Replaces the previous bespoke
 * `RoleAdminGuard` (deleted) which hard-coded `role_code === 'NICHINO_ADMIN'`
 * — that was the only place in the codebase doing role-direct gating,
 * lopsided against `.claude/rules/security.md §Layer 1` which mandates
 * `@Permissions('model.action')`. Now uniform with every other
 * controller.
 *
 * Dropdown endpoint (`ACSMS-API-COMMON-002`) deliberately carries NO
 * `@Permissions` decorator so the PermissionsGuard short-circuits to
 * `true` — SCR-024 / SCR-025 admin screens (whose users aren't
 * NICHINO_ADMIN themselves) need it to populate the role select.
 * Class-level `SessionAuthGuard` still gates: anonymous requests get
 * 401 regardless.
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
  // Slim dropdown — NO @Permissions so any authenticated user can
  // hydrate role selects (SCR-024 / SCR-025 use cases). Declared BEFORE
  // `@Get(':role_id')` so the literal path 'dropdown' matches first;
  // otherwise the param route catches it and ParseIntPipe rejects 400.
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
  // role.view doubles as the edit gate too — seeder.md doesn't define a
  // separate `role.update` (matrix gives only NICHINO_ADMIN `role.view`
  // and that's the only role the customer intends to author roles).
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

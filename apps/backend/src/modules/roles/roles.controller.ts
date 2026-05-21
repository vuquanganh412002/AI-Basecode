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

import { RoleAdminGuard } from '@/common/guards/role-admin.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import type { SessionPayload } from '@/modules/auth/session.service';

import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiCookieAuth('session_id')
@Controller('roles')
@UseGuards(SessionAuthGuard, RoleAdminGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ─── ACSMS-API-027-001 ──────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ロール一覧取得 — ACSMS-API-027-001' })
  @ApiResponse({ status: 200, description: '正常にロール一覧を取得しました' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  findAll() {
    return this.rolesService.findAll();
  }

  // ─── ACSMS-API-COMMON-002 ───────────────────────────────────────────
  // Slim dropdown — authenticated-only (NOT NICHINO_ADMIN-only) so
  // SCR-024 / SCR-025 admin screens can populate the role select
  // without the caller themselves being an admin. Method-level
  // `@UseGuards(SessionAuthGuard)` REPLACES the class-level
  // `[SessionAuthGuard, RoleAdminGuard]` per Nest's guard merging
  // semantics. Declared BEFORE `@Get(':role_id')` so the literal
  // path 'dropdown' matches first; otherwise the param route catches
  // it and ParseIntPipe rejects with HTTP 400.
  @Get('dropdown')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ロールプルダウン取得 — ACSMS-API-COMMON-002' })
  @ApiResponse({ status: 200, description: '正常にロール一覧を取得しました' })
  findDropdown() {
    return this.rolesService.listRolesDropdown();
  }

  // ─── ACSMS-API-027-002 ──────────────────────────────────────────────
  @Get(':role_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ロール詳細取得 — ACSMS-API-027-002' })
  @ApiResponse({ status: 200, description: '正常にロール詳細を取得しました' })
  @ApiResponse({ status: 404, description: '指定されたロールが見つかりません' })
  findOne(@Param('role_id', ParseIntPipe) roleId: number) {
    return this.rolesService.findOne(roleId);
  }

  // ─── ACSMS-API-027-003 ──────────────────────────────────────────────
  @Put(':role_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ロール更新 — ACSMS-API-027-003' })
  @ApiResponse({ status: 200, description: '更新しました' })
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

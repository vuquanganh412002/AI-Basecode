import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RoleAdminGuard } from '@/common/guards/role-admin.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';

import { RolesService } from './roles.service';

/**
 * Mounted under `/api/v1/permissions`. Lives in the roles module since the
 * permissions list is consumed only by SCR-027 ロール管理画面's permission
 * checkbox grid (ACSMS-API-027-004).
 */
@ApiTags('permissions')
@ApiCookieAuth('session_id')
@Controller('permissions')
@UseGuards(SessionAuthGuard, RoleAdminGuard)
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  // ─── ACSMS-API-027-004 ──────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '権限一覧取得 — ACSMS-API-027-004' })
  @ApiResponse({ status: 200, description: '正常に権限一覧を取得しました' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  findAll() {
    return this.rolesService.findAllPermissions();
  }
}

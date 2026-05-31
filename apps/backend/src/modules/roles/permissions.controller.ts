import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';

import { PermissionListResponseDto } from './dto/role-response.dto';
import { RolesService } from './roles.service';

/**
 * Mounted under `/api/v1/permissions`. Lives in the roles module since the
 * permissions list is consumed only by SCR-027 ロール管理画面's permission
 * checkbox grid (ACSMS-API-027-004).
 *
 * Authorization — `role.view` per `.claude/rules/security.md §Layer 1`.
 * Granted only to NICHINO_ADMIN by seeder.md §3 matrix.
 */
@ApiTags('permissions')
@ApiCookieAuth('session_id')
@Controller('permissions')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  // ─── ACSMS-API-027-004 ──────────────────────────────────────────────
  @Get()
  @Permissions('role.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '権限一覧取得 — ACSMS-API-027-004' })
  @ApiResponse({ status: 200, type: PermissionListResponseDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  findAll() {
    return this.rolesService.findAllPermissions();
  }
}

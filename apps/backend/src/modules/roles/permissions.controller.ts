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
 * `/api/v1/permissions` にマウント。権限一覧は ACSMS-SCR-027 ロール管理画面の権限
 * チェックボックス（ACSMS-API-027-004）専用のため roles モジュールに置く。
 * 認可 — security.md §Layer 1 の `role.view`（seeder.md §3 で NICHINO_ADMIN のみ）。
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

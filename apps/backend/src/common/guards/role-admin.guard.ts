import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { ForbiddenException } from '@/common/exceptions/common.exceptions';

/**
 * Role-direct authorization guard for endpoints that are NICHINO_ADMIN-only.
 *
 * Used by SCR-027 ロール管理画面 endpoints per api.md §4.2:
 * > 権限チェック：ログインユーザーの role_code が NICHINO_ADMIN であるか確認する。
 * > ※ seeder.md にロール管理専用の permission_code は定義されていないため、
 * >    ロール直接チェックとする。
 *
 * Apply with `SessionAuthGuard` so the session is already attached to
 * `req.user` by the time this guard runs:
 *
 * ```ts
 * @UseGuards(SessionAuthGuard, RoleAdminGuard)
 * @Controller('roles')
 * export class RolesController { ... }
 * ```
 */
@Injectable()
export class RoleAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role_code?: string } | undefined;
    if (!user || user.role_code !== 'NICHINO_ADMIN') {
      throw new ForbiddenException();
    }
    return true;
  }
}

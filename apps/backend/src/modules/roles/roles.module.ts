import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from '@/database/entities/permission.entity';
import { Role } from '@/database/entities/role.entity';
import { RolePermission } from '@/database/entities/role-permission.entity';
import { AuthModule } from '@/modules/auth/auth.module';

import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

/**
 * SCR-027 ロール管理画面 module — owns `/api/v1/roles/*` AND
 * `/api/v1/permissions` (the permissions list is consumed only by this
 * screen's checkbox grid).
 *
 * AuthModule is imported so SessionAuthGuard's `SessionService`
 * dependency resolves. AuditLogModule is `@Global` so no explicit
 * import is needed.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, RolePermission]),
    AuthModule,
  ],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}

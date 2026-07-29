import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { Role } from '@/database/entities/role.entity';
import { JaController } from './ja.controller';
import { JaService } from './ja.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ja, Todofuken, Role]),
    AuthModule,      // SessionAuthGuard + PermissionsGuard 依存
    AuditLogModule,  // AuditLogService
  ],
  controllers: [JaController],
  providers: [JaService],
  exports: [JaService],
})
export class JaModule {}

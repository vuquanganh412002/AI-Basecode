import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { JaController } from './ja.controller';
import { JaService } from './ja.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ja, Todofuken]),
    AuthModule,      // SessionAuthGuard + PermissionsGuard dependencies
    AuditLogModule,  // AuditLogService
  ],
  controllers: [JaController],
  providers: [JaService],
  exports: [JaService],
})
export class JaModule {}

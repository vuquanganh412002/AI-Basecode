import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Tanka } from '@/database/entities/tanka.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';

import { TankaController } from './tanka.controller';
import { TankaService } from './tanka.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tanka]),
    AuthModule, // SessionAuthGuard + PermissionsGuard dependencies
    AuditLogModule, // AuditLogService
  ],
  controllers: [TankaController],
  providers: [TankaService],
  exports: [TankaService],
})
export class TankaModule {}

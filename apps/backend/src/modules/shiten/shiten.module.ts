import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Shiten } from '@/database/entities/shiten.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { ShitenController } from './shiten.controller';
import { ShitenService } from './shiten.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shiten, KanriShiten]),
    AuthModule, // SessionAuthGuard + PermissionsGuard deps
    AuditLogModule, // AuditLogService
  ],
  controllers: [ShitenController],
  providers: [ShitenService],
  exports: [ShitenService],
})
export class ShitenModule {}

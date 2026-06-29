import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { HanbaitenController } from './hanbaiten.controller';
import { HanbaitenService } from './hanbaiten.service';
import { HanbaitenImportService } from './hanbaiten-import.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';

/**
 * SCR-018 module — 販売店明細検索画面. Registers the `Hanbaiten`
 * entity for TypeORM CRUD and re-imports `Todofuken` so the service
 * can batch-resolve `todofuken_name` for the list response.
 *
 * `AuthModule` is imported (not just listed in providers) because the
 * controller's guards (`SessionAuthGuard` + `PermissionsGuard`) need
 * `SessionService` + `PermissionsService` from there. `AuditLogModule`
 * provides `AuditLogService` for the DELETE audit trail.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Hanbaiten, Todofuken, Tanka]),
    AuthModule, // SessionAuthGuard + PermissionsGuard deps
    AuditLogModule, // AuditLogService
  ],
  controllers: [HanbaitenController],
  providers: [HanbaitenService, HanbaitenImportService],
  exports: [HanbaitenService],
})
export class HanbaitenModule {}

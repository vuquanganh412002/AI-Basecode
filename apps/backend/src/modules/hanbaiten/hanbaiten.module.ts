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
 * ACSMS-SCR-018 モジュール — 販売店明細検索画面。`Hanbaiten` を TypeORM CRUD 用に登録し、
 * 一覧レスポンスの `todofuken_name` を一括解決するため `Todofuken` も import する。
 *
 * `AuthModule` を import するのは、controller のガード（`SessionAuthGuard` +
 * `PermissionsGuard`）が `SessionService` + `PermissionsService` を必要とするため。
 * `AuditLogModule` は DELETE 監査用の `AuditLogService` を提供する。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Hanbaiten, Todofuken, Tanka]),
    AuthModule, // SessionAuthGuard + PermissionsGuard の依存
    AuditLogModule, // AuditLogService
  ],
  controllers: [HanbaitenController],
  providers: [HanbaitenService, HanbaitenImportService],
  exports: [HanbaitenService],
})
export class HanbaitenModule {}

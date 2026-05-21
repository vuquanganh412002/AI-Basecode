import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { KanriShitenController } from './kanri-shiten.controller';
import { KanriShitenService } from './kanri-shiten.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KanriShiten, Todofuken, Ja]),
    AuthModule, // SessionAuthGuard + PermissionsGuard deps
    AuditLogModule, // AuditLogService
  ],
  controllers: [KanriShitenController],
  providers: [KanriShitenService],
  exports: [KanriShitenService],
})
export class KanriShitenModule {}

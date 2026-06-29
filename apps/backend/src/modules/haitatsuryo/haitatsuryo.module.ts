import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ReportModule } from '@/modules/report/report.module';

import { HaitatsuryoController } from './haitatsuryo.controller';
import { HaitatsuryoService } from './haitatsuryo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ja]),
    AuditLogModule,
    // 共通 S3 アーカイブ（ReportArchiveService）を再利用するため ReportModule を
    // import。StorageModule は ReportArchiveService が内部で利用する。
    ReportModule,
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [HaitatsuryoController],
  providers: [HaitatsuryoService],
  exports: [HaitatsuryoService],
})
export class HaitatsuryoModule {}

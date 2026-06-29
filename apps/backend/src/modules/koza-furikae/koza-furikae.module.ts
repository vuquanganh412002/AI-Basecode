import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { KozaFurikae } from '@/database/entities/koza-furikae.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ReportModule } from '@/modules/report/report.module';

import { KozaFurikaeController } from './koza-furikae.controller';
import { KozaFurikaeService } from './koza-furikae.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ja, Shiten, KozaFurikae]),
    AuditLogModule,
    // 共通 S3 アーカイブ（ReportArchiveService）を再利用するため ReportModule を
    // import。StorageModule は ReportArchiveService が内部で利用する。
    ReportModule,
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [KozaFurikaeController],
  providers: [KozaFurikaeService],
  exports: [KozaFurikaeService],
})
export class KozaFurikaeModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileDownload } from '@/database/entities/file-download.entity';
import { Ja } from '@/database/entities/ja.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { HaitatsuryoController } from './haitatsuryo.controller';
import { HaitatsuryoService } from './haitatsuryo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ja, FileDownload]),
    AuditLogModule,
    StorageModule,
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [HaitatsuryoController],
  providers: [HaitatsuryoService],
  exports: [HaitatsuryoService],
})
export class HaitatsuryoModule {}

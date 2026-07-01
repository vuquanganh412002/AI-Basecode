import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { FileArchiveModule } from '@/modules/file-archive/file-archive.module';

import { HaitatsuryoController } from './haitatsuryo.controller';
import { HaitatsuryoService } from './haitatsuryo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ja]),
    AuditLogModule,
    // 共通 S3 アーカイブ（FileArchiveService）を再利用するため FileArchiveModule を
    // import。StorageModule は FileArchiveService が内部で利用する。
    FileArchiveModule,
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [HaitatsuryoController],
  providers: [HaitatsuryoService],
  exports: [HaitatsuryoService],
})
export class HaitatsuryoModule {}

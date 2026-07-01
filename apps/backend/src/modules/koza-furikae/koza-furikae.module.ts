import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ja } from '@/database/entities/ja.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { KozaFurikae } from '@/database/entities/koza-furikae.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { FileArchiveModule } from '@/modules/file-archive/file-archive.module';

import { KozaFurikaeController } from './koza-furikae.controller';
import { KozaFurikaeService } from './koza-furikae.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ja, Shiten, KozaFurikae]),
    AuditLogModule,
    // 共通 S3 アーカイブ（FileArchiveService）を再利用するため FileArchiveModule を
    // import。StorageModule は FileArchiveService が内部で利用する。
    FileArchiveModule,
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [KozaFurikaeController],
  providers: [KozaFurikaeService],
  exports: [KozaFurikaeService],
})
export class KozaFurikaeModule {}

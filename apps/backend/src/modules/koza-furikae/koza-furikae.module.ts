import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileDownload } from '@/database/entities/file-download.entity';
import { Ja } from '@/database/entities/ja.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { KozaFurikae } from '@/database/entities/koza-furikae.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { KozaFurikaeController } from './koza-furikae.controller';
import { KozaFurikaeService } from './koza-furikae.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ja, Shiten, FileDownload, KozaFurikae]),
    AuditLogModule,
    StorageModule,
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [KozaFurikaeController],
  providers: [KozaFurikaeService],
  exports: [KozaFurikaeService],
})
export class KozaFurikaeModule {}

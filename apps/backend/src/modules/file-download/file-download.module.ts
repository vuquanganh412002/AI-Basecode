import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileDownload } from '@/database/entities/file-download.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { FileDownloadController } from './file-download.controller';
import { FileDownloadService } from './file-download.service';

/**
 * SCR-022 ファイルダウンロード画面。t_file_download を読み取り、S3 から
 * ファイルを配信する（DL 実行は t_log のみ記録）。m_ja / m_account は
 * findAll の raw SQL JOIN で参照するため、専用 repo は不要。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FileDownload]),
    AuditLogModule,
    AuthModule, // SessionAuthGuard が SessionService に依存
    StorageModule,
  ],
  controllers: [FileDownloadController],
  providers: [FileDownloadService],
})
export class FileDownloadModule {}

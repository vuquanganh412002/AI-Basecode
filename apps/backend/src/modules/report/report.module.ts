import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from '@/database/entities/account.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { Ja } from '@/database/entities/ja.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { MailModule } from '@/modules/mail/mail.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { PdfExportService } from './pdf-export.service';
import { ReportArchiveService } from './report-archive.service';
import { ReportController } from './report.controller';
import { ReportNotificationService } from './report-notification.service';
import { ReportService } from './report.service';

@Module({
  imports: [
    // FileUpload / Ja — 帳票の S3 アーカイブ（ReportArchiveService）。
    // Account — SCR-029 出力時の日農（NICHINO_ADMIN/STAFF）通知先取得。
    TypeOrmModule.forFeature([DokusyaRireki, FileUpload, Ja, Account]),
    AuditLogModule,
    StorageModule,
    MailModule, // for SCR-029 日農 notification mail
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [ReportController],
  providers: [
    ReportService,
    PdfExportService,
    ReportArchiveService,
    ReportNotificationService,
  ],
  // ReportArchiveService は他モジュール（SCR-021 配達手数料 等）からも
  // 共通の S3 アーカイブ + t_file_upload 登録に再利用するため export する。
  exports: [ReportService, ReportArchiveService],
})
export class ReportModule {}

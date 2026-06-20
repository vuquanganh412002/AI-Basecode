import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { FileDownload } from '@/database/entities/file-download.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { MailModule } from '@/modules/mail/mail.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { PdfExportService } from './pdf-export.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DokusyaRireki, FileDownload]),
    AuditLogModule,
    StorageModule,
    MailModule, // for SCR-029 日農 notification mail
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [ReportController],
  providers: [ReportService, PdfExportService],
  exports: [ReportService],
})
export class ReportModule {}

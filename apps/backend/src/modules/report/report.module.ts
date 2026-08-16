import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from '@/database/entities/account.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { Role } from '@/database/entities/role.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { FileArchiveModule } from '@/modules/file-archive/file-archive.module';
import { MailModule } from '@/modules/mail/mail.module';

import { MeiboReportService } from './meibo-report.service';
import { PdfExportService } from './pdf-export.service';
import { ReportController } from './report.controller';
import { ReportNotificationService } from './report-notification.service';
import { ReportService } from './report.service';
import { ZougenReportService } from './zougen-report.service';

@Module({
  imports: [
    // Account — ACSMS-SCR-029 出力時の日農（NICHINO_ADMIN/STAFF）通知先取得。
    // Role — role_code → role_id 解決（m_roles の SERIAL 採番に依存しないため）。
    TypeOrmModule.forFeature([DokusyaRireki, Account, Role]),
    AuditLogModule,
    FileArchiveModule, // 共通の S3 アーカイブ（FileArchiveService）
    MailModule, // for ACSMS-SCR-029 日農 notification mail
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [ReportController],
  providers: [
    ReportService,
    MeiboReportService,
    ZougenReportService,
    PdfExportService,
    ReportNotificationService,
  ],
  exports: [ReportService],
})
export class ReportModule {}

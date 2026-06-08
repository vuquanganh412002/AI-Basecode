import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from '@/database/entities/account.entity';
import { FileDownload } from '@/database/entities/file-download.entity';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { Ja } from '@/database/entities/ja.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { MailModule } from '@/modules/mail/mail.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { FileUploadNotificationWorker } from './file-upload-notification.worker';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { NotificationQueueService } from './notification-queue.service';

@Module({
  imports: [
    // FileDownload is written from FileUploadService via the EntityManager
    // inside `dataSource.transaction(...)` — it doesn't need a dedicated
    // repo provider, but we list it on TypeOrm so the entity metadata is
    // registered with the connection at boot.
    // Account + Ja are consumed by FileUploadNotificationWorker for
    // recipient lookup (m_account) and template ja_name (m_ja).
    TypeOrmModule.forFeature([FileUpload, FileDownload, Account, Ja]),
    AuditLogModule,
    AuthModule, // [auth-guard] SessionAuthGuard depends on SessionService
    MailModule, // [worker-mail] FileUploadNotificationWorker uses MailService
    StorageModule,
  ],
  controllers: [FileUploadController],
  providers: [
    FileUploadService,
    NotificationQueueService,
    FileUploadNotificationWorker,
  ],
})
export class FileUploadModule {}

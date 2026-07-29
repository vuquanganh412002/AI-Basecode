import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from '@/database/entities/account.entity';
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
    // Account + Ja は FileUploadNotificationWorker が宛先取得(m_account)と
    // template の ja_name(m_ja)に使用。
    TypeOrmModule.forFeature([FileUpload, Account, Ja]),
    AuditLogModule,
    AuthModule, // [auth-guard] SessionAuthGuard が SessionService に依存
    MailModule, // [worker-mail] FileUploadNotificationWorker が MailService を使用
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

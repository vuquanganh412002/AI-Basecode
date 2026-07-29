import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Log } from '@/database/entities/log.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';

import { LogController } from './log.controller';
import { LogService } from './log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log]),
    AuditLogModule,
    AuthModule, // SessionAuthGuard 用
  ],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}

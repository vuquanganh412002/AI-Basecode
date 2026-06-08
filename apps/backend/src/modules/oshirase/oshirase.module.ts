import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Oshirase } from '@/database/entities/oshirase.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';

import { OshiraseController } from './oshirase.controller';
import { OshiraseService } from './oshirase.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Oshirase]),
    AuditLogModule, // SCR-031 admin endpoints
    AuthModule, // SessionAuthGuard
  ],
  controllers: [OshiraseController],
  providers: [OshiraseService],
  exports: [OshiraseService],
})
export class OshiraseModule {}

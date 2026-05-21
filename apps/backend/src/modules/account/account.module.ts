import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from '@/database/entities/account.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, KanriShiten]),
    AuditLogModule,
    AuthModule, // for SessionAuthGuard
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}

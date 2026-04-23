import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { Log } from './entities/log.entity';
import { LoginLog } from './entities/login-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Log, LoginLog])],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from './entities/log.entity';
import { LoginLog } from './entities/login-log.entity';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    @InjectRepository(LoginLog) private readonly loginLogRepo: Repository<LoginLog>,
  ) {}

  async logOperation(params: {
    logType: number;
    accountId: number | null;
    jaId: number | null;
    gamenName: string;
    operation: string;
    resultStatus: number;
    targetId?: number | null;
    targetTable?: string;
    beforeValue?: string;
    afterValue?: string;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    stackTrace?: string;
  }): Promise<void> {
    try {
      await this.logRepo.save({
        logType: params.logType,
        logDatetime: new Date(),
        accountId: params.accountId,
        jaId: params.jaId,
        gamenName: params.gamenName,
        operation: params.operation,
        resultStatus: params.resultStatus,
        targetId: params.targetId ?? null,
        targetTable: params.targetTable ?? '',
        beforeValue: params.beforeValue ?? '',
        afterValue: params.afterValue ?? '',
        ipAddress: params.ipAddress ?? '',
        userAgent: params.userAgent ?? '',
        errorMessage: params.errorMessage ?? '',
        stackTrace: params.stackTrace ?? '',
      });
    } catch (error) {
      this.logger.error({ event: 'audit_log.save_failed', error });
    }
  }

  async logLogin(params: {
    accountId?: number | null;
    loginId: string;
    loginResult: number;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.loginLogRepo.save({
        accountId: params.accountId ?? null,
        loginId: params.loginId,
        loginDatetime: new Date(),
        loginResult: params.loginResult,
        failureReason: params.failureReason ?? '',
        ipAddress: params.ipAddress ?? '',
        userAgent: params.userAgent ?? '',
      });
    } catch (error) {
      this.logger.error({ event: 'login_log.save_failed', error });
    }
  }
}

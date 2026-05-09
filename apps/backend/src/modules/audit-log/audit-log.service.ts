import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from '@/database/entities/log.entity';
import { LoginLog } from '@/database/entities/login-log.entity';

/**
 * Log-type discriminator stored in `t_log.log_type`.
 * Mirrors `m_code.code_category = 'LOG_TYPE'` from the seeder.
 */
export const LogType = {
  USER_OPERATION: 1,
  SYSTEM: 2,
  ERROR: 3,
  FILE_UPLOAD: 4,
} as const;

/**
 * Outcome stored in `t_log.result_status`.
 * Mirrors `m_code.code_category = 'RESULT_STATUS'`.
 */
export const ResultStatus = {
  SUCCESS: 1,
  FAILURE: 2,
  WARNING: 3,
} as const;

/**
 * Common context fields needed for every audit-log call. Modules build
 * one of these once per request (using `extractAuditContext(req)` to
 * fill `ipAddress` + `userAgent`) and pass it to `logCreate/Update/
 * Delete/Error` to avoid retyping the same six fields.
 */
export interface AuditOperationContext {
  /** Authenticated account from session — `null` for unauthenticated logs. */
  accountId: number | null;
  /** JA scope on the operating user (drives DataScope on log queries). */
  jaId: number | null;
  /** Screen label. Convention: `${画面名} (ACSMS-SCR-XXX)`. */
  screen: string;
  /** Target table name (`m_ja`, `m_tanka`, ...). */
  table: string;
  /** Primary key of the affected row. */
  targetId: number | null;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    @InjectRepository(LoginLog) private readonly loginLogRepo: Repository<LoginLog>,
  ) {}

  /**
   * Audit a successful CREATE. Wraps `logOperation` with the typical
   * defaults so the call site reads as one line.
   */
  async logCreate(ctx: AuditOperationContext, after: unknown): Promise<void> {
    await this.logOperation({
      logType: LogType.USER_OPERATION,
      accountId: ctx.accountId,
      jaId: ctx.jaId,
      gamenName: ctx.screen,
      operation: 'CREATE',
      resultStatus: ResultStatus.SUCCESS,
      targetId: ctx.targetId,
      targetTable: ctx.table,
      afterValue: JSON.stringify(after),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  /** Audit a successful UPDATE — captures both before- and after-states. */
  async logUpdate(
    ctx: AuditOperationContext,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await this.logOperation({
      logType: LogType.USER_OPERATION,
      accountId: ctx.accountId,
      jaId: ctx.jaId,
      gamenName: ctx.screen,
      operation: 'UPDATE',
      resultStatus: ResultStatus.SUCCESS,
      targetId: ctx.targetId,
      targetTable: ctx.table,
      beforeValue: JSON.stringify(before),
      afterValue: JSON.stringify(after),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  /** Audit a successful DELETE — captures the row state before deletion. */
  async logDelete(ctx: AuditOperationContext, before: unknown): Promise<void> {
    await this.logOperation({
      logType: LogType.USER_OPERATION,
      accountId: ctx.accountId,
      jaId: ctx.jaId,
      gamenName: ctx.screen,
      operation: 'DELETE',
      resultStatus: ResultStatus.SUCCESS,
      targetId: ctx.targetId,
      targetTable: ctx.table,
      beforeValue: JSON.stringify(before),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  /**
   * Audit a FAILED operation — call from a `catch` block AFTER the
   * surrounding transaction has rolled back, so the error log itself
   * survives. `nestjs.md` §"Audit Log" describes the pattern.
   */
  async logError(
    ctx: AuditOperationContext,
    operation: string,
    err: Error,
  ): Promise<void> {
    await this.logOperation({
      logType: LogType.ERROR,
      accountId: ctx.accountId,
      jaId: ctx.jaId,
      gamenName: ctx.screen,
      operation,
      resultStatus: ResultStatus.FAILURE,
      targetId: ctx.targetId,
      targetTable: ctx.table,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      errorMessage: err.message,
      stackTrace: err.stack ?? '',
    });
  }

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

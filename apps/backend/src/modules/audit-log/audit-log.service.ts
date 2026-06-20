import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Log } from '@/database/entities/log.entity';
import { LoginLog } from '@/database/entities/login-log.entity';
import { AuditOperation, LogType, ResultStatus } from '@/common/enums';

// `LogType` / `ResultStatus` used to live in this file (inline `as const`
// objects) and the canonical home moved to `@/common/enums`. The previous
// commit kept a `export { … } from '@/common/enums'` re-export here as a
// migration alias, but no caller imports them from this path — every
// consumer (`auth.service`, `ja.service`, `account.service`) only takes
// `AuditLogService` + `AuditOperationContext` from here, and the enum
// imports go straight to `@/common/enums`. The re-export was also
// triggering a TS 5.x watch-mode crash
// (`Cannot read properties of undefined (reading 'checkJsDirective')` in
// `trySubstituteClassAlias`) when the same identifier was imported above
// for use in this file. Removing the re-export resolves both problems.

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
   * Audit a successful CREATE.
   *
   * `manager` is OPTIONAL but the project rule (`nestjs.md` §"Audit
   * Log" MANDATORY) is to pass it from inside `dataSource.transaction(
   * async (manager) => {...})` so the audit INSERT joins the same
   * transaction as the business write. If the surrounding tx rolls
   * back, the audit row rolls back atomically. Omit only when the
   * caller intentionally wants a standalone row (very rare for
   * success paths).
   */
  async logCreate(
    ctx: AuditOperationContext,
    after: unknown,
    manager?: EntityManager,
  ): Promise<void> {
    await this.logOperation(
      {
        logType: LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.CREATE,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        afterValue: JSON.stringify(after),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      manager,
    );
  }

  /** Audit a successful UPDATE — captures both before- and after-states. */
  async logUpdate(
    ctx: AuditOperationContext,
    before: unknown,
    after: unknown,
    manager?: EntityManager,
  ): Promise<void> {
    await this.logOperation(
      {
        logType: LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.UPDATE,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: JSON.stringify(before),
        afterValue: JSON.stringify(after),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      manager,
    );
  }

  /** Audit a successful DELETE — captures the row state before deletion. */
  async logDelete(
    ctx: AuditOperationContext,
    before: unknown,
    manager?: EntityManager,
  ): Promise<void> {
    await this.logOperation(
      {
        logType: LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.DELETE,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: JSON.stringify(before),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      manager,
    );
  }

  /**
   * Audit a FAILED operation. By design, this MUST run on the
   * standalone connection (no `manager` parameter) — by the time
   * the caller's catch block executes, the surrounding transaction
   * has already rolled back, so a row written via `manager` would
   * also vanish. The standalone INSERT survives the rollback so the
   * failure trace persists for debugging. See `nestjs.md` §"Audit
   * Log" for the canonical pattern.
   */
  async logError(
    ctx: AuditOperationContext,
    operation: string,
    err: Error,
  ): Promise<void> {
    // Wrap in try/catch so a failure to write the error log itself
    // never masks the original error the caller is about to re-throw.
    try {
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
    } catch (logErr) {
      this.logger.error({ event: 'audit_log.error_save_failed', logErr });
    }
  }

  /**
   * Lowest-level audit write.
   *
   * @param manager Optional EntityManager. When passed the INSERT runs
   *   against `manager.getRepository(Log)` so it participates in the
   *   caller's transaction. When omitted, falls back to the module
   *   repository (standalone connection) — used by `logError` and any
   *   non-transactional caller. Exceptions BUBBLE so the surrounding
   *   transaction can roll back; callers that intentionally want to
   *   swallow (e.g. `logError`) must do so themselves.
   */
  async logOperation(
    params: {
      logType: number;
      accountId: number | null;
      jaId: number | null;
      gamenName: string;
      // Open string vocabulary — `AuditOperation` lists the canonical verbs
      // but some callers compute it dynamically (hanbaiten IMPORT_*). Prefer
      // an AuditOperation member; raw strings still accepted.
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
    },
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Log) : this.logRepo;
    await repo.save({
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
  }

  /**
   * Login/logout/MFA-attempt log. Separate table (`t_login_log`) and
   * intentionally non-transactional — login attempt records must
   * survive any subsequent failure (locked account, invalid OTP, etc.)
   * so security analysts can audit attack patterns.
   */
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

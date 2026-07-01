import { ResultStatus } from '@/common/enums';

/**
 * Attach a `logExport` to a hand-built `AuditLogService` mock so that it
 * delegates to the mock's existing `logOperation` exactly like the real
 * `AuditLogService.logExport` does. This keeps every spec's existing
 * `logOperation` expectations (params shape + optional `manager` arg)
 * valid after the export call sites switched to `auditLog.logExport(...)`.
 *
 * Audit semantics are unchanged: same logType / operation / resultStatus /
 * afterValue / manager flow as the production helper.
 *
 * @param auditLog A mock object that already has a `logOperation` jest.fn().
 * @returns The same mock, now also exposing a `logExport` jest.fn().
 */
export function attachLogExport<
  T extends { logOperation: (...args: unknown[]) => unknown },
>(auditLog: T): T & { logExport: jest.Mock } {
  const mock = auditLog as T & { logExport: jest.Mock };
  mock.logExport = jest.fn(
    async (
      ctx: {
        accountId: number | null;
        jaId: number | null;
        screen: string;
        table: string;
        targetId: number | null;
        ipAddress: string;
        userAgent: string;
      },
      opts: {
        operation: string;
        afterValue: string;
        logType?: number;
        manager?: unknown;
      },
    ) =>
      mock.logOperation(
        {
          logType: opts.logType ?? 1,
          accountId: ctx.accountId,
          jaId: ctx.jaId,
          gamenName: ctx.screen,
          operation: opts.operation,
          resultStatus: ResultStatus.SUCCESS,
          targetId: ctx.targetId,
          targetTable: ctx.table,
          beforeValue: '',
          afterValue: opts.afterValue,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        opts.manager,
      ),
  );
  return mock;
}

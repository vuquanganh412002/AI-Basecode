// Drives src/modules/audit-log/audit-log.service.ts.
//
// AuditLogService is the cross-cutting helper every CRUD service depends on
// for `t_log` writes. Bugs here silently corrupt the audit trail across the
// whole system (10+ modules call logCreate / logUpdate / logDelete / logError),
// so spec the contract tightly: logType + resultStatus + JSON-serialised
// before/after payload + manager routing + error path.

import type { EntityManager, Repository } from 'typeorm';

import { Log } from '@/database/entities/log.entity';
import { LoginLog } from '@/database/entities/login-log.entity';
import { LogType, ResultStatus } from '@/common/enums';
import {
  AuditLogService,
  type AuditOperationContext,
} from '@/modules/audit-log/audit-log.service';

function buildCtx(
  overrides: Partial<AuditOperationContext> = {},
): AuditOperationContext {
  return {
    accountId: 42,
    jaId: 1,
    screen: '単価マスタ登録画面 (ACSMS-SCR-006)',
    table: 'm_tanka',
    targetId: 201,
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    ...overrides,
  };
}

describe('AuditLogService', () => {
  let logRepo: { save: jest.Mock };
  let loginLogRepo: { save: jest.Mock };
  let service: AuditLogService;

  beforeEach(() => {
    logRepo = { save: jest.fn().mockResolvedValue(undefined) };
    loginLogRepo = { save: jest.fn().mockResolvedValue(undefined) };
    service = new AuditLogService(
      logRepo as unknown as Repository<Log>,
      loginLogRepo as unknown as Repository<LoginLog>,
    );
  });

  // ─── logCreate ───────────────────────────────────────────────────────
  describe('logCreate', () => {
    it('emits a USER_OPERATION row with operation=CREATE and resultStatus=SUCCESS', async () => {
      await service.logCreate(buildCtx(), { tanka_id: 1, tanka_name: 'A' });
      expect(logRepo.save).toHaveBeenCalledTimes(1);
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.logType).toBe(LogType.USER_OPERATION);
      expect(saved.operation).toBe('CREATE');
      expect(saved.resultStatus).toBe(ResultStatus.SUCCESS);
    });

    it('JSON.stringifies the `after` payload into afterValue and leaves beforeValue empty', async () => {
      const after = { tanka_id: 5, tanka_name: 'A', kingaku: 3500 };
      await service.logCreate(buildCtx(), after);
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.afterValue).toBe(JSON.stringify(after));
      expect(saved.beforeValue).toBe('');
    });

    it('forwards ctx fields (accountId, jaId, screen, table, targetId, ip, ua) verbatim', async () => {
      const ctx = buildCtx({
        accountId: 7,
        jaId: 99,
        screen: 'JAマスタ登録 (ACSMS-SCR-005)',
        table: 'm_ja',
        targetId: 333,
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      await service.logCreate(ctx, {});
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.accountId).toBe(7);
      expect(saved.jaId).toBe(99);
      expect(saved.gamenName).toBe('JAマスタ登録 (ACSMS-SCR-005)');
      expect(saved.targetTable).toBe('m_ja');
      expect(saved.targetId).toBe(333);
      expect(saved.ipAddress).toBe('10.0.0.1');
      expect(saved.userAgent).toBe('Mozilla/5.0');
    });

    it('uses manager.getRepository(Log) when a manager is passed (joins caller transaction)', async () => {
      const txRepo = { save: jest.fn().mockResolvedValue(undefined) };
      const manager = {
        getRepository: jest.fn(() => txRepo),
      } as unknown as EntityManager;
      await service.logCreate(buildCtx(), {}, manager);
      expect(manager.getRepository).toHaveBeenCalledWith(Log);
      expect(txRepo.save).toHaveBeenCalledTimes(1);
      expect(logRepo.save).not.toHaveBeenCalled();
    });

    it('falls back to the module repo when manager is omitted', async () => {
      await service.logCreate(buildCtx(), {});
      expect(logRepo.save).toHaveBeenCalledTimes(1);
    });

    it('stamps logDatetime as a Date instance', async () => {
      await service.logCreate(buildCtx(), {});
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.logDatetime).toBeInstanceOf(Date);
    });
  });

  // ─── logUpdate ───────────────────────────────────────────────────────
  describe('logUpdate', () => {
    it('emits operation=UPDATE with both before- and after- JSON', async () => {
      const before = { tanka_id: 1, kingaku: 3000 };
      const after = { tanka_id: 1, kingaku: 3500 };
      await service.logUpdate(buildCtx(), before, after);
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.operation).toBe('UPDATE');
      expect(saved.resultStatus).toBe(ResultStatus.SUCCESS);
      expect(saved.beforeValue).toBe(JSON.stringify(before));
      expect(saved.afterValue).toBe(JSON.stringify(after));
    });

    it('routes to manager when provided', async () => {
      const txRepo = { save: jest.fn().mockResolvedValue(undefined) };
      const manager = {
        getRepository: jest.fn(() => txRepo),
      } as unknown as EntityManager;
      await service.logUpdate(buildCtx(), {}, {}, manager);
      expect(txRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ─── logDelete ───────────────────────────────────────────────────────
  describe('logDelete', () => {
    it('emits operation=DELETE with before-state only', async () => {
      const before = { tanka_id: 1, kingaku: 3000 };
      await service.logDelete(buildCtx(), before);
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.operation).toBe('DELETE');
      expect(saved.resultStatus).toBe(ResultStatus.SUCCESS);
      expect(saved.beforeValue).toBe(JSON.stringify(before));
      expect(saved.afterValue).toBe('');
    });
  });

  // ─── logError ────────────────────────────────────────────────────────
  describe('logError', () => {
    it('emits logType=ERROR + resultStatus=FAILURE with errorMessage and stackTrace', async () => {
      const err = new Error('SMTP 421');
      await service.logError(buildCtx(), 'CREATE', err);
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.logType).toBe(LogType.ERROR);
      expect(saved.resultStatus).toBe(ResultStatus.FAILURE);
      expect(saved.errorMessage).toBe('SMTP 421');
      expect(saved.stackTrace).toBe(err.stack);
      expect(saved.operation).toBe('CREATE');
    });

    it('does NOT route through a manager (intentional — runs on standalone)', async () => {
      // logError's signature has no `manager` param. Verify that it
      // always lands on the module repo so the row survives the
      // rolled-back surrounding transaction. (No-arg call.)
      await service.logError(buildCtx(), 'UPDATE', new Error('x'));
      expect(logRepo.save).toHaveBeenCalledTimes(1);
    });

    it('SWALLOWS a save() failure so the caller still re-throws the original error', async () => {
      // The whole point of logError is that the caller is about to
      // re-throw the business error. If the audit save itself blows
      // up, the original error must still propagate; this method
      // catches its own failure.
      logRepo.save.mockRejectedValueOnce(new Error('DB down'));
      await expect(
        service.logError(buildCtx(), 'CREATE', new Error('original')),
      ).resolves.toBeUndefined();
    });

    it('handles Error objects without a stack trace (stackTrace defaults to empty string)', async () => {
      const err = new Error('no stack');
      delete (err as { stack?: string }).stack;
      await service.logError(buildCtx(), 'CREATE', err);
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.stackTrace).toBe('');
    });
  });

  // ─── logOperation (lowest-level) ─────────────────────────────────────
  describe('logOperation', () => {
    it('PROPAGATES save() exceptions when manager is provided (so surrounding tx rolls back)', async () => {
      const txRepo = {
        save: jest.fn().mockRejectedValue(new Error('FK violation')),
      };
      const manager = {
        getRepository: jest.fn(() => txRepo),
      } as unknown as EntityManager;
      await expect(
        service.logOperation(
          {
            logType: LogType.USER_OPERATION,
            accountId: 1,
            jaId: 1,
            gamenName: 'X',
            operation: 'CREATE',
            resultStatus: ResultStatus.SUCCESS,
          },
          manager,
        ),
      ).rejects.toThrow('FK violation');
    });

    it('defaults optional fields (targetId/targetTable/beforeValue/afterValue/ip/ua/errorMessage/stackTrace) to null or empty string', async () => {
      await service.logOperation({
        logType: LogType.SYSTEM,
        accountId: null,
        jaId: null,
        gamenName: 'Y',
        operation: 'CRON',
        resultStatus: ResultStatus.SUCCESS,
      });
      const saved = logRepo.save.mock.calls[0][0];
      expect(saved.targetId).toBeNull();
      expect(saved.targetTable).toBe('');
      expect(saved.beforeValue).toBe('');
      expect(saved.afterValue).toBe('');
      expect(saved.ipAddress).toBe('');
      expect(saved.userAgent).toBe('');
      expect(saved.errorMessage).toBe('');
      expect(saved.stackTrace).toBe('');
    });
  });

  // ─── logLogin ────────────────────────────────────────────────────────
  describe('logLogin', () => {
    it('inserts into the login-log repo (separate from t_log)', async () => {
      await service.logLogin({
        accountId: 1,
        loginId: 'admin02',
        loginResult: 1,
      });
      expect(loginLogRepo.save).toHaveBeenCalledTimes(1);
      expect(logRepo.save).not.toHaveBeenCalled();
    });

    it('SWALLOWS save() failures by design (login flow must NEVER block on audit write)', async () => {
      loginLogRepo.save.mockRejectedValueOnce(new Error('DB down'));
      await expect(
        service.logLogin({ loginId: 'x', loginResult: 2 }),
      ).resolves.toBeUndefined();
    });

    it('defaults optional fields (accountId, failureReason, ip, ua) to null / empty', async () => {
      await service.logLogin({ loginId: 'x', loginResult: 2 });
      const saved = loginLogRepo.save.mock.calls[0][0];
      expect(saved.accountId).toBeNull();
      expect(saved.failureReason).toBe('');
      expect(saved.ipAddress).toBe('');
      expect(saved.userAgent).toBe('');
    });

    it('stamps loginDatetime as a Date instance', async () => {
      await service.logLogin({ loginId: 'x', loginResult: 1 });
      expect(loginLogRepo.save.mock.calls[0][0].loginDatetime).toBeInstanceOf(Date);
    });
  });
});

// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: header self-service — MFA toggle
//
// AccountService.toggleMfa unit specs.
// Pattern: plain `new AccountService(...)` with mocked deps — same as
// AuthService spec.

import { NotFoundException } from '@nestjs/common';
import { AccountService } from './account.service';
import { buildAccount } from '../../../test/fixtures/auth.factory';

describe('AccountService', () => {
  let service: AccountService;
  let accountRepo: any;
  let auditLog: any;
  let dataSource: any;
  let txManager: any;
  const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

  beforeEach(() => {
    accountRepo = {
      findOne: jest.fn(),
    };
    auditLog = {
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };

    txManager = {
      // Service uses `manager.update(Account, where, partial)` — keep
      // save/create stubs for general transaction patterns just in case.
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) =>
        maybeValue ?? entityOrValue,
      ),
      create: jest.fn((_cls: any, payload: any) => payload),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };

    service = new AccountService(accountRepo, auditLog, dataSource);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('toggleMfa', () => {
    it('should update mfaEnableFlg and return new state when enabling MFA', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: false }));

      const result = await service.toggleMfa(1, true, ctx);

      expect(result).toEqual({
        mfa_enable_flg: true,
        message: 'MFAを有効にしました。',
      });
      // DML inside the transaction with the new flag.
      expect(txManager.update).toHaveBeenCalledWith(
        expect.anything(), // Account class
        { accountId: 1 },
        expect.objectContaining({ mfaEnableFlg: true }),
      );
    });

    it('should update mfaEnableFlg and return new state when disabling MFA', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: true }));

      const result = await service.toggleMfa(1, false, ctx);

      expect(result).toEqual({
        mfa_enable_flg: false,
        message: 'MFAを無効にしました。',
      });
    });

    it('should throw NotFoundException when account does not exist', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleMfa(999, true, ctx)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should call auditLog.logUpdate with operation UPDATE and before/after states inside transaction', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: false }));

      await service.toggleMfa(1, true, ctx);

      // Audit log must run inside the same transaction (only one tx call total).
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          targetId: 1,
          table: 'm_account',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }),
        expect.objectContaining({ mfa_enable_flg: false }),
        expect.objectContaining({ mfa_enable_flg: true }),
      );
    });

    it('should rollback and emit error log outside transaction when audit log fails', async () => {
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: false }));
      auditLog.logUpdate.mockRejectedValueOnce(new Error('audit-down'));

      await expect(service.toggleMfa(1, true, ctx)).rejects.toBeDefined();

      // Error log emitted OUTSIDE the rolled-back tx.
      expect(auditLog.logError).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 1, table: 'm_account' }),
        'UPDATE',
        expect.any(Error),
      );
    });

    it('should be idempotent and still write audit log when toggle target equals current state', async () => {
      // Per spec: even a no-op write produces an audit row so admins can
      // see "user X explicitly toggled MFA at HH:MM" in t_log.
      accountRepo.findOne.mockResolvedValue(buildAccount({ mfaEnableFlg: true }));

      const result = await service.toggleMfa(1, true, ctx);

      expect(result.mfa_enable_flg).toBe(true);
      expect(auditLog.logUpdate).toHaveBeenCalled();
    });
  });
});

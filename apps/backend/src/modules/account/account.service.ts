import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Account } from '@/database/entities/account.entity';
import {
  AuditLogService,
  type AuditOperationContext,
} from '../audit-log/audit-log.service';

const SCREEN_NAME = 'アカウント設定 (header)';
const TABLE_NAME = 'm_account';

export interface ToggleMfaContext {
  ipAddress: string;
  userAgent: string;
}

export interface ToggleMfaResult {
  mfa_enable_flg: boolean;
  message: string;
}

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly auditLog: AuditLogService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Toggle the caller's own MFA flag. The caller's `account_id` MUST
   * come from the authenticated session — this service does NOT
   * accept arbitrary IDs as a defence-in-depth check (the controller
   * is the only sanctioned caller).
   *
   * Wraps the UPDATE + audit log in a single transaction so the audit
   * trail can never disagree with persisted state. On failure emits an
   * additional log_type=3 row OUTSIDE the rolled-back transaction.
   */
  async toggleMfa(
    accountId: number,
    enabled: boolean,
    ctx: ToggleMfaContext,
  ): Promise<ToggleMfaResult> {
    const account = await this.accountRepo.findOne({
      where: { accountId, deletedAt: IsNull() },
    });
    if (!account) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        error_code: 'NOT_FOUND',
        message: '指定されたアカウントが見つかりません。',
      });
    }

    const before = { mfa_enable_flg: account.mfaEnableFlg };
    const after = { mfa_enable_flg: enabled };
    const auditCtx: AuditOperationContext = {
      accountId,
      jaId: account.jaId !== null ? Number(account.jaId) : null,
      screen: SCREEN_NAME,
      table: TABLE_NAME,
      targetId: accountId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          Account,
          { accountId },
          { mfaEnableFlg: enabled, updatedBy: String(accountId) },
        );
        // logUpdate must run inside the same tx so a failure here
        // rolls back the m_account write too.
        await this.auditLog.logUpdate(auditCtx, before, after);
      });
    } catch (err) {
      // Error log outside the rolled-back tx so it survives.
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
      throw err;
    }

    return {
      mfa_enable_flg: enabled,
      message: enabled ? 'MFAを有効にしました。' : 'MFAを無効にしました。',
    };
  }
}

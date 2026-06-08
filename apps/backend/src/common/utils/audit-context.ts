import type { Request } from 'express';
import type { AuditOperationContext } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';

/**
 * Pull IP address + user-agent off an Express request as plain strings
 * suitable for the `t_log.ip_address` / `user_agent` columns. Both
 * fall back to `''` (the columns are NOT NULL) so callers don't have
 * to guard.
 */
export function extractAuditContext(req: Request | undefined): {
  ipAddress: string;
  userAgent: string;
} {
  return {
    ipAddress: String(req?.ip ?? ''),
    userAgent: String(req?.headers?.['user-agent'] ?? ''),
  };
}

/**
 * Build the per-request `AuditOperationContext` every CRUD service
 * needs. Centralizes the session + screen + table + IP/UA assembly so
 * each service no longer carries its own `buildAuditCtx` helper.
 *
 * Usage — always pass `manager` to `logCreate`/`logUpdate`/`logDelete`
 * when calling from inside `dataSource.transaction(...)` so the audit
 * INSERT joins the same transaction. Omitting it routes the write
 * through the standalone repo → an orphan audit row survives any
 * rollback (audit trail diverges from real DB state).
 *
 * ```ts
 * const SCREEN_NAME = 'JAマスタ登録画面 (ACSMS-SCR-005)';
 * const TABLE_NAME = 'm_ja';
 *
 * await this.dataSource.transaction(async (manager) => {
 *   const created = await manager.save(manager.create(Ja, dto));
 *   await this.auditLog.logCreate(
 *     buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, created.jaId),
 *     created,
 *     manager,   // ← REQUIRED for atomicity
 *   );
 * });
 * ```
 */
export function buildAuditCtx(
  session: SessionPayload,
  req: Request | undefined,
  screen: string,
  table: string,
  targetId: number | null,
): AuditOperationContext {
  return {
    accountId: session.account_id,
    jaId: session.ja_id,
    screen,
    table,
    targetId,
    ...extractAuditContext(req),
  };
}

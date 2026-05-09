import type { Request } from 'express';

/**
 * Pull IP address + user-agent off an Express request as plain strings
 * suitable for the `t_log.ip_address` / `user_agent` columns. Both
 * fall back to `''` (the columns are NOT NULL) so callers don't have
 * to guard.
 *
 * Usage:
 * ```ts
 * await this.auditLog.logCreate({
 *   ...extractAuditContext(req),
 *   session, screen, table: 'm_ja', targetId: created.jaId,
 * }, created);
 * ```
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

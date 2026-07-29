import type { Request } from 'express';
import type { AuditOperationContext } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';

/**
 * Express request → `t_log.ip_address` / `user_agent` 文字列。両方とも `''` に
 * フォールバック（列が NOT NULL）なので呼び出し側でガード不要。
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
 * リクエストごとの `AuditOperationContext`（session + screen + table + IP/UA）を
 * 構築。各サービス独自の `buildAuditCtx` を置き換える。
 *
 * `dataSource.transaction(...)` 内では `logCreate`/`logUpdate`/`logDelete` に
 * 必ず `manager` を渡し、監査 INSERT を同トランザクションに含めること。省略すると
 * standalone repo 経由で書き込まれ、rollback 後に監査行が残る（監査ログが実 DB
 * 状態と乖離）。
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

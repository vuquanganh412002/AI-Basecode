import type { AuditOperationContext } from '@/modules/audit-log/audit-log.service';

/**
 * バッチが t_log へ書くときの画面ラベル。規約（naming: `${画面名} (ACSMS-SCR-XXX)`）は
 * 画面操作向けなので、バッチは SCR 番号の代わりに npm script 名を添えて
 * 「どの実行体が書いたか」を追えるようにする。
 */
export const BATCH_SCREEN_KAIYAKU =
  '購読者到来日反映バッチ／解約確定 (dokusya-apply-due)';
export const BATCH_SCREEN_RECOMPUTE =
  '購読者到来日反映バッチ／情報変更反映 (dokusya-apply-due)';

/**
 * バッチ用の監査コンテキスト。セッションも HTTP リクエストも無いので
 * `accountId` は null、`ipAddress` / `userAgent` は空文字（どちらも NOT NULL 列）。
 *
 * `jaId` は t_log 検索の DataScope に効くので、分かる場合は必ず渡すこと。渡さないと
 * NICHINO 以外のロールからそのログ行が見えなくなる。
 */
export function batchAuditCtx(
  screen: string,
  dokusyaId: number | null,
  jaId: number | null = null,
): AuditOperationContext {
  return {
    accountId: null,
    jaId,
    screen,
    table: 't_dokusya',
    targetId: dokusyaId,
    ipAddress: '',
    userAgent: '',
  };
}

/**
 * 監査行の `ja_id` を解決する。t_log 検索の DataScope はこの列で効くので、
 * 落とすと NICHINO 以外のロールからその行が完全に見えなくなる（＝現場が
 * 「バッチで解約された」経緯を追えない）。
 *
 * 通常は再計算前の master から取れるが、master 行がまだ無い経路では null に
 * なるため、書き込んだ値（履歴行からコピーした ja_id）へフォールバックする。
 */
export function resolveJaId(
  before: { jaId?: number | null } | null,
  after: Record<string, unknown>,
): number | null {
  if (before?.jaId != null) return Number(before.jaId);
  const fromAfter = after.jaId;
  return fromAfter == null ? null : Number(fromAfter);
}

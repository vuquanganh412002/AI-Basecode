import { LogType, ResultStatus } from '@/common/enums';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

/**
 * バッチ 1 実行につき t_log を 1 行だけ書くための共通ヘルパ。
 *
 * 行単位の監査（`dokusya-apply-due` の logOperation）とは目的が違う:
 * こちらは「そのバッチがいつ動き、何件処理したか」を残す実行サマリで、
 * どの購読者がどう変わったかまでは追えない。まずは実行痕跡だけでも残す、
 * という段階的な対応（顧客要望 2026-08）。
 *
 * 設計上の決めごと:
 * - `operation` は `${処理内容} (${実行者名})` の形（顧客指定 2026-08）。
 *   例: `電子版読者同期 (SYSTEM_DENSHI_SYNC)`。
 *   実行者名を operation に載せるのは、t_log に実行者を入れる文字列列が無く
 *   `account_id` は m_account を指す bigint なので `SYSTEM_*` を置けないため。
 *   ※ 代償として operation の値がバッチごとに変わる。「バッチの実行記録だけ」を
 *     一覧したい場合は operation の完全一致では絞れず、`LIKE '%(SYSTEM_%'` の
 *     ような部分一致か gamen_name 側で絞る必要がある。
 * - `logType` は SYSTEM。人の操作ではなくスケジュール実行なので USER_OPERATION
 *   ではない。`accountId` も null（t_log.account_id は nullable）。
 * - `targetId` は null。対象は特定の 1 レコードではなく実行そのもの。
 * - `jaId` は null。バッチは全 JA を横断するため単一の JA に紐付かない。
 *   ただし t_log 検索の DataScope はこの列で効くので、**この行は NICHINO 系
 *   ロールからしか見えない**。JA 側の担当者に見せる必要が出たら、実行サマリ
 *   ではなく行単位ログ（jaId 付き）を足す方針で検討すること。
 * - 件数は `afterValue` に JSON で入れる。before は無い（実行前の状態という
 *   概念が無い）ので渡さない。
 *
 * 呼び出しは業務トランザクションの **外** で行う（manager を渡さない）。
 * サマリは「バッチが動いた事実」の記録なので、途中の 1 件が失敗して業務側が
 * ロールバックしても残す必要がある。
 */
export async function logBatchRun(
  auditLog: AuditLogService,
  params: {
    /** t_log.gamen_name。`${バッチ名} (${npm script 名})` の形で揃える。 */
    screen: string;
    /** t_log.operation の前半（処理内容）。実行者名は actor から付く。 */
    operation: string;
    /** 実行者名（`SystemActor.*`）。operation の末尾に `(...)` で付く。 */
    actor: string;
    /** 主に書き込んだテーブル。複数なら代表 1 つ（詳細は summary に入れる）。 */
    table: string;
    /** 件数など。JSON 化して afterValue に入る。 */
    summary: Record<string, unknown>;
    /** 1 件でも失敗していれば true（resultStatus を WARNING にする）。 */
    hasFailure?: boolean;
    /** 実行自体が例外で落ちた場合のメッセージ。渡すと FAILURE になる。 */
    errorMessage?: string;
  },
): Promise<void> {
  await auditLog.logOperation({
    logType: params.errorMessage ? LogType.ERROR : LogType.SYSTEM,
    accountId: null,
    jaId: null,
    gamenName: params.screen,
    operation: `${params.operation} (${params.actor})`,
    resultStatus: resolveResultStatus(params),
    targetId: null,
    targetTable: params.table,
    afterValue: JSON.stringify(params.summary),
    ipAddress: '',
    userAgent: '',
    ...(params.errorMessage ? { errorMessage: params.errorMessage } : {}),
  });
}

/** 例外で落ちた=FAILURE / 一部失敗=WARNING / それ以外=SUCCESS。 */
function resolveResultStatus(params: {
  hasFailure?: boolean;
  errorMessage?: string;
}): number {
  if (params.errorMessage) return ResultStatus.FAILURE;
  if (params.hasFailure) return ResultStatus.WARNING;
  return ResultStatus.SUCCESS;
}

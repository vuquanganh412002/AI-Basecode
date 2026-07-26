/**
 * 購読者「到来日反映」バッチのエントリポイント（単発実行）。
 * 購読中止日が到来した購読者の解約を確定し、全購読者を当日基準で再計算して
 * 情報変更予約の反映・最新データフラグの更新を行う。
 *
 * 5:00(JST) に agrinews-terraform の EventBridge ルール → ECS RunTask が起動。
 * Invoke:
 *   dev : npm run dokusya:apply-due
 *   prod: npm run dokusya:apply-due:prod   (node dist/batch/dokusya-apply-due.main.js)
 *
 * 定型処理（application context の起動・サービス解決・exit code）は runBatch()
 * に集約しているため、ここはバッチサービスを渡すだけ。
 */
import { DokusyaApplyDueService } from '@/modules/batch/dokusya-apply-due/dokusya-apply-due.service';
import { runBatch } from '@/batch/run-batch';

void runBatch('dokusya-apply-due', DokusyaApplyDueService);

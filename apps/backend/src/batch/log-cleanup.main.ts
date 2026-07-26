/**
 * ログ削除バッチのエントリポイント（単発実行）。
 * 保持期間（既定 5年）を過ぎた t_log / t_login_log を物理削除する。
 *
 * 23:00(JST) に agrinews-terraform の EventBridge ルール → ECS RunTask が起動。
 * Invoke:
 *   dev : npm run log:cleanup
 *   prod: npm run log:cleanup:prod   (node dist/batch/log-cleanup.main.js)
 *
 * 定型処理（application context の起動・サービス解決・exit code）は runBatch()
 * に集約しているため、ここはバッチサービスを渡すだけ。
 */
import { LogCleanupService } from '@/modules/batch/log-cleanup/log-cleanup.service';
import { runBatch } from '@/batch/run-batch';

void runBatch('log-cleanup', LogCleanupService);

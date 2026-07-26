/**
 * ファイル削除バッチのエントリポイント（単発実行）。
 * 削除予定日(scheduled_delete_date)を過ぎた取込/ダウンロードファイルを
 * S3から物理削除し、t_file_upload / t_file_download の行を論理削除する。
 *
 * 深夜に agrinews-terraform の EventBridge ルール → ECS RunTask が起動。
 * Invoke:
 *   dev : npm run file:cleanup
 *   prod: npm run file:cleanup:prod   (node dist/batch/file-cleanup.main.js)
 *
 * 定型処理（application context の起動・サービス解決・exit code）は runBatch()
 * に集約しているため、ここはバッチサービスを渡すだけ。
 */
import { FileCleanupService } from '@/modules/batch/file-cleanup/file-cleanup.service';
import { runBatch } from '@/batch/run-batch';

void runBatch('file-cleanup', FileCleanupService);

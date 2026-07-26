/**
 * 単価 有効期限切れバッチのエントリポイント（単発実行）。
 * m_tanka.tekiyo_end_date が過ぎた active_flg=TRUE の単価を FALSE にする。
 *
 * 0:05(JST) に agrinews-terraform の EventBridge ルール → ECS RunTask が起動。
 * Invoke:
 *   dev : npm run tanka:expire
 *   prod: npm run tanka:expire:prod   (node dist/batch/tanka-expire.main.js)
 *
 * 定型処理（application context の起動・サービス解決・exit code）は runBatch()
 * に集約しているため、ここはバッチサービスを渡すだけ。
 */
import { TankaExpireService } from '@/modules/batch/tanka-expire/tanka-expire.service';
import { runBatch } from '@/batch/run-batch';

void runBatch('tanka-expire', TankaExpireService);

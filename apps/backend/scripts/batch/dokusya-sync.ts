/**
 * 読者（dokusya）同期バッチのエントリポイント（単発実行）。
 * 電子版 `users` → 自社 `t_dokusya` の差分取込を1回だけ行う。
 *
 * 10分間隔で agrinews-terraform の EventBridge ルール（rate(10 minutes)）が
 * ECS RunTask を起動し、backend タスク定義の command override
 * `npm run dokusya:sync` としてこのスクリプトが実行される。
 *
 * Invoke:
 *   npm run dokusya:sync     (dev / prod 共通。prod の env はタスク定義から渡る)
 *
 * 定型処理（application context の起動・サービス解決・exit code）は
 * runBatch() に集約しているため、ここはバッチサービスを渡すだけ。
 */
import { DokusyaSyncService } from '@/modules/batch/dokusya-sync/dokusya-sync.service';
import { runBatch } from './run-batch';

void runBatch('dokusya-sync', DokusyaSyncService);

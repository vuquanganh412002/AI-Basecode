/**
 * 読者（dokusya）同期バッチのエントリポイント（単発実行）。
 * 電子版 `users` → 自社 `t_dokusya` の差分取込を1回だけ行う。
 *
 * 10分間隔で agrinews-terraform の EventBridge ルール（rate(10 minutes)）が
 * ECS RunTask を起動し、backend タスク定義の command override で実行される。
 *
 * Invoke:
 *   dev : npm run dokusya:sync        (ts-node — src を直接実行)
 *   prod: npm run dokusya:sync:prod   (node dist/batch/dokusya-sync.main.js)
 *
 * 定型処理（application context の起動・サービス解決・exit code）は runBatch()
 * に集約しているため、ここはバッチサービスを渡すだけ。
 */
import { DokusyaSyncService } from '@/modules/batch/dokusya-sync/dokusya-sync.service';
import { runBatch } from '@/batch/run-batch';

void runBatch('dokusya-sync', DokusyaSyncService);

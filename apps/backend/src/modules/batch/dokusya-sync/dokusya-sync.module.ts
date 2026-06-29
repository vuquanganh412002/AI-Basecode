import { Module } from '@nestjs/common';
import { DokusyaSyncService } from './dokusya-sync.service';

/**
 * 読者（dokusya）同期バッチ — 電子版 `users` → 自社 `t_dokusya` 差分取込のモジュール。
 *
 * 電子版DBへの接続は `DenshibanDbModule`（@Global）の `DenshibanDbService`、
 * 自社DBは TypeORM のデフォルト接続を `@InjectDataSource()` で利用するため、
 * ここでは追加の import は不要。コマンド（scripts/batch/dokusya-sync.ts）が
 * Nest application context からこのサービスを解決して実行する。
 */
@Module({
  providers: [DokusyaSyncService],
  exports: [DokusyaSyncService],
})
export class DokusyaSyncModule {}

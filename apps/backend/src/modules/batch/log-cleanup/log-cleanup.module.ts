import { Module } from '@nestjs/common';
import { LogCleanupService } from './log-cleanup.service';

/**
 * ログ削除バッチのモジュール。
 *
 * 自社DBは TypeORM のデフォルト接続を `@InjectDataSource()` で利用するため
 * 追加の import は不要（ConfigModule は isGlobal）。エントリ
 * （src/batch/log-cleanup.main.ts）が Nest application context から
 * `LogCleanupService` を解決して `run()` を実行する（app.get で解決するため
 * exports は不要）。
 */
@Module({
  providers: [LogCleanupService],
})
export class LogCleanupModule {}

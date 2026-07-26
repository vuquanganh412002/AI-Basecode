import { Module } from '@nestjs/common';
import { FileCleanupService } from './file-cleanup.service';

/**
 * ファイル削除バッチのモジュール。
 *
 * 自社DBは TypeORM のデフォルト接続を `@InjectDataSource()` で利用し、
 * `StorageService` は StorageModule が @Global で提供するため追加 import は不要。
 * エントリ（src/batch/file-cleanup.main.ts）が Nest application context から
 * `FileCleanupService` を解決して `run()` を実行する（app.get で解決するため
 * exports は不要）。
 */
@Module({
  providers: [FileCleanupService],
})
export class FileCleanupModule {}

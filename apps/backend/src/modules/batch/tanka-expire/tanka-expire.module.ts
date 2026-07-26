import { Module } from '@nestjs/common';
import { TankaExpireService } from './tanka-expire.service';

/**
 * 単価 有効期限切れバッチのモジュール。
 *
 * 自社DBは TypeORM のデフォルト接続を `@InjectDataSource()` で利用するため
 * 追加の import は不要。エントリ（src/batch/tanka-expire.main.ts）が Nest
 * application context から `TankaExpireService` を解決して `run()` を実行する
 * （app.get で解決するため exports は不要）。
 */
@Module({
  providers: [TankaExpireService],
})
export class TankaExpireModule {}

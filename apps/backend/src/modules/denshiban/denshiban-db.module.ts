import { Global, Module } from '@nestjs/common';
import { DenshibanApiService } from './denshiban-api.service';
import { DenshibanDbService } from './denshiban-db.service';
import { DenshibanPushService } from './denshiban-push.service';

/**
 * 顧客システム「電子版」への副接続モジュール。
 *
 * 横断的に参照されうるので `@Global()`。
 *   - `DenshibanDbService`  : 電子版DB(MySQL)への副接続（pull sync 等で参照）。
 *   - `DenshibanApiService` : 会員情報更新API(updateUserInfo)クライアント。
 *   - `DenshibanPushService`: cloud → 電子版 push（UI/取込/到来日バッチから利用）。
 */
@Global()
@Module({
  providers: [DenshibanDbService, DenshibanApiService, DenshibanPushService],
  exports: [DenshibanDbService, DenshibanApiService, DenshibanPushService],
})
export class DenshibanDbModule {}

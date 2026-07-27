import { Global, Module } from '@nestjs/common';
import { DenshibanApiService } from './denshiban-api.service';
import { DenshibanDbService } from './denshiban-db.service';
import { DenshibanPushService } from './denshiban-push.service';

/**
 * 顧客システム「電子版」への副接続モジュール。
 *
 * 横断的に参照されうるので `@Global()`。ECS BE 起動時に:
 *   - `DenshibanDbService` がDB(MySQL)の疎通確認ログを出す。
 *   - `DenshibanApiService` が会員情報更新API(updateUserInfo)の疎通確認を行う
 *     （フラグ DENSHIBAN_API_PING=true のときのみ・⚠️暫定診断）。
 */
@Global()
@Module({
  providers: [DenshibanDbService, DenshibanApiService, DenshibanPushService],
  exports: [DenshibanDbService, DenshibanApiService, DenshibanPushService],
})
export class DenshibanDbModule {}

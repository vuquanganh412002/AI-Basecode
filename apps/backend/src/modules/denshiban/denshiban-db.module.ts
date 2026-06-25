import { Global, Module } from '@nestjs/common';
import { DenshibanDbService } from './denshiban-db.service';

/**
 * 顧客システム「電子版」のDB（読み取り専用 / MySQL）への副接続モジュール。
 *
 * 横断的に参照されうるので `@Global()`。ECS BE 起動時に
 * `DenshibanDbService` が疎通確認のログを出す。
 */
@Global()
@Module({
  providers: [DenshibanDbService],
  exports: [DenshibanDbService],
})
export class DenshibanDbModule {}

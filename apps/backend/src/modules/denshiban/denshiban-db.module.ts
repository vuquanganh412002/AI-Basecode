import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';

import { DenshibanApiService } from './denshiban-api.service';
import { DenshibanDbService } from './denshiban-db.service';
import { DenshibanSyncService } from './denshiban-sync.service';
import { DenshibanSyncWorker } from './denshiban-sync.worker';

/**
 * 顧客システム「電子版」との連携モジュール。
 *
 * 横断的に参照されうるので `@Global()` — `DokusyaService`（Pha 3）は
 * import 無しで `DenshibanSyncService` を注入できる。
 *
 * 構成:
 *   - `DenshibanSyncService` … 業務ロジックが呼ぶ唯一の入口（enqueue するだけ）
 *   - `DenshibanSyncWorker`  … キューを消費し、組み立て → 検証 → 送信 → 会員ID保存
 *   - `DenshibanApiService`  … 暗号化 + POST（`updateUserInfo`）
 *   - `DenshibanDbService`   … 電子版 MySQL の read-only 参照（別系統・受信側）
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Dokusya, KanriShiten])],
  providers: [
    DenshibanDbService,
    DenshibanApiService,
    DenshibanSyncService,
    DenshibanSyncWorker,
  ],
  exports: [DenshibanDbService, DenshibanApiService, DenshibanSyncService],
})
export class DenshibanDbModule {}

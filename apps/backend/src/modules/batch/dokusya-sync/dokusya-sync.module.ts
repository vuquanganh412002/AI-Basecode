import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DenshiSyncState } from '@/database/entities/denshi-sync-state.entity';
import { DokusyaRirekiService } from '@/modules/dokusya/dokusya-rireki-helper.service';
import { DokusyaSyncService } from './dokusya-sync.service';

/**
 * 読者（dokusya）同期バッチ — 電子版 `users` → 自社 `t_dokusya` 差分取込のモジュール。
 *
 * 電子版DBへの接続は `DenshibanDbModule`（@Global）の `DenshibanDbService`、
 * 自社DBは TypeORM のデフォルト接続を `@InjectDataSource()` で利用する。履歴書込は
 * 純関数 `applyChange` に委譲するが、rireki_no 直列化ロック用に
 * `DokusyaRirekiService`（DI 依存なし）を provide する。チェックポイント
 * `t_denshi_sync_state` を `forFeature` で登録し autoLoadEntities に載せる。
 * コマンド（src/batch/dokusya-sync.main.ts）が Nest application context から
 * このサービスを解決して実行する。
 */
@Module({
  imports: [TypeOrmModule.forFeature([DenshiSyncState])],
  providers: [DokusyaSyncService, DokusyaRirekiService],
  exports: [DokusyaSyncService],
})
export class DokusyaSyncModule {}

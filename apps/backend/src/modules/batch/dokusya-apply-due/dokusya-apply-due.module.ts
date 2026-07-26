import { Module } from '@nestjs/common';
import { DokusyaKaiyakuService } from './dokusya-kaiyaku.service';
import { DokusyaRecomputeService } from './dokusya-recompute.service';
import { DokusyaApplyDueService } from './dokusya-apply-due.service';

/**
 * 購読者「到来日反映」バッチのモジュール。
 *
 * 自社DBは TypeORM のデフォルト接続を `@InjectDataSource()` で利用し、履歴書込は
 * 既存の純関数ヘルパ（insertKaiyaku / recomputeMaster）に委譲するため追加 import は
 * 不要。エントリ（src/batch/dokusya-apply-due.main.ts）が Nest application context
 * から `DokusyaApplyDueService` を解決して `run()` を実行する（app.get で解決する
 * ため exports は不要）。
 */
@Module({
  providers: [
    DokusyaKaiyakuService,
    DokusyaRecomputeService,
    DokusyaApplyDueService,
  ],
})
export class DokusyaApplyDueModule {}

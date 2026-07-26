import { Injectable, Logger } from '@nestjs/common';

import { DenshibanInboundSyncService } from '@/modules/denshiban/inbound/denshiban-inbound-sync.service';

/**
 * 読者（独：dokusya）同期バッチのドメインサービス。
 *
 * 電子版（顧客MySQL）の `users` テーブルから差分を取得し、自社の `t_dokusya`
 * に取り込む。10分間隔で EventBridge → ECS RunTask の command override で
 * 起動されるコマンド（src/batch/dokusya-sync.main.ts）から `run()` が1回呼ばれる。
 *
 * 常駐 cron ではなく単発実行なので `@nestjs/schedule` の @Cron は使わない
 * （スケジュールは agrinews-terraform 側の EventBridge ルールが持つ）。
 * 電子版DBへは `DenshibanInboundSyncService` 内部で
 * `DenshibanDbService.withConnection()` により短命接続を開いて読む。
 */
@Injectable()
export class DokusyaSyncService {
  private readonly logger = new Logger(DokusyaSyncService.name);

  constructor(
    // 電子版 `users` → 自社 `t_dokusya` 取込の単発オーケストレータ。
    // `DenshibanDbModule`（@Global）が提供するため import は不要。
    private readonly inboundSync: DenshibanInboundSyncService,
  ) {}

  /**
   * 差分取込を1回実行する。コマンドから呼ばれる単発エントリ。
   * 失敗時は例外を投げてコマンドを非0終了させ、ECSタスクを失敗扱いにする
   * （CloudWatch / EventBridge のメトリクスで検知できるように）。
   *
   * `syncAll()` は1行単位のトランザクションで、行の失敗は握りつぶして
   * `failed` に計上し処理を継続する（部分成功 = created:16, failed:4 もあり得る）。
   * 取込対象が1件もない/全件成功なら正常終了。接続不能や `DENSHIBAN_DB_ENABLED=false`
   * のような致命的失敗は `syncAll()` が例外を投げ、ここで再送出して非0終了する。
   */
  async run(): Promise<void> {
    const startedAt = Date.now();
    this.logger.log({ event: 'dokusya_sync.start' });

    try {
      const summary = await this.inboundSync.syncAll();
      this.logger.log({
        event: 'dokusya_sync.summary',
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        failed: summary.failed,
      });
    } catch (err) {
      this.logger.error({
        event: 'dokusya_sync.error',
        message: (err as Error).message,
      });
      throw err;
    } finally {
      this.logger.log({
        event: 'dokusya_sync.done',
        durationMs: Date.now() - startedAt,
      });
    }
  }
}

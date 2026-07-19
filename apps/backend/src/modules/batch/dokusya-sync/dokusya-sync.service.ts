import { Injectable, Logger } from '@nestjs/common';

import { DenshibanInboundSyncService } from '@/modules/denshiban/inbound/denshiban-inbound-sync.service';

/**
 * 読者（独：dokusya）同期バッチのドメインサービス。
 *
 * 電子版（顧客MySQL）の `users` テーブルから `collecting=1` の読者を取得し、
 * 自社の `t_dokusya` に取り込む。10分間隔で EventBridge → ECS RunTask の command
 * override で起動されるコマンド（scripts/batch/dokusya-sync.ts）から `run()` が
 * 1回呼ばれる。
 *
 * 常駐 cron ではなく単発実行なので `@nestjs/schedule` の @Cron は使わない
 * （スケジュールは agrinews-terraform 側の EventBridge ルールが持つ）。
 *
 * 取込の実ロジックは電子版モジュールの {@link DenshibanInboundSyncService} に
 * 委譲する（fetch → assemble → classify → applyChange + 監査、行単位トランザク
 * ション）。本サービスはバッチのエントリ（ログ＋失敗時の非0終了）に徹する。
 */
@Injectable()
export class DokusyaSyncService {
  private readonly logger = new Logger(DokusyaSyncService.name);

  constructor(private readonly inboundSync: DenshibanInboundSyncService) {}

  /**
   * 差分取込を1回実行する。コマンドから呼ばれる単発エントリ。
   * 失敗時は例外を投げてコマンドを非0終了させ、ECSタスクを失敗扱いにする
   * （CloudWatch / EventBridge のメトリクスで検知できるように）。
   */
  async run(): Promise<void> {
    const startedAt = Date.now();
    this.logger.log({ event: 'dokusya_sync.start' });

    try {
      const summary = await this.inboundSync.syncAll();
      this.logger.log({ event: 'dokusya_sync.summary', ...summary });
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

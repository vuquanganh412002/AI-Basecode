import { Injectable, Logger } from '@nestjs/common';

import { DenshibanInboundSyncService } from '@/modules/denshiban/inbound/denshiban-inbound-sync.service';

/**
 * 読者（独：dokusya）同期バッチのドメインサービス。
 *
 * 電子版（顧客MySQL）の `users` テーブルから差分を取得し、自社の `t_dokusya`
 * に取り込む。10分間隔で EventBridge → ECS RunTask の command override で
 * 起動されるコマンド（scripts/batch/dokusya-sync.ts）から `run()` が1回呼ばれる。
 *
 * 常駐 cron ではなく単発実行なので `@nestjs/schedule` の @Cron は使わない
 * （スケジュールは agrinews-terraform 側の EventBridge ルールが持つ）。
 *
 * 取込ロジック本体は `DenshibanInboundSyncService.syncAll()`（電子版DBを
 * `DenshibanDbService.withConnection()` の短命接続で読み → 行単位トランザクション
 * で `t_dokusya`(+履歴) へ反映 + 監査ログ）に集約されている。本バッチサービスは
 * その単発オーケストレーションを1回呼び、結果サマリをログするだけの薄い層。
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
      // 電子版 `users`（collecting=1）→ 自社 `t_dokusya` の差分取込を実行する。
      // fetch → classify(create/update/skip) → applyChange(履歴+マスタ再計算) + 監査。
      // 取込元が電子版なので syncAll は絶対に sendNow（逆同期）を呼ばない（エコー防止）。
      const summary = await this.inboundSync.syncAll();

      this.logger.log({
        event: 'dokusya_sync.summary',
        fetched: summary.fetched,
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        failed: summary.failed,
      });

      // 行単位トランザクションのため、一部行が失敗しても取込自体は継続する
      // （syncAll が failed をカウントする）。運用検知のため warn を残す。
      if (summary.failed > 0) {
        this.logger.warn(
          `dokusya_sync: ${summary.failed}件の取込に失敗しました（詳細は行単位のエラーログを参照）。`,
        );
      }
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

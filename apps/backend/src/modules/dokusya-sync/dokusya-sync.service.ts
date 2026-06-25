import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DenshibanDbService } from '@/modules/denshiban/denshiban-db.service';

/**
 * 読者（独：dokusya）同期バッチのドメインサービス。
 *
 * 電子版（顧客MySQL）の `users` テーブルから差分を取得し、自社の `t_dokusya`
 * に取り込む。10分間隔で EventBridge → ECS RunTask の command override で
 * 起動されるコマンド（scripts/dokusya-sync.ts）から `run()` が1回呼ばれる。
 *
 * 常駐 cron ではなく単発実行なので `@nestjs/schedule` の @Cron は使わない
 * （スケジュールは agrinews-terraform 側の EventBridge ルールが持つ）。
 * 電子版DBへは `DenshibanDbService.withConnection()` で短命接続を開いて読む
 * （常時接続は保持しない — 副接続サービスの方針）。
 */
@Injectable()
export class DokusyaSyncService {
  private readonly logger = new Logger(DokusyaSyncService.name);

  constructor(
    private readonly denshibanDb: DenshibanDbService,
    // 自社の業務DB（PostgreSQL, DatabaseModule のデフォルト接続）。
    @InjectDataSource() private readonly mainDb: DataSource,
  ) {}

  /**
   * 差分取込を1回実行する。コマンドから呼ばれる単発エントリ。
   * 失敗時は例外を投げてコマンドを非0終了させ、ECSタスクを失敗扱いにする
   * （CloudWatch / EventBridge のメトリクスで検知できるように）。
   */
  async run(): Promise<void> {
    const startedAt = Date.now();
    this.logger.log({ event: 'dokusya_sync.start' });

    try {
      // ───────────────────────────────────────────────────────────────
      // TODO: 電子版 `users` → 自社 `t_dokusya` 差分取込ロジックを実装する。
      //
      //   1. 取込基準（差分の起点）を決める。例: 自社 t_dokusya の最大 updated_at
      //        const [{ since }] = await this.mainDb.query(
      //          'SELECT MAX(updated_at) AS since FROM t_dokusya',
      //        );
      //   2. 電子版から差分行を取得（短命接続・読み取り専用）:
      //        const rows = await this.denshibanDb.withConnection((ds) =>
      //          ds.query(
      //            'SELECT * FROM users WHERE updated_at > ? ORDER BY updated_at',
      //            [since],
      //          ),
      //        );
      //   3. 必要なら common_key（DENSHIBAN_DB_COMMON_KEY）で復号し、
      //      電子版 users → 自社 t_dokusya のカラムマッピングを行う。
      //   4. 自社DBのトランザクションで upsert:
      //        await this.mainDb.transaction(async (manager) => {
      //          // INSERT ... ON CONFLICT (key) DO UPDATE ...
      //        });
      //   5. 取込件数・最終取込時刻などをログ/記録する。
      // ───────────────────────────────────────────────────────────────
      this.logger.warn(
        'dokusya_sync: ロジック未実装 (TODO) — 取込処理はまだ行っていません。',
      );
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

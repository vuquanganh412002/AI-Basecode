import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { BatchJob } from '@/batch/batch-job.interface';

/** 1回の DELETE で消す最大行数。大量削除でのロング・ロック／WAL 肥大を避けるため
 *  チャンク分割し、対象が無くなるまでループする。 */
const CHUNK_SIZE = 5000;

/** 保持年数の既定値（設定・環境変数が無い場合）。 */
const DEFAULT_RETENTION_YEARS = 5;

/** 削除対象テーブルの定義（識別子は SQL に直接埋め込むため、外部入力ではなく
 *  この定数のみを使う ＝ SQL インジェクション不可）。 */
interface LogTable {
  /** テーブル名 */
  readonly table: string;
  /** 主キー列（チャンク抽出・RETURNING に使用） */
  readonly pk: string;
  /** 保持判定に使うイベント時刻列（timestamptz） */
  readonly tsColumn: string;
}

const LOG_TABLES: readonly LogTable[] = [
  { table: 't_log', pk: 'log_id', tsColumn: 'log_datetime' },
  { table: 't_login_log', pk: 'login_log_id', tsColumn: 'login_datetime' },
];

/**
 * ログ削除バッチ（顧客レビュー 2026-07 No.5）。
 *
 * 監査ログ(t_log)・ログインログ(t_login_log)のうち、保持期間（既定 5年）を
 * 過ぎたレコードを物理削除する。冪等（何度実行しても同結果）。
 *
 * カットオフは Postgres 側で `NOW() - make_interval(years => $1)` として計算する:
 *   - NOW() は接続セッションの timezone（Asia/Tokyo 固定）に基づく現在時刻。
 *   - make_interval はうるう年・月末を正しく扱うため JS 側の日付演算より安全。
 *   - years は $1 でバインド（数値パラメータ ＝ 注入不可）。
 * よって `log_datetime < NOW() - make_interval(years => :years)` が
 *   「今から :years 年より前」＝ 保持対象外。
 *
 * 大量削除対策として主キー IN (... LIMIT n) のチャンク削除をループし、
 * 各チャンクは RETURNING で削除件数を数える。
 *
 * スケジュール(23:00 JST 想定)は agrinews-terraform の EventBridge ルールが持つ。
 * エントリ: src/batch/log-cleanup.main.ts（`npm run log:cleanup[:prod]`）。
 */
@Injectable()
export class LogCleanupService implements BatchJob {
  private readonly logger = new Logger(LogCleanupService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    const retentionYears =
      this.config.get<number>('app.logRetentionYears') ?? DEFAULT_RETENTION_YEARS;

    const result: Record<string, number> = {};
    for (const t of LOG_TABLES) {
      result[t.table] = await this.purge(t, retentionYears);
    }

    this.logger.log({
      event: 'log_cleanup.done',
      retentionYears,
      deleted: result,
      durationMs: Date.now() - startedAt,
    });
  }

  /**
   * 1テーブルを保持期間外レコードについてチャンク削除し、削除総件数を返す。
   * 識別子（table/pk/tsColumn）は LOG_TABLES 由来の定数のみ、年数は $1 バインド。
   *
   * `DataSource.query()` は DELETE に対し raw タプル `[rows, rowCount]` を返す
   * （TypeORM 仕様: UPDATE/DELETE は影響行数を追加で返す）。よって削除件数は
   * `result[1]`。`result.length` で数えると常に 2 になり件数を誤るので不可。
   */
  private async purge(t: LogTable, retentionYears: number): Promise<number> {
    let total = 0;
    for (;;) {
      const result: [unknown[], number] = await this.db.query(
        `DELETE FROM ${t.table}
          WHERE ${t.pk} IN (
            SELECT ${t.pk} FROM ${t.table}
             WHERE ${t.tsColumn} < NOW() - make_interval(years => $1)
             LIMIT ${CHUNK_SIZE}
          )`,
        [retentionYears],
      );
      const deleted = Array.isArray(result) ? (result[1] ?? 0) : 0;
      total += deleted;
      // フルチャンク未満 ＝ 対象を消し切ったのでループ終了（冪等: 対象0なら即終了）。
      if (deleted < CHUNK_SIZE) break;
    }
    return total;
  }
}

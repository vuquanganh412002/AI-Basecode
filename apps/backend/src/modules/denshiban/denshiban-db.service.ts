import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * 顧客システム「電子版」のDB（読み取り専用 / MySQL）への副接続サービス。
 *
 * 電子版DBは「一部のバッチ」でのみ参照するため、メイン業務DB
 * （PostgreSQL, `DatabaseModule`）のように常時接続プールを保持しない。
 * 代わりに `withConnection()` で呼ばれるたびに短命接続を開き、処理後に
 * 必ず閉じる（接続のライフサイクル = バッチの実行中だけ）。常時 idle conn を
 * 抱えないので wait_timeout / NAT idle 切断・stale conn 問題が原理的に発生しない。
 *
 * 起動時（onApplicationBootstrap）は「疎通確認だけ」短命接続で行い、
 * すぐ閉じる。接続失敗してもアプリ本体は落とさず、ログのみ
 * （ECS / CloudWatch で確認）。`denshiban.enabled=false` なら一切接続しない。
 */
@Injectable()
export class DenshibanDbService implements OnApplicationBootstrap {
  private readonly logger = new Logger('DenshibanDbConnection');

  constructor(private readonly configService: ConfigService) {}

  /**
   * 設定から DataSource オプションを組み立てる（初期化はしない）。
   * `denshiban.enabled=false` なら null。
   */
  private buildOptions(): DataSourceOptions | null {
    if (!this.configService.get<boolean>('denshiban.enabled')) return null;

    const host = this.configService.get<string>('denshiban.host');
    const port = this.configService.get<number>('denshiban.port');
    const username = this.configService.get<string>('denshiban.username');
    const password = this.configService.get<string>('denshiban.password');
    const database = this.configService.get<string>('denshiban.database');
    const ssl = this.configService.get<boolean>('denshiban.ssl');

    return {
      type: 'mysql',
      host,
      port,
      username,
      password,
      // database 未指定（空文字）でも接続できるよう undefined に正規化。
      database: database || undefined,
      // RDS は TLS 必須。RDS CA を同梱せず in-transit 暗号化のみ行うため
      // rejectUnauthorized:false。検証/ローカルは false。
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
      // 読み取り専用の外部参照。エンティティ・マイグレーションは持たない。
      entities: [],
      synchronize: false,
      extra: {
        // バッチ実行中だけの短命プール。常時保持しないので idleTimeout /
        // maxIdle / keepAlive のような「idle 維持」チューニングは不要。
        connectionLimit: 3,
        // 接続が無応答でハングしないよう接続タイムアウトのみ設定。
        connectTimeout: 10_000,
      },
    };
  }

  /**
   * バッチ用途のエントリポイント。呼ぶたびに短命接続を開き、`fn` 実行後に
   * 必ず閉じる（成功・失敗にかかわらず destroy）。常時接続は保持しない。
   *
   * @example
   *   const rows = await denshibanDb.withConnection((ds) =>
   *     ds.query('SELECT * FROM t_dokusya WHERE updated_at > ?', [since]),
   *   );
   *
   * @throws `denshiban.enabled=false` のとき。
   */
  async withConnection<T>(fn: (ds: DataSource) => Promise<T>): Promise<T> {
    const options = this.buildOptions();
    if (!options) {
      throw new Error('電子版DB is disabled (denshiban.enabled=false)');
    }
    const ds = new DataSource(options);
    await ds.initialize();
    try {
      return await fn(ds);
    } finally {
      // バッチ終了時に必ず接続を解放。
      await ds.destroy().catch(() => undefined);
    }
  }

  /**
   * ECS BE 起動時の疎通確認のみ。短命接続を開き `SELECT 1` で検証し、
   * ログを出してすぐ閉じる（接続は保持しない）。認証情報はログに出さない。
   */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.configService.get<boolean>('denshiban.enabled')) {
      this.logger.warn(
        '⏭️  電子版DB connection is disabled (denshiban.enabled=false) — skipping.',
      );
      return;
    }

    const host = this.configService.get<string>('denshiban.host');
    const port = this.configService.get<number>('denshiban.port');
    const database = this.configService.get<string>('denshiban.database');
    const target = `host=${host}:${port} db=${database || '(default)'}`;

    try {
      await this.withConnection(async (ds) => {
        await ds.query('SELECT 1');
        this.logger.log(
          `✅ 電子版DB (MySQL) connected — ${target}（疎通確認のみ・接続は保持しない）`,
        );
        // ⚠️ TEMPORARY 診断 — フラグ ON のときだけ、テーブル一覧 + 各テーブル
        // 先頭10件を起動ログに出す。dump 許可待ちの暫定確認用（PII をログに
        // 出すため既定 OFF・本番禁止、許可後に削除）。
        if (this.configService.get<boolean>('denshiban.debugSample')) {
          await this.logSampleData(ds);
        }
      });
    } catch (err) {
      // 補助接続の失敗でアプリ本体を落とさない — ログだけ出して継続する。
      this.logger.error(
        `❌ 電子版DB (MySQL) connection failed — ${target}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * ⚠️ TEMPORARY 診断（dump 許可待ちの暫定確認）。フラグ
   * `DENSHIBAN_DB_DEBUG_SAMPLE=true` のときだけ呼ばれる。渡された短命接続
   * （onApplicationBootstrap の withConnection 内）に対して直接:
   *
   *   1. SHOW TABLES でテーブル一覧をログに出す。
   *   2. 各テーブルの「列数・列名・先頭3件」を見やすいツリー形式でログに出す
   *      （テーブルごと best-effort）。
   *
   * ⚠️ ja / users 等は個人情報(PII)を含みうる。本メソッドは PII を CloudWatch に
   * 書き出すため、dev/検証のみ・暫定限定。dump 許可が下りたら本メソッドごと削除。
   * 全て best-effort — 失敗しても接続疎通は成功扱いのまま warn のみ。
   */
  private async logSampleData(ds: DataSource): Promise<void> {
    const SAMPLE_ROWS = 3;

    // ── 1. テーブル一覧（接続中DB = cmsDB）─────────────────────────────
    let tableNames: string[] = [];
    try {
      const rows =
        await ds.query<Array<Record<string, string>>>('SHOW TABLES');
      // SHOW TABLES の列名は `Tables_in_<db>` と可変なので最初の値を取る。
      tableNames = rows.map((r) => Object.values(r)[0]).filter(Boolean);
      this.logger.log(
        `🗂️  電子版DB tables (${tableNames.length}): ${tableNames.join(', ')}`,
      );
    } catch (err) {
      this.logger.warn(
        `🗂️  電子版DB: テーブル一覧の取得に失敗（接続は成功）: ${(err as Error).message}`,
      );
      return;
    }

    // ── 2. 各テーブル: 列数・列名・先頭3件（テーブルごと best-effort）──────
    // テーブル名は SHOW TABLES 由来のサーバ側識別子なのでバッククォートで
    // 安全に補間（ユーザー入力ではない）。行数は定数。
    // 1テーブル分を1つの複数行メッセージにまとめてツリー形式で出力し、
    // ログ上で1ブロックとして読みやすくする。
    for (const table of tableNames) {
      try {
        // 列情報は SHOW COLUMNS から取得（0件のテーブルでも列が分かる）。
        // SHOW COLUMNS の各列値は文字列なので Record<string, string> で受ける。
        const columns = await ds.query<Array<Record<string, string>>>(
          `SHOW COLUMNS FROM \`${table}\``,
        );
        const colNames = columns.map((c) => c.Field ?? c.field ?? '');

        const sample = await ds.query<Array<Record<string, unknown>>>(
          `SELECT * FROM \`${table}\` LIMIT ${SAMPLE_ROWS}`,
        );

        const block = [
          `🔎 [TEMP/PII] テーブル: ${table}`,
          `   ├─ 列数: ${colNames.length}`,
          `   ├─ 列名: ${colNames.join(', ') || '-'}`,
          `   └─ 先頭${SAMPLE_ROWS}件${sample.length === 0 ? ': (データなし)' : ':'}`,
          ...sample.map((row, i) => `        [${i + 1}] ${JSON.stringify(row)}`),
        ].join('\n');
        this.logger.warn(block);
      } catch (err) {
        this.logger.warn(
          `🔎 電子版DB: ${table} のサンプル取得に失敗（権限なし等）: ${(err as Error).message}`,
        );
      }
    }
  }
}

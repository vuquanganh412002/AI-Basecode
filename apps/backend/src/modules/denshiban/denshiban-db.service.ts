import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Secondary connection to the customer system "denshiban"'s DB (read-only / MySQL).
 *
 * The denshiban DB is only read by "some batches", so unlike the main business DB
 * (PostgreSQL, `DatabaseModule`) it does not hold a persistent connection pool.
 * Instead, `withConnection()` opens a short-lived connection per call and always
 * closes it afterwards (the connection's lifetime = the batch run). Because no
 * idle connection is ever held, wait_timeout / NAT idle disconnects / stale
 * connections cannot occur by construction.
 *
 * At startup (onApplicationBootstrap) it does a connectivity check only, over a
 * short-lived connection, then closes immediately. A connection failure does not
 * take the app down — it only logs (check ECS / CloudWatch). With
 * `denshiban.enabled=false` it never connects at all.
 */
@Injectable()
export class DenshibanDbService {
  private readonly logger = new Logger(DenshibanDbService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Builds the DataSource options from config (does not initialize).
   * `null` when `denshiban.enabled=false`.
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
      // Normalize to undefined so connecting works even with no database
      // specified (empty string).
      database: database || undefined,
      // RDS requires TLS. We don't bundle the RDS CA and only want in-transit
      // encryption, hence rejectUnauthorized:false. False for verification/local.
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
      // Read-only external reference. Owns no entities and no migrations.
      entities: [],
      synchronize: false,
      extra: {
        // A short-lived pool that exists only during a batch run. Since nothing is
        // held long-term, "keep idle alive" tuning (idleTimeout / maxIdle /
        // keepAlive) is unnecessary.
        connectionLimit: 3,
        // Only a connect timeout, so an unresponsive connection can't hang.
        connectTimeout: 10_000,
      },
    };
  }

  /**
   * The entry point for batch use. Opens a short-lived connection per call and
   * always closes it after `fn` (destroy on success or failure). No persistent
   * connection is held.
   *
   * @example
   *   const rows = await denshibanDb.withConnection((ds) =>
   *     ds.query('SELECT * FROM t_dokusya WHERE updated_at > ?', [since]),
   *   );
   *
   * @throws when `denshiban.enabled=false`.
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
      // Always release the connection when the batch ends.
      await ds.destroy().catch(() => undefined);
    }
  }

  /**
   * Connectivity check only, at ECS BE startup. Opens a short-lived connection,
   * verifies with `SELECT 1`, logs, and closes immediately (no connection is
   * retained). Credentials are never logged.
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
        // ⚠️ TEMPORARY diagnostic — only when the flag is ON, log the table list
        // plus the first 10 rows of each table at startup. An interim check while
        // we wait for dump permission (it logs PII, so default OFF, banned in
        // production, delete once permission arrives).
        if (this.configService.get<boolean>('denshiban.debugSample')) {
          await this.logSampleData(ds);
        }
      });
    } catch (err) {
      // A failure on a secondary connection must not take the app down — log and
      // continue.
      this.logger.error(
        `❌ 電子版DB (MySQL) connection failed — ${target}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * ⚠️ TEMPORARY diagnostic (an interim check while dump permission is pending).
   * Called only when the flag `DENSHIBAN_DB_DEBUG_SAMPLE=true`. Against the
   * short-lived connection it is handed (from onApplicationBootstrap's
   * withConnection) it directly:
   *
   *   1. Logs the table list via SHOW TABLES.
   *   2. Logs each table's column count / column names / first 3 rows in a readable
   *      tree format (best-effort per table).
   *
   * ⚠️ Tables like ja / users can contain personal information (PII). This method
   * writes PII to CloudWatch, so it is dev/verification only and strictly interim.
   * Delete the whole method once dump permission is granted. Everything is
   * best-effort — a failure leaves the connectivity check successful and only warns.
   */
  private async logSampleData(ds: DataSource): Promise<void> {
    const SAMPLE_ROWS = 3;

    // ── 1. Table list (the connected DB = cmsDB) ────────────────────────────
    let tableNames: string[] = [];
    try {
      const rows =
        await ds.query<Array<Record<string, string>>>('SHOW TABLES');
      // SHOW TABLES names its column `Tables_in_<db>`, which varies, so take the
      // first value.
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

    // ── 2. Per table: column count / names / first 3 rows (best-effort each) ──
    // Table names come from SHOW TABLES, i.e. server-side identifiers, so
    // backtick interpolation is safe (not user input). The row count is a constant.
    // Each table is emitted as one multi-line message in tree form so it reads as a
    // single block in the logs.
    for (const table of tableNames) {
      try {
        // Column info comes from SHOW COLUMNS (so columns are visible even for an
        // empty table). Every SHOW COLUMNS value is a string, hence
        // Record<string, string>.
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

import { Injectable } from '@nestjs/common';
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
 * `denshiban.enabled=false` なら接続しない（`withConnection` が例外を投げる）。
 */
@Injectable()
export class DenshibanDbService {
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
}

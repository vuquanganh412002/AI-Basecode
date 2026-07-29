import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * 電子版DB（読み取り専用 MySQL）への副接続サービス。バッチでのみ参照するため常時
 * プールを持たず、`withConnection()` ごとに短命接続を開いて必ず閉じる（idle conn を
 * 抱えず wait_timeout/NAT 切断問題を回避）。`denshiban.enabled=false` なら接続しない。
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
   * バッチ用エントリ。呼ぶたびに短命接続を開き `fn` 実行後に必ず閉じる（成否問わず destroy）。
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

import * as path from 'node:path';
import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { toBoolean } from '@/common/utils/env';
import { configurePgTypeParsers } from '@/database/pg-type-parsers';

// DATE 列を 'YYYY-MM-DD' 文字列で受け取る (JST off-by-one 防止)。
// プロセスグローバル — モジュール読み込み時に一度だけ適用すれば全接続に効く。
configurePgTypeParsers();

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        // Aurora/RDS は TLS 必須（pg_hba が "no encryption" を拒否）。
        // rejectUnauthorized:false で RDS CA を同梱せず TLS を使う（全チェーン
        // 検証なしで転送を暗号化）。ローカルは `false`。
        ssl: toBoolean(config.get<string | boolean>('database.ssl'))
          ? { rejectUnauthorized: false }
          : false,
        autoLoadEntities: true,
        synchronize: false,
        migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
        migrationsRun: true,
        extra: {
          max: 10,
          idleTimeoutMillis: 30000,
          // JST 運用 — 接続ごとに Postgres session timezone を設定し
          // NOW() / CURRENT_TIMESTAMP / TIMESTAMPTZ の表示を JST に揃える。
          // 内部保存は UTC のまま（TIMESTAMPTZ が保証）。
          // .claude/rules/nestjs.md §Timestamp policy 参照。
          options: '-c timezone=Asia/Tokyo',
        },
      }),
    }),
  ],
})
export class DatabaseModule implements OnApplicationBootstrap {
  private readonly logger = new Logger('DatabaseConnection');

  constructor(private readonly dataSource: DataSource) {}

  /**
   * TypeORM はモジュール init 時に接続するため、ブートストラップ完了時点で
   * DataSource は初期化済み。接続確認ログを1行だけ出す（ECS / CloudWatch で
   * 確認可能）。host + db 名のみ、認証情報は絶対に出さない。
   */
  onApplicationBootstrap(): void {
    const options = this.dataSource.options as { host?: string; port?: number; database?: unknown };
    if (this.dataSource.isInitialized) {
      this.logger.log(
        `✅ PostgreSQL connected — host=${options.host}:${options.port} db=${String(options.database)}`,
      );
    } else {
      this.logger.error('❌ PostgreSQL DataSource is not initialized');
    }
  }
}

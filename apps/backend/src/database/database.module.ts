import * as path from 'path';
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
        // Aurora/RDS require TLS (pg_hba rejects "no encryption"). pg accepts
        // rejectUnauthorized:false to use TLS without bundling the RDS CA —
        // encrypts in transit without full chain verification. `false` locally.
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
          // JST 運用 — Postgres session timezone is set per-connection so
          // NOW() / CURRENT_TIMESTAMP / TIMESTAMPTZ display follow JST.
          // Storage stays UTC internally (TIMESTAMPTZ guarantees that).
          // See .claude/rules/nestjs.md §Timestamp policy.
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
   * TypeORM establishes the connection during module init, so by the time
   * the app finishes bootstrapping the DataSource is already initialized.
   * Emit one line (visible in ECS / CloudWatch) confirming the connection —
   * host + db name only, never credentials.
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

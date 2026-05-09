import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

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
export class DatabaseModule {}

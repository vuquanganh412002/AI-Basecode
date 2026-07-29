import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';
import { toBoolean } from '@/common/utils/env';

/**
 * Global Redis モジュール — 全機能モジュール（セッションストア、OTP、
 * レート制限）で共有する単一 ioredis クライアント。
 *
 * ローカル: docker-compose の `redis` サービスへ接続。
 * 本番: `REDIS_URL` を AWS ElastiCache primary endpoint に設定
 * （in-transit 暗号化時は `REDIS_TLS=true`）。
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const logger = new Logger('RedisClient');
        const url = config.get<string>('redis.url');
        const keyPrefix = config.get<string>('redis.keyPrefix') ?? '';

        const host = config.get<string>('redis.host');
        const port = config.get<number>('redis.port');
        const password = config.get<string>('redis.password') || undefined;
        const tls = toBoolean(config.get<string | boolean>('redis.tls'));

        const options: RedisOptions = {
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          keyPrefix,
          // AUTH token。ElastiCache は AUTH 必須。rediss:// URL はパスワードを
          // 持たないため URL 分岐でもここで供給 MUST（無いと "NOAUTH
          // Authentication required"）。
          password,
        };
        if (tls) {
          options.tls = {};
        }

        // ログ用エンドポイントラベル — REDIS_URL 設定時はその host、他は
        // host/port。パスワードは含めない。
        const endpoint = url ? url.replace(/\/\/[^@]*@/, '//') : `${host}:${port}`;

        const client = url
          ? new Redis(url, options)
          : new Redis({ host, port, ...options });

        client.on('connect', () => logger.log({ event: 'redis.connect' }));
        // `ready` は接続が使用可能（post-AUTH / readiness check）で発火。
        // ECS / CloudWatch で見える 1 行を出力。
        client.on('ready', () =>
          logger.log(`✅ Redis connected — ${endpoint}${tls ? ' (TLS)' : ''}`),
        );
        client.on('error', (err: Error) =>
          logger.error({ event: 'redis.error', message: err.message }),
        );
        client.on('end', () => logger.warn({ event: 'redis.disconnected' }));

        return client;
      },
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}

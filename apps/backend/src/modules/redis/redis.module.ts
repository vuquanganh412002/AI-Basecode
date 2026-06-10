import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';
import { toBoolean } from '@/common/utils/env';

/**
 * Global Redis module — single ioredis client shared by every feature
 * module (session store, OTP, rate limiting).
 *
 * Local dev: connects to the `redis` service in docker-compose.
 * Production: set `REDIS_URL` to the AWS ElastiCache primary endpoint
 * (plus `REDIS_TLS=true` when in-transit encryption is enabled).
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
          // AUTH token. ElastiCache requires AUTH; the rediss:// URL carries
          // no password, so it MUST be supplied here for the URL branch too
          // (otherwise "NOAUTH Authentication required").
          password,
        };
        if (tls) {
          options.tls = {};
        }

        // Endpoint label for logs — derived from REDIS_URL host when set,
        // otherwise the host/port pair. Never includes the password.
        const endpoint = url ? url.replace(/\/\/[^@]*@/, '//') : `${host}:${port}`;

        const client = url
          ? new Redis(url, options)
          : new Redis({ host, port, ...options });

        client.on('connect', () => logger.log({ event: 'redis.connect' }));
        // `ready` fires once the connection is usable (post-AUTH / readiness
        // check). Emit one clear line (visible in ECS / CloudWatch).
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

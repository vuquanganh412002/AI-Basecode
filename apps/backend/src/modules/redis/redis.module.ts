import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';

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

        const options: RedisOptions = {
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          keyPrefix,
        };
        if (config.get<boolean>('redis.tls')) {
          options.tls = {};
        }

        const client = url
          ? new Redis(url, options)
          : new Redis({
              host: config.get<string>('redis.host'),
              port: config.get<number>('redis.port'),
              password: config.get<string>('redis.password') || undefined,
              ...options,
            });

        client.on('connect', () => logger.log({ event: 'redis.connect' }));
        client.on('ready', () => logger.log({ event: 'redis.ready' }));
        client.on('error', (err) =>
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

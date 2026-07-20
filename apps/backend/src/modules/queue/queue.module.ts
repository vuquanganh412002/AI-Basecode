import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toBoolean } from '@/common/utils/env';

import {
  QUEUE_DENSHIBAN_SYNC,
  QUEUE_FILE_UPLOAD_NOTIFICATION,
} from './queue-names.constants';

/**
 * Global BullMQ wiring. Feature modules import the resulting queue via
 * `@InjectQueue(QUEUE_FILE_UPLOAD_NOTIFICATION)` (producer) or attach a
 * `@Processor(QUEUE_FILE_UPLOAD_NOTIFICATION)` worker class — both pick up
 * the connection options configured here.
 *
 * BullMQ requires a DEDICATED Redis connection (not the session-store one
 * in `RedisModule`) because workers issue blocking commands (BRPOPLPUSH)
 * that conflict with `maxRetriesPerRequest: 3` on the shared client.
 * BullMQ's own ioredis instance forces `maxRetriesPerRequest: null` —
 * we just hand it host/port/password and let it manage the socket.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('redis.url');
        const useTls = toBoolean(config.get<string | boolean>('redis.tls'));
        // AUTH token — ElastiCache requires AUTH and the rediss:// URL carries
        // no password, so it MUST be supplied explicitly or BullMQ's Redis
        // connection fails with "NOAUTH Authentication required". Mirrors the
        // RedisModule (session store) fix.
        const password = config.get<string>('redis.password') || undefined;

        // Resolve discrete host/port/tls. BullMQ passes this options object
        // straight to ioredis, and ioredis does NOT read a `url` field from an
        // options object (unlike `new Redis(url)` where the URL is a positional
        // arg). The previous `{ url, tls }` branch therefore (a) dropped the
        // AUTH token and (b) didn't reliably point ioredis at the ElastiCache
        // endpoint — so BullMQ silently failed on AWS while local (no REDIS_URL)
        // kept working. Parse REDIS_URL ourselves instead of trusting a `url`
        // key.
        let host = config.get<string>('redis.host');
        let port = config.get<number>('redis.port');
        let tls = useTls;
        if (url) {
          const parsed = new URL(url);
          host = parsed.hostname;
          if (parsed.port) port = Number(parsed.port);
          if (parsed.protocol === 'rediss:') tls = true;
        }

        return {
          connection: {
            host,
            port,
            password,
            tls: tls ? {} : undefined,
          },
          // Project-wide defaults — individual queues / job options can
          // still override (e.g. urgent jobs may set attempts=1).
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
            removeOnFail: { age: 30 * 24 * 3600, count: 5000 },
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_FILE_UPLOAD_NOTIFICATION,
    }),
    BullModule.registerQueue({
      name: QUEUE_DENSHIBAN_SYNC,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

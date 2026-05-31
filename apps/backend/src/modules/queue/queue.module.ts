import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QUEUE_FILE_UPLOAD_NOTIFICATION } from './queue-names.constants';

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
        return {
          connection: url
            ? { url, tls: config.get<boolean>('redis.tls') ? {} : undefined }
            : {
                host: config.get<string>('redis.host'),
                port: config.get<number>('redis.port'),
                password: config.get<string>('redis.password') || undefined,
                tls: config.get<boolean>('redis.tls') ? {} : undefined,
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
  ],
  exports: [BullModule],
})
export class QueueModule {}

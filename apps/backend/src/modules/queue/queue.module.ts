import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toBoolean } from '@/common/utils/env';

import { QUEUE_FILE_UPLOAD_NOTIFICATION } from './queue-names.constants';

/**
 * BullMQ のグローバル配線。feature module は producer が
 * `@InjectQueue(QUEUE_FILE_UPLOAD_NOTIFICATION)`、worker が
 * `@Processor(QUEUE_FILE_UPLOAD_NOTIFICATION)` でここの接続設定を共有する。
 *
 * BullMQ は専用 Redis 接続が必須（RedisModule のセッション用は流用不可）。
 * worker のブロッキングコマンド(BRPOPLPUSH)が共有クライアントの
 * `maxRetriesPerRequest: 3` と衝突するため。BullMQ 自身の ioredis は
 * `maxRetriesPerRequest: null` を強制するので host/port/password だけ渡す。
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('redis.url');
        const useTls = toBoolean(config.get<string | boolean>('redis.tls'));
        // AUTH token — ElastiCache は AUTH 必須だが rediss:// URL には
        // password が乗らないため明示指定しないと "NOAUTH Authentication
        // required" で失敗。RedisModule(セッションストア)と同じ対処。
        const password = config.get<string>('redis.password') || undefined;

        // host/port/tls を個別に解決。BullMQ はこの options を ioredis へ
        // そのまま渡すが、ioredis は options 内の `url` フィールドを読まない
        // (`new Redis(url)` の位置引数とは別)。旧 `{ url, tls }` は AUTH token を
        // 落とし ElastiCache endpoint も確実に指せず、AWS で silent 失敗・
        // local(REDIS_URL 無し)のみ動作していた。`url` に頼らず自前で parse。
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
          // プロジェクト共通の既定値。個別キュー/ジョブで上書き可
          // (例: 緊急ジョブは attempts=1)。
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

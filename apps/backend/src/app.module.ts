import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { REDIS_CLIENT } from '@/modules/redis/redis.service';
import { nodeEnv } from './common/utils/env';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AccountModule } from './modules/account/account.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { StorageModule } from './modules/storage/storage.module';
import { MailModule } from './modules/mail/mail.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { CodeModule } from './modules/code/code.module';
import { DenshibanDbModule } from './modules/denshiban/denshiban-db.module';
import { DokusyaSyncModule } from './modules/batch/dokusya-sync/dokusya-sync.module';
import { TankaExpireModule } from './modules/batch/tanka-expire/tanka-expire.module';
import { LogCleanupModule } from './modules/batch/log-cleanup/log-cleanup.module';
import { FileCleanupModule } from './modules/batch/file-cleanup/file-cleanup.module';
import { DokusyaApplyDueModule } from './modules/batch/dokusya-apply-due/dokusya-apply-due.module';
import { DokusyaModule } from './modules/dokusya/dokusya.module';
import { FileDownloadModule } from './modules/file-download/file-download.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { HanbaitenModule } from './modules/hanbaiten/hanbaiten.module';
import { JaModule } from './modules/ja/ja.module';
import { KanriShitenModule } from './modules/kanri-shiten/kanri-shiten.module';
import { LogModule } from './modules/log/log.module';
import { ShitenModule } from './modules/shiten/shiten.module';
import { OshiraseModule } from './modules/oshirase/oshirase.module';
import { HaitatsuryoModule } from './modules/haitatsuryo/haitatsuryo.module';
import { KozaFurikaeModule } from './modules/koza-furikae/koza-furikae.module';
import { QueueModule } from './modules/queue/queue.module';
import { RedisModule } from './modules/redis/redis.module';
import { ReportModule } from './modules/report/report.module';
import { RolesModule } from './modules/roles/roles.module';
import { TankaModule } from './modules/tanka/tanka.module';
import { TodofukenModule } from './modules/todofuken/todofuken.module';
import type { Request, Response, NextFunction } from 'express';

const envFilePath = nodeEnv() === 'local' ? ['.env.local', '.env'] : ['.env'];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      load: [configuration],
    }),
    // Rate-limit counters live in Redis (shared) — NOT the default in-memory
    // storage. Prod runs ≥2 ECS tasks (Multi-AZ); in-memory buckets are
    // per-instance, so the ALB spreads N requests across tasks and the real
    // limit becomes `limit × task_count` — the @Throttle('login', 10/min)
    // brute-force guard effectively never trips. A single Redis-backed store
    // makes the per-endpoint limits hold cluster-wide. RedisModule is @Global
    // so REDIS_CLIENT is injectable here.
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [{ ttl: 60000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    RedisModule,
    QueueModule,
    DatabaseModule,
    DenshibanDbModule,
    DokusyaSyncModule,
    TankaExpireModule,
    LogCleanupModule,
    FileCleanupModule,
    DokusyaApplyDueModule,
    AuditLogModule,
    CodeModule,
    MailModule,
    AuthModule,
    AccountModule,
    HealthModule,
    StorageModule,
    OshiraseModule,
    DokusyaModule,
    FileUploadModule,
    FileDownloadModule,
    HanbaitenModule,
    JaModule,
    KanriShitenModule,
    LogModule,
    ShitenModule,
    TankaModule,
    TodofukenModule,
    ReportModule,
    HaitatsuryoModule,
    KozaFurikaeModule,
    RolesModule,
  ],
  // Wire ThrottlerGuard globally so the @Throttle() decorators on auth
  // endpoints (login 10/min, MFA verify 20/min, MFA resend 5/min,
  // forgot-password 3/hour, reset-password 5/min) actually enforce.
  // Without this APP_GUARD registration, @Throttle is decorator metadata
  // that no guard reads.
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        const r = req as unknown as Record<string, unknown>;
        r.id = (req.headers['x-request-id'] as string) || uuidv4();
        res.setHeader('X-Request-ID', r.id as string);
        next();
      })
      .forRoutes('*');
  }
}

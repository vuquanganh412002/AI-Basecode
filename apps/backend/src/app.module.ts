import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { v4 as uuidv4 } from 'uuid';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AccountModule } from './modules/account/account.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { StorageModule } from './modules/storage/storage.module';
import { MailModule } from './modules/mail/mail.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { CodeModule } from './modules/code/code.module';
import { JaModule } from './modules/ja/ja.module';
import { OshiraseModule } from './modules/oshirase/oshirase.module';
import { RedisModule } from './modules/redis/redis.module';
import { TodofukenModule } from './modules/todofuken/todofuken.module';
import type { Request, Response, NextFunction } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    RedisModule,
    DatabaseModule,
    AuditLogModule,
    CodeModule,
    MailModule,
    AuthModule,
    AccountModule,
    HealthModule,
    StorageModule,
    OshiraseModule,
    JaModule,
    TodofukenModule,
  ],
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

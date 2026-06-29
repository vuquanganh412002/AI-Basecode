/**
 * バッチ共通ランナー — 単発実行バッチのエントリポイント定型処理を集約する。
 *
 * 各バッチ（scripts/batch/<name>.ts）はこの runBatch() を呼ぶだけでよい。
 * EventBridge ルール → ECS RunTask の command override
 * `npm run <name>` で起動され、HTTPサーバは立てずに Nest application
 * context だけを起動し、DI 経由でバッチサービスを解決して run() を1回実行する。
 *
 * 成功時は exit code 0、失敗時は exit code 1 で終了するため、
 * ECSタスク／EventBridge 側で成否を検知できる。
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { Logger, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';

config();

/** 単発バッチサービスが満たすべき最小インターフェース。 */
export interface BatchJob {
  run(): Promise<void>;
}

/**
 * バッチサービスを Nest application context から解決して1回だけ実行する。
 * @param name - ログ識別用のバッチ名（kebab-case）
 * @param service - run() を持つバッチサービスクラス
 */
export async function runBatch(name: string, service: Type<BatchJob>): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(service).run();
    await app.close();
    process.exit(0);
  } catch (err) {
    new Logger(name).error(err);
    await app.close();
    process.exit(1);
  }
}

/**
 * バッチ共通ランナー — 単発実行バッチのエントリポイント定型処理を集約する。
 *
 * 各バッチのエントリ（src/batch/<name>.main.ts）はこの runBatch() を呼ぶだけでよい。
 * EventBridge ルール → ECS RunTask の command override（prod は `npm run
 * <name>:prod` = `node dist/batch/<name>.main.js`、dev は ts-node）で起動され、
 * HTTPサーバは立てずに Nest application context だけを起動し、DI 経由でバッチ
 * サービスを解決して run() を1回実行する。
 *
 * 成功時は exit code 0、失敗時は exit code 1 で終了するため、ECSタスク／
 * EventBridge 側で成否を検知できる。process.exit() は「スケジュール実行の確実な
 * 終了」を優先した明示終了（NestJS Logger は同期 console 出力なので run() 内の
 * ログは app.close() 前に既に flush 済み）。
 *
 * ※ 本ランナーは src 配下にあり dist へコンパイルされる（旧 scripts/batch 版の
 *   ts-node-in-prod を廃止）。app と同じく `node dist/...` で動く。
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import {
  Logger,
  type INestApplicationContext,
  type Type,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import type { BatchJob } from '@/batch/batch-job.interface';

config();

export type { BatchJob };

/**
 * バッチサービスを Nest application context から解決して1回だけ実行する。
 * @param name - ログ識別用のバッチ名（kebab-case）
 * @param service - run() を持つバッチサービスクラス
 */
export async function runBatch(name: string, service: Type<BatchJob>): Promise<void> {
  // app 生成(createApplicationContext)も try 内に入れる。boot 失敗(DB/Redis
  // 未達 等)も catch して Logger で整形ログ + exit(1) にするため。外に出すと
  // reject が runBatch を抜け、呼び出し側の `void runBatch(...)` で
  // unhandled rejection になり、ログが荒く exit も暗黙になる。
  let app: INestApplicationContext | undefined;
  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'warn', 'error'],
    });
    await app.get(service).run();
    await app.close();
    process.exit(0);
  } catch (err) {
    new Logger(name).error(err);
    await app?.close();
    process.exit(1);
  }
}

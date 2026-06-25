/**
 * 読者（dokusya）同期バッチのエントリポイント（単発実行）。
 * 電子版 `users` → 自社 `t_dokusya` の差分取込を1回だけ行う。
 *
 * 10分間隔で agrinews-terraform の EventBridge ルール（rate(10 minutes)）が
 * ECS RunTask を起動し、backend タスク定義の command override
 * `npm run dokusya:sync` としてこのスクリプトが実行される。
 *
 * Invoke:
 *   npm run dokusya:sync     (dev / prod 共通。prod の env はタスク定義から渡る)
 *
 * Nest application context を起動して DI 経由で DokusyaSyncService を解決し、
 * run() を1回だけ実行して終了する（HTTPサーバは起動しない）。
 * 失敗時は exit code 1 で終了し、ECSタスク／EventBridge 側で失敗を検知できる。
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { DokusyaSyncService } from '@/modules/dokusya-sync/dokusya-sync.service';

config();

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(DokusyaSyncService).run();
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    new Logger('dokusya-sync').error(err);
    process.exit(1);
  });

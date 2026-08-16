// `npm run swagger:export` で起動する OpenAPI ダンパー。
// Nest アプリを init のみ（listen なし）で起動し、SwaggerModule.createDocument
// で生成した OpenAPI を apps/backend/swagger.json に書き出して終了する。
//
// 出力は BE ローカル固定。FE はこのファイルを参照しない（FE ラッパーは手書き
// axios、Orval なし）。用途: オフライン API ドキュメント / エンドポイント形状を
// 変える PR のレビュー用スナップショット / 将来のスナップショット比較契約テスト。
// 実行時の Swagger UI（GET /api/docs）は main.ts の SwaggerModule.setup が別途配信。
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants/api.constants';
import { DEFAULT_SESSION_COOKIE_NAME } from './config/config-defaults.constant';

async function exportSwagger(): Promise<void> {
  process.stderr.write('[swagger-export] booting Nest app…\n');
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });

  const configService = app.get(ConfigService);
  const sessionCookieName =
    configService.get<string>('session.cookieName') ?? DEFAULT_SESSION_COOKIE_NAME;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('agrinews API')
    .setDescription('クラウド版購読者管理システム API')
    .setVersion('1.0')
    .addCookieAuth(sessionCookieName)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // 出力は BE ローカル（apps/backend/swagger.json）。FE は参照しない。
  // オフラインドキュメント / PR スナップショット用。CI が別パスを要る場合は
  // SWAGGER_OUT 環境変数で上書き。
  const out =
    process.env.SWAGGER_OUT ?? resolve(__dirname, '../swagger.json');
  writeFileSync(out, JSON.stringify(document, null, 2));
  process.stderr.write(`[swagger-export] wrote ${out}\n`);

  await app.close();
}

exportSwagger().then(
  () => process.exit(0),
  (err) => {
    process.stderr.write(`[swagger-export] failed: ${err?.stack ?? err}\n`);
    process.exit(1);
  },
);

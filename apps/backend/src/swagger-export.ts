// Standalone OpenAPI dumper invoked by `npm run swagger:export`.
//
// Builds the Nest app in init-only mode (no `listen` call so no port is
// bound), generates the OpenAPI document via `SwaggerModule.createDocument`,
// writes it to `apps/frontend/swagger.json` for Orval to consume, and exits.
//
// Used by `/gen-code-frontend` Phase 0 — keep this in sync with the
// SwaggerModule.setup block in main.ts (same DocumentBuilder fields).
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants/api.constants';

async function exportSwagger(): Promise<void> {
  process.stderr.write('[swagger-export] booting Nest app…\n');
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });

  const configService = app.get(ConfigService);
  const sessionCookieName =
    configService.get<string>('session.cookieName') ?? 'session_id';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('agrinews API')
    .setDescription('クラウド版購読者管理システム API')
    .setVersion('1.0')
    .addCookieAuth(sessionCookieName)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const out = resolve(__dirname, '../../frontend/swagger.json');
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

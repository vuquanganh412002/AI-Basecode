// Standalone OpenAPI dumper invoked by `npm run swagger:export`.
//
// Builds the Nest app in init-only mode (no `listen` call so no port is
// bound), generates the OpenAPI document via `SwaggerModule.createDocument`,
// writes it to `apps/backend/swagger.json`, and exits.
//
// Output is intentionally LOCAL to the backend (`apps/backend/swagger.json`)
// — the frontend does NOT consume this file (FE wrappers are hand-written
// axios calls, no Orval). Useful for:
//   - Offline API docs (load into Postman/Insomnia/etc.)
//   - Stable snapshot for review in PRs that change endpoint shape
//   - Future contract-test tooling that compares two snapshots
// The live Swagger UI at GET /api/docs is served at runtime by
// `SwaggerModule.setup` in main.ts — independent of this file.
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  // Output goes BE-local (apps/backend/swagger.json). FE doesn't consume
  // it; this is for offline docs / PR snapshots. Override via SWAGGER_OUT
  // env if CI needs a different path.
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

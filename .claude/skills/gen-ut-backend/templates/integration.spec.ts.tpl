// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: __SCREEN_ID__ — __SCREEN__
//
// Integration spec — boots the whole Nest app against pg-mem (Postgres in
// memory) + ioredis-mock so it exercises SessionAuthGuard, PermissionsGuard,
// GlobalExceptionFilter, ValidationPipe, and the real TypeORM queries.
//
// Uses `createIntegrationTestApp()` helper (in `test/utils/`). The helper
// wires pg-mem ↔ TypeOrmModule via `dataSourceFactory`, provides ConfigModule,
// stubs MailService, hooks ioredis-mock, applies cookie-parser middleware,
// and seeds m_code BEFORE app.init() so CodeService.onModuleInit() picks
// up reference data.
//
// IMPORTANT — when adding NEW entities for this module, append the entity
// classes to `ALL_ENTITIES` in `test/utils/create-integration-app.ts`.
// pg-mem's DataSource needs an explicit list because dataSourceFactory
// bypasses TypeORM's `autoLoadEntities`.

import request from 'supertest';
import type { Server } from 'http';

import { __MODULE_CLASS__ } from '@/modules/__MODULE__/__MODULE__.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  IntegrationTestContext,
} from '../utils/create-integration-app';

describe('__SCREEN_ID__ integration — __MODULE__ endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [__MODULE_CLASS__],
      seedSql: [
        // Seed any pre-existing rows the tests reference. SERIAL columns
        // auto-allocate ids — DON'T pass ja_id/<pk_id> explicitly because
        // pg-mem doesn't advance the sequence on explicit-id inserts.
        //
        // Example:
        // `INSERT INTO m___MODULE__
        //   (xxx_code, xxx_name, ..., created_at, created_by, updated_at, updated_by)
        //  VALUES
        //   ('AAA', 'Sample', ..., NOW(), 'SYSTEM', NOW(), 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  function asAdmin() {
    return ctx.seedSession({
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: [
        '__MODULE__.view',
        '__MODULE__.create',
        '__MODULE__.update',
        '__MODULE__.delete',
      ],
    });
  }

  // ─── One it() per HTTP contract from api.md ────────────────────────────
  //
  // it('should return 200 with detail when NICHINO_ADMIN GETs id=1', async () => {
  //   const sid = await asAdmin();
  //   const res = await http()
  //     .get('/api/v1/__MODULE__/1')
  //     .set('Cookie', [buildSessionCookie(ctx.app, sid)])
  //     .expect(200);
  //   expect(res.body.data).toMatchObject({ /* ... */ });
  // });
  //
  // it('should return 401 when session cookie is absent', async () => {
  //   await http().get('/api/v1/__MODULE__/1').expect(401);
  // });
  //
  // it('should write t_log row in the same transaction as the main DML', async () => {
  //   const sid = await asAdmin();
  //   await http()
  //     .post('/api/v1/__MODULE__')
  //     .set('Cookie', [buildSessionCookie(ctx.app, sid)])
  //     .send({ /* validBody */ })
  //     .expect(201);
  //
  //   const logs = await ctx.dataSource.query(
  //     `SELECT operation, log_type, result_status FROM t_log
  //      WHERE target_table = 'm___MODULE__'`,
  //   );
  //   expect(logs.some(l => l.operation === 'CREATE' && l.log_type === 1)).toBe(true);
  // });
});

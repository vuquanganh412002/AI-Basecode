// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: __SCREEN_ID__ — __SCREEN__
//
// Integration spec — boots the whole Nest app against pg-mem (Postgres in
// memory) + ioredis-mock so it exercises SessionAuthGuard, PermissionsGuard,
// GlobalExceptionFilter, and the real TypeORM queries without Docker.

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { newDb, IMemoryDb } from 'pg-mem';
import RedisMock from 'ioredis-mock';
import { AppModule } from '../../src/app.module';
import { REDIS_CLIENT } from '../../src/modules/redis/redis.service';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

describe('__SCREEN_ID__ integration — __MODULE__ endpoints', () => {
  let app: INestApplication;
  let pg: IMemoryDb;
  let redis: RedisMock;

  beforeAll(async () => {
    pg = newDb({ autoCreateForeignKeyIndices: true });
    pg.public.registerFunction({ name: 'current_database', returns: 'text' as any, implementation: () => 'test' });
    redis = new RedisMock();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(await pg.adapters.createTypeormDataSource({ type: 'postgres' }).initialize())
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser('test-secret-32-bytes-xxxxxxxxxxxx'));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  // Helper: create a session in Redis + return signed cookie
  async function authenticatedAgent() {
    const sid = 'test-session-id';
    await redis.set(`session:${sid}`, JSON.stringify({
      account_id: 1, login_id: 'test', role_id: 1, role_code: 'NICHINO_ADMIN',
      ja_id: null, kanri_shiten_id: null, permissions: ['__MODULE__.view', '__MODULE__.create'],
      created_at: new Date().toISOString(), last_activity_at: new Date().toISOString(),
    }));
    return { agent: request.agent(app.getHttpServer()), sid };
  }

  // it('should return 401 UNAUTHORIZED when no session cookie', async () => {
  //   const res = await request(app.getHttpServer()).get('/api/v1/__MODULE__');
  //   expect(res.status).toBe(401);
  //   expect(res.body.error_code).toBe('UNAUTHORIZED');
  // });
  //
  // it('should return 200 when authenticated with permission', async () => {
  //   const { agent } = await authenticatedAgent();
  //   const res = await agent.get('/api/v1/__MODULE__').set('Cookie', [`session_id=s:test-session-id.signed`]);
  //   expect(res.status).toBe(200);
  // });
});

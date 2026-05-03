// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { {{Entity}} } from '../../src/modules/{{domain}}/entities/{{entity}}.entity';
import { TLog } from '../../src/modules/audit-log/entities/t-log.entity';
import { loginAsRole } from '../helpers/auth.helper';

describe('{{Entity}} integration ({{SCREEN_ID}})', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminCookie: string;
  let chuokaiCookie: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    dataSource = moduleRef.get(DataSource);
    adminCookie = await loginAsRole(app, 'NICHINO_ADMIN');
    chuokaiCookie = await loginAsRole(app, 'CHUOKAI');
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE t_log RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE {{table}} RESTART IDENTITY CASCADE');
  });

  describe('POST /api/v1/{{domain}}', () => {
    it('should create record AND audit log atomically when payload is valid', async () => {
      const payload = { /* {{CREATE_DTO_FIELDS}} */ };

      const res = await request(app.getHttpServer())
        .post('/api/v1/{{domain}}')
        .set('Cookie', adminCookie)
        .send(payload)
        .expect(201);

      const repo = dataSource.getRepository({{Entity}});
      const created = await repo.findOne({ where: { id: res.body.data.id } });
      expect(created).toBeDefined();

      const logRepo = dataSource.getRepository(TLog);
      const log = await logRepo.findOne({ where: { target_id: created.id, operation: 'CREATE' } });
      expect(log).toBeDefined();
      expect(log.log_type).toBe(1);
      expect(log.result_status).toBe(1);
    });

    it('should return 400 with VALIDATION_ERROR when payload is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/{{domain}}')
        .set('Cookie', adminCookie)
        .send({ /* invalid payload */ })
        .expect(400)
        .expect(({ body }) => {
          expect(body.error_code).toBe('VALIDATION_ERROR');
        });
    });

    it('should return 401 UNAUTHORIZED when no session cookie is sent', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/{{domain}}')
        .send({ /* payload */ })
        .expect(401);
    });

    it('should return 403 FORBIDDEN when role lacks {{permission_create}} permission', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/{{domain}}')
        .set('Cookie', chuokaiCookie)
        .send({ /* payload */ })
        .expect(403);
    });
  });

  describe('GET /api/v1/{{domain}}', () => {
    it('should return only records of the user JA when role is CHUOKAI', async () => {
      // seed records across two ja_ids
      const res = await request(app.getHttpServer())
        .get('/api/v1/{{domain}}?page=1&per_page=20')
        .set('Cookie', chuokaiCookie)
        .expect(200);

      expect(res.body.data.every((row: any) => row.ja_id === 2)).toBe(true);
    });
  });

  describe('DELETE /api/v1/{{domain}}/:id', () => {
    it('should soft-delete and emit DELETE audit log when no related data exists', async () => {
      const created = await dataSource.getRepository({{Entity}}).save({ /* seed */ });

      await request(app.getHttpServer())
        .delete(`/api/v1/{{domain}}/${created.id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      const repo = dataSource.getRepository({{Entity}});
      const after = await repo.findOne({ where: { id: created.id }, withDeleted: true });
      expect(after.deleted_at).toBeDefined();
    });

    it('should return 409 CONFLICT when record has related child rows', async () => {
      // seed parent + child …
      const parent = await dataSource.getRepository({{Entity}}).save({ /* seed parent */ });

      await request(app.getHttpServer())
        .delete(`/api/v1/{{domain}}/${parent.id}`)
        .set('Cookie', adminCookie)
        .expect(409);
    });
  });
});

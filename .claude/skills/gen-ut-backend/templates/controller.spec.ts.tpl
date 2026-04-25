// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: __SCREEN_ID__ — __SCREEN__
//
// Placeholders:
//   __MODULE__     = module name (e.g. "tanka")
//   __CONTROLLER__ = controller class (e.g. "TankaController")
//   __SERVICE__    = service class (e.g. "TankaService")

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { vi } from 'vitest';
import { __CONTROLLER__ } from '../../src/modules/__MODULE__/__MODULE__.controller';
import { __SERVICE__ } from '../../src/modules/__MODULE__/__MODULE__.service';
import { SessionAuthGuard } from '../../src/common/guards/session-auth.guard';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard';
import { buildSession } from '../../test/fixtures/session.factory';

describe('__CONTROLLER__', () => {
  let app: INestApplication;
  let service: Record<string, ReturnType<typeof vi.fn>>;
  const session = buildSession({ permissions: ['__MODULE__.view', '__MODULE__.create', '__MODULE__.update', '__MODULE__.delete'] });

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [__CONTROLLER__],
      providers: [{ provide: __SERVICE__, useValue: service }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({ canActivate: (ctx) => { ctx.switchToHttp().getRequest().user = session; return true; } })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  // ─── One describe per endpoint ─────────────────────────────────────────
  //
  // describe('GET /api/v1/__MODULE__', () => {
  //   it('should return 200 with data+meta when valid query', async () => {
  //     service.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } });
  //     const res = await request(app.getHttpServer()).get('/api/v1/__MODULE__?page=1&per_page=20');
  //     expect(res.status).toBe(200);
  //     expect(res.body).toHaveProperty('data');
  //     expect(res.body).toHaveProperty('meta');
  //   });
  //
  //   it('should return 400 VALIDATION_ERROR when per_page > 100', async () => {
  //     const res = await request(app.getHttpServer()).get('/api/v1/__MODULE__?per_page=999');
  //     expect(res.status).toBe(400);
  //     expect(res.body.error_code).toBe('VALIDATION_ERROR');
  //   });
  // });
});

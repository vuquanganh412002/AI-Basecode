// Screen: ACSMS-SCR-021 — 配達手数料支払情報出力画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock so
// it exercises SessionAuthGuard, PermissionsGuard, GlobalExceptionFilter and
// the ValidationPipe for the haitatsuryo endpoints.
//
// The 集計 SQL uses a CTE + `DISTINCT ON` latest-snapshot which pg-mem does NOT
// implement, so the data-bearing happy-path cases run only against real
// Postgres in nightly CI (REAL_PG=1). The auth / permission / validation
// contracts DON'T touch that SQL and run normally here.

import request from 'supertest';
import type { Server } from 'node:http';

import { HaitatsuryoModule } from '@/modules/haitatsuryo/haitatsuryo.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  IntegrationTestContext,
} from '../utils/create-integration-app';

describe('ACSMS-SCR-021 integration — haitatsuryo endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({ modules: [HaitatsuryoModule] });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  it('should return 401 when session cookie is absent on preview', async () => {
    await http()
      .get('/api/v1/haitatsuryo/preview')
      .query({ target_month: '202604' })
      .expect(401);
  });

  it('should return 403 FORBIDDEN when the role lacks haitatsuryo.export', async () => {
    // NICHINO_ADMIN does NOT hold haitatsuryo.export (seeder.md §3).
    const sid = await ctx.seedSession({
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: ['ja.view'],
    });
    const res = await http()
      .get('/api/v1/haitatsuryo/preview')
      .query({ target_month: '202604' })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('should return 400 VALIDATION_ERROR when target_month is missing', async () => {
    // target_month is @IsNotEmpty on HaitatsuryoQueryDto — omitting it trips the
    // ValidationPipe (guards already passed with the right perm).
    const sid = await ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: 1,
      permissions: ['haitatsuryo.export'],
    });
    const res = await http()
      .get('/api/v1/haitatsuryo/preview')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  // Data-bearing happy-path uses CTE + DISTINCT ON — real PG only (nightly CI).
  it.todo('should return 200 with empty data when the aggregation matches 0 rows (requires real postgres)');
  it.todo('should aggregate 当月部数/当月金額 per 販売店 using the latest snapshot (requires real postgres DISTINCT ON)');
  it.todo('should switch kingaku to zeinuki when m_ja.zei_kubun=2 (外税) (requires real postgres)');
  it.todo('should write t_file_download(download_type=2) + t_log(log_type=4) in one tx on Excel export (requires real postgres)');
  it.todo('should NOT generate Excel / upload to S3 when 0 rows match on export');
});

// Screen: ACSMS-SCR-020 — 口座振替データ出力画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock so
// it exercises SessionAuthGuard, PermissionsGuard, GlobalExceptionFilter and
// the ValidationPipe for the koza-furikae endpoints.
//
// The export 集計 SQL uses `= ANY(:array)`, string concatenation (`||`) and a
// multi-table LEFT JOIN with date-range predicates that pg-mem does NOT fully
// implement, so the data-bearing happy-path cases run only against real
// Postgres in nightly CI (REAL_PG=1). The auth / permission / validation
// contracts DON'T touch that SQL and run normally here.

import request from 'supertest';
import type { Server } from 'node:http';

import { KozaFurikaeModule } from '@/modules/koza-furikae/koza-furikae.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  IntegrationTestContext,
} from '../utils/create-integration-app';

describe('ACSMS-SCR-020 integration — koza-furikae endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({ modules: [KozaFurikaeModule] });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  // GET /api/v1/koza-furikae/initial (ACSMS-API-020-001)
  it('should return 401 when session cookie is absent on initial', async () => {
    await http().get('/api/v1/koza-furikae/initial').expect(401);
  });

  it('should return 403 FORBIDDEN when the role lacks koza_furikae.export', async () => {
    // NICHINO_ADMIN does NOT hold koza_furikae.export (seeder.md §3).
    const sid = await ctx.seedSession({
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: ['ja.view'],
    });
    const res = await http()
      .get('/api/v1/koza-furikae/initial')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  // POST /api/v1/koza-furikae/export (ACSMS-API-020-002)
  it('should return 400 VALIDATION_ERROR when target_month / hikiotoshi_date are missing', async () => {
    // target_month + hikiotoshi_date are @IsNotEmpty on ExportKozaFurikaeDto —
    // an empty body trips the ValidationPipe (guards already passed).
    const sid = await ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: 1,
      permissions: ['koza_furikae.export'],
    });
    const res = await http()
      .post('/api/v1/koza-furikae/export')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .send({})
      .expect(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  // Data-bearing happy-path uses `= ANY`/`||`/multi-join SQL — real PG (nightly CI).
  it.todo('should return 200 with m_ja JASTEM + last-used m_shiten JASTEM data (requires real postgres)');
  it.todo('should return empty 金融機関支店 fields + 貯金種目 "1" when no kinyu_shiten exists (requires real postgres)');
  it.todo('should return 404 NO_TARGET_DATA when the aggregation matches 0 rows (requires real postgres)');
  it.todo('should aggregate 口座引落(shiharai_hoho=1) 購読者 per scope and emit a Shift_JIS Zengin CSV (requires real postgres = ANY/|| concat)');
  it.todo('should update m_ja + m_shiten JASTEM, upsert t_koza_furikae, register t_file_download(download_type=1) + t_log(log_type=1) in one tx (requires real postgres)');
  it.todo('should roll back every DB write when the audit log INSERT fails mid-transaction (requires real postgres)');
  it.todo('should still emit an error audit log (log_type=3) outside the rolled-back transaction (requires real postgres)');
  it.todo('should NOT perform any DB write when the S3 upload fails (requires real postgres + S3 mock)');
  it.todo('should reject with 403 DATA_SCOPE_VIOLATION when JA_KANRI_SHITEN passes a kanri_shiten_id outside its own branch (requires real postgres)');
});

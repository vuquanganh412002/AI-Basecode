// Screen: ACSMS-SCR-026 — 購読者名簿出力画面
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock
// so it exercises SessionAuthGuard, PermissionsGuard, GlobalExceptionFilter
// and the ValidationPipe for the report/meibo endpoints.
//
// IMPORTANT — ReportModule reads DokusyaRireki and writes FileDownload, both
// already registered in `ALL_ENTITIES` (dokusya / file-upload modules). If a
// future refactor removes them, append both entity classes back to
// `test/utils/create-integration-app.ts`.
//
// The "latest snapshot" query uses a ROW_NUMBER() window over
// t_dokusya_rireki, which pg-mem does not implement — the data-bearing
// happy-path cases are `it.skip`'d here (run in nightly CI against real
// Postgres) per the gen-ut-backend pg-mem rule. The auth/permission/
// validation contracts DON'T touch that SQL and run normally.

import request from 'supertest';
import type { Server } from 'http';

import { ReportModule } from '@/modules/report/report.module';
import {
  createIntegrationTestApp,
  buildSessionCookie,
  IntegrationTestContext,
} from '../utils/create-integration-app';

describe('ACSMS-SCR-026 integration — report/meibo endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({ modules: [ReportModule] });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  // JA role holding report.export_meibo (CHUOKAI per seeder.md).
  function asChuokai() {
    return ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: 1,
      permissions: ['report.export_meibo'],
    });
  }

  // JA role WITHOUT the permission (e.g. NICHINO_ADMIN — blocked per §1.2).
  function asNoPermission() {
    return ctx.seedSession({
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: ['ja.view'],
    });
  }

  it('should return 401 when session cookie is absent on preview', async () => {
    await http()
      .get('/api/v1/report/meibo/preview')
      .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten' })
      .expect(401);
  });

  it('should return 401 when session cookie is absent on export', async () => {
    await http()
      .get('/api/v1/report/meibo/export')
      .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten' })
      .expect(401);
  });

  it('should return 403 FORBIDDEN when the role lacks report.export_meibo', async () => {
    const sid = await asNoPermission();
    const res = await http()
      .get('/api/v1/report/meibo/preview')
      .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [1] })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('should return 400 VALIDATION_ERROR when tekiyo_date is missing', async () => {
    const sid = await asChuokai();
    const res = await http()
      .get('/api/v1/report/meibo/preview')
      .query({ report_type: 'hanbaiten' })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it.skip('should return 200 grouped preview data for CHUOKAI (requires real postgres — ROW_NUMBER() window unsupported by pg-mem)', async () => {
    const sid = await asChuokai();
    await http()
      .get('/api/v1/report/meibo/preview')
      .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [1] })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(200);
  });

  it.skip('should return 200 xlsx attachment + t_file_download row on export (requires real postgres)', async () => {
    const sid = await asChuokai();
    await http()
      .get('/api/v1/report/meibo/export')
      .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [1] })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(200);
  });
});

// ══════════════════════════════════════════════════════════════════════
// ACSMS-SCR-028 — 増減連絡票（販売店）出力. Endpoints land in the same
// ReportModule; auth/permission/validation contracts are fully covered by
// the controller unit spec. These integration cases activate after
// /gen-code-backend implements the endpoints (kept skipped so the merged
// SCR-026 integration suite stays green in the RED phase).
// ══════════════════════════════════════════════════════════════════════
describe('ACSMS-SCR-028 integration — report/zougen-hanbaiten endpoints', () => {
  it.todo('should return 401 when session cookie is absent on preview');
  it.todo('should return 403 FORBIDDEN when the role lacks report.export_zougen_hanbaiten');
  it.todo('should return 400 VALIDATION_ERROR when tekiyo_date is missing');
  it.todo('should return 404 NO_REPORT_DATA when no record matches (requires real postgres)');
  it.todo('should write t_file_download(download_type=3) + t_log in one tx on PDF export (real postgres)');
});

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
import type { Server } from 'node:http';

import { ReportModule } from '@/modules/report/report.module';
import {
  createIntegrationTestApp,
  createRealPgIntegrationApp,
  describeRealPg,
  buildSessionCookie,
  IntegrationTestContext,
} from '../utils/create-integration-app';

// JA role holding report.export_meibo (CHUOKAI per seeder.md). Module-scope
// so both the pg-mem gate suite and the real-PG suite share one definition.
function seedChuokai(ctx: IntegrationTestContext) {
  return ctx.seedSession({
    role_code: 'CHUOKAI',
    ja_id: 1,
    permissions: ['report.export_meibo'],
  });
}

describe('ACSMS-SCR-026 integration — report/meibo endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({ modules: [ReportModule] });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

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
    const sid = await seedChuokai(ctx);
    const res = await http()
      .get('/api/v1/report/meibo/preview')
      .query({ report_type: 'hanbaiten' })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

});

// ══════════════════════════════════════════════════════════════════════
// SCR-026 — real Postgres only (ROW_NUMBER() window over t_dokusya_rireki +
// xlsx export writing t_file_download). Runs when REAL_PG=1.
// ══════════════════════════════════════════════════════════════════════
describeRealPg('ACSMS-SCR-026 integration — report/meibo (real postgres)', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createRealPgIntegrationApp({
      modules: [ReportModule],
      seedSql: [
        // m_account(1) so the export's t_file_download.account_id FK resolves
        // (default seedSession uses account_id=1). role 1 must precede it.
        `INSERT INTO m_roles (role_id, role_code, role_name, created_by, updated_by)
         VALUES (1, 'NICHINO_ADMIN', '日農管理者', 'SYSTEM', 'SYSTEM'),
                (3, 'CHUOKAI', '中央会', 'SYSTEM', 'SYSTEM')`,
        `INSERT INTO m_account
           (account_id, login_id, password_hash, account_name, role_id,
            ja_id, kanri_shiten_id, paper_flg, denshi_flg, created_by, updated_by)
         VALUES
           (1, 'admin01', 'x', '管理者', 1, NULL, NULL, true, true, 'SYSTEM', 'SYSTEM')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  it('should return 200 grouped preview data for CHUOKAI (ROW_NUMBER window)', async () => {
    // COVERS: §4 latest-snapshot ROW_NUMBER() over t_dokusya_rireki.
    // Empty result set is fine — the point is the window SQL executes.
    const sid = await seedChuokai(ctx);
    await http()
      .get('/api/v1/report/meibo/preview')
      .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [1] })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(200);
  });

  it('should return 404 REPORT_NO_DATA on export when no subscriber matches', async () => {
    // COVERS: export runs the same ROW_NUMBER snapshot query on real PG;
    // with no matching 履歴 it maps the empty set to 404 REPORT_NO_DATA
    // (画面設計書 — 出力対象0件). The populated 200-xlsx path needs a full
    // t_dokusya_rireki + join-chain seed — tracked as a follow-up.
    const sid = await seedChuokai(ctx);
    const res = await http()
      .get('/api/v1/report/meibo/export')
      .query({ tekiyo_date: '2026-04-01', report_type: 'hanbaiten', hanbaiten_ids: [1] })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(404);
    expect(res.body.error_code).toBe('REPORT_NO_DATA');
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
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({ modules: [ReportModule] });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  it('should return 401 when session cookie is absent on preview', async () => {
    await http()
      .get('/api/v1/report/zougen-hanbaiten/preview')
      .query({ tekiyo_date: '2026-04-01' })
      .expect(401);
  });

  it('should return 403 FORBIDDEN when the role lacks report.export_zougen_hanbaiten', async () => {
    // NICHINO_ADMIN does NOT hold report.export_zougen_hanbaiten (seeder.md §3).
    const sid = await ctx.seedSession({
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: ['ja.view'],
    });
    const res = await http()
      .get('/api/v1/report/zougen-hanbaiten/preview')
      .query({ tekiyo_date: '2026-04-01' })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('should return 400 VALIDATION_ERROR when tekiyo_date is missing', async () => {
    // tekiyo_date is @IsNotEmpty on ZougenHanbaitenQueryDto — omitting it
    // trips the ValidationPipe (guards already passed with the right perm).
    const sid = await ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: 1,
      permissions: ['report.export_zougen_hanbaiten'],
    });
    const res = await http()
      .get('/api/v1/report/zougen-hanbaiten/preview')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  // Data-bearing happy-path uses the ROW_NUMBER snapshot SQL — real PG (nightly).
  it.todo('should return 200 with empty reports when no record matches (requires real postgres)');
  it.todo('should write t_file_download(download_type=3) + t_log in one tx on PDF export (real postgres)');
});

// ══════════════════════════════════════════════════════════════════════
// ACSMS-SCR-029 — 増減通知（日本農業新聞）出力. Endpoints land in the same
// ReportModule; auth/permission/validation contracts are fully covered by the
// controller unit spec. These integration cases activate after
// /gen-code-backend implements the endpoints (kept skipped so the merged
// SCR-026 integration suite stays green in the RED phase).
// ══════════════════════════════════════════════════════════════════════
describe('ACSMS-SCR-029 integration — report/zougen-nichino endpoints', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({ modules: [ReportModule] });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  it('should return 401 when session cookie is absent on preview', async () => {
    await http()
      .get('/api/v1/report/zougen-nichino/preview')
      .query({ tekiyo_date: '2026-04-01' })
      .expect(401);
  });

  it('should return 403 FORBIDDEN when the role lacks report.export_zougen_nichino', async () => {
    // NICHINO_ADMIN does NOT hold report.export_zougen_nichino (seeder.md §3).
    const sid = await ctx.seedSession({
      role_code: 'NICHINO_ADMIN',
      ja_id: null,
      permissions: ['ja.view'],
    });
    const res = await http()
      .get('/api/v1/report/zougen-nichino/preview')
      .query({ tekiyo_date: '2026-04-01' })
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('should return 400 VALIDATION_ERROR when tekiyo_date is missing', async () => {
    // tekiyo_date is @IsNotEmpty on ZougenNichinoQueryDto — omitting it trips
    // the ValidationPipe (guards already passed with the right perm).
    const sid = await ctx.seedSession({
      role_code: 'CHUOKAI',
      ja_id: 1,
      permissions: ['report.export_zougen_nichino'],
    });
    const res = await http()
      .get('/api/v1/report/zougen-nichino/preview')
      .set('Cookie', [buildSessionCookie(ctx.app, sid)])
      .expect(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  // Data-bearing happy-path + ZIP/mail use real-PG SQL — nightly CI.
  it.todo('should return 200 with empty reports when no record matches (requires real postgres)');
  it.todo('should write t_file_download(download_type=4) + t_log in one tx on PDF export (real postgres)');
  it.todo('should send a 日農 notification mail on successful export (real postgres + mail stub)');
});

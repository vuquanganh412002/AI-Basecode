// Screen: ACSMS-SCR-010 — メニュー画面 お知らせ
//
// Integration spec — boots the whole Nest app against pg-mem + ioredis-mock
// and exercises GET /api/v1/oshirase/menu end to end: SessionAuthGuard +
// real TypeORM queries against t_oshirase. Proves the SQL dialect bits that
// unit tests (mocked QB) can't: the COALESCE(updated_at, created_at) order,
// the comma-bracket target_kanri_kubun CSV match, and the JA DataScope.

import type { Server } from 'http';
import request from 'supertest';

import { OshiraseModule } from '@/modules/oshirase/oshirase.module';
import {
  buildSessionCookie,
  createIntegrationTestApp,
  type IntegrationTestContext,
} from '@test/utils/create-integration-app';
import { apiUrl } from '@test/utils/api-url';

describe('ACSMS-SCR-010 integration — menu oshirase endpoint', () => {
  let ctx: IntegrationTestContext;

  beforeEach(async () => {
    ctx = await createIntegrationTestApp({
      modules: [OshiraseModule],
      // All rows are in the publish window (start past, end NULL/future) and
      // status=2 unless noted. updated_at varies so order is deterministic.
      // location 2 = MENU (list), 3 = MENU_DEADLINE (type 4).
      seedSql: [
        `INSERT INTO t_oshirase
           (ja_id, oshirase_type, publish_location, status, title, content,
            publish_start_date, publish_end_date, target_kanri_kubun,
            created_at, created_by, updated_at, updated_by)
         VALUES
           -- R1 global, target all, updated 05-10
           (NULL, 1, 2, 2, 'R1-all',        '', '2026-01-01 00:00:00+09:00', NULL, '',
            '2026-01-01 00:00:00+09:00', '1', '2026-05-10 00:00:00+09:00', '1'),
           -- R2 global, target role 3 only, updated 05-12
           (NULL, 2, 2, 2, 'R2-role3',      '', '2026-01-01 00:00:00+09:00', NULL, '3',
            '2026-01-01 00:00:00+09:00', '1', '2026-05-12 00:00:00+09:00', '1'),
           -- R3 global, target roles 1,2 (excludes 3), updated 05-11
           (NULL, 3, 2, 2, 'R3-role12',     '', '2026-01-01 00:00:00+09:00', NULL, '1,2',
            '2026-01-01 00:00:00+09:00', '1', '2026-05-11 00:00:00+09:00', '1'),
           -- R4 JA=1 specific, target all, updated 05-13
           (1,    1, 2, 2, 'R4-ja1',        '', '2026-01-01 00:00:00+09:00', NULL, '',
            '2026-01-01 00:00:00+09:00', '1', '2026-05-13 00:00:00+09:00', '1'),
           -- R5 JA=2 (other tenant), target all, updated 05-14
           (2,    1, 2, 2, 'R5-ja2',        '', '2026-01-01 00:00:00+09:00', NULL, '',
            '2026-01-01 00:00:00+09:00', '1', '2026-05-14 00:00:00+09:00', '1'),
           -- R6 DRAFT (status=1) — must be excluded
           (NULL, 1, 2, 1, 'R6-draft',      '', '2026-01-01 00:00:00+09:00', NULL, '',
            '2026-01-01 00:00:00+09:00', '1', '2026-05-15 00:00:00+09:00', '1'),
           -- R7 global, target '13' (whole-token guard: role 3 must NOT match)
           (NULL, 1, 2, 2, 'R7-role13',     '', '2026-01-01 00:00:00+09:00', NULL, '13',
            '2026-01-01 00:00:00+09:00', '1', '2026-05-09 00:00:00+09:00', '1'),
           -- R8 deadline (type 4, location 3), target all, global
           (NULL, 4, 3, 2, 'R8-deadline',   '', '2026-01-01 00:00:00+09:00', NULL, '',
            '2026-01-01 00:00:00+09:00', '1', '2026-05-20 00:00:00+09:00', '1')`,
      ],
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  const http = () => request(ctx.app.getHttpServer() as Server);

  async function asChuokai() {
    const sid = await ctx.seedSession({
      account_id: 2,
      role_code: 'CHUOKAI',
      role_id: 3,
      ja_id: 1,
      kanri_shiten_id: null,
      permissions: [],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  async function asAdmin() {
    const sid = await ctx.seedSession({
      account_id: 1,
      role_code: 'NICHINO_ADMIN',
      role_id: 1,
      ja_id: null,
      kanri_shiten_id: null,
      permissions: [],
    });
    return buildSessionCookie(ctx.app, sid);
  }

  it('should return 401 when no session cookie is sent', async () => {
    await http().get(apiUrl('oshirase/menu')).expect(401);
  });

  it('should scope a CHUOKAI (role 3, ja 1) by role + JA, ordered by updated_at DESC', async () => {
    const cookie = await asChuokai();
    const res = await http()
      .get(apiUrl('oshirase/menu'))
      .set('Cookie', cookie)
      .expect(200);

    const titles = res.body.data.oshirase_list.map((n: any) => n.title);
    // Included: R4 (own JA, all), R2 (target 3), R1 (all). Order updated_at
    // DESC → R4(05-13) > R2(05-12) > R1(05-10).
    expect(titles).toEqual(['R4-ja1', 'R2-role3', 'R1-all']);
    // Excluded: R3 (target 1,2), R5 (other JA), R6 (draft),
    // R7 (target '13' — whole-token, role 3 ≠ 13).
    expect(titles).not.toContain('R3-role12');
    expect(titles).not.toContain('R5-ja2');
    expect(titles).not.toContain('R6-draft');
    expect(titles).not.toContain('R7-role13');
    // Deadline pinned separately.
    expect(res.body.data.deadline_notice).toMatchObject({
      title: 'R8-deadline',
      oshirase_type: 4,
    });
  });

  it('should scope NICHINO_ADMIN (role 1, ja null) to global notices targeting role 1', async () => {
    const cookie = await asAdmin();
    const res = await http()
      .get(apiUrl('oshirase/menu'))
      .set('Cookie', cookie)
      .expect(200);

    const titles = res.body.data.oshirase_list.map((n: any) => n.title);
    // Global + target includes 1: R3 (target 1,2) and R1 (all). Order
    // updated_at DESC → R3(05-11) > R1(05-10). R2 (target 3) excluded,
    // R7 (target '13') excluded, JA-specific R4/R5 excluded (ja_id null).
    expect(titles).toEqual(['R3-role12', 'R1-all']);
    expect(titles).not.toContain('R4-ja1');
    expect(titles).not.toContain('R5-ja2');
    expect(res.body.data.deadline_notice).toMatchObject({ title: 'R8-deadline' });
  });
});

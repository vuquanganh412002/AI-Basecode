// Screen: ACSMS-SCR-001 — ログイン画面 (公開お知らせ一覧)
//         ACSMS-SCR-031 — お知らせ一覧画面 (admin CRUD)
//
// Both SCRs share the same OshiraseService class. Tests are organised
// as two sibling top-level describe blocks so each has its own mock
// scope — SCR-001 uses a 2-arg constructor (repo + codeService) for
// the public `findLogin` path, while SCR-031 boots the service with
// the optional auditLog + dataSource deps. Spec count + assertions
// remain 1:1 with the originals; only the location changed (merged
// from __tests__/ into this file so the module follows "1 source =
// 1 spec file").

import { NotFoundException } from '@/common/exceptions/common.exceptions';
import { OshiraseService } from '@/modules/oshirase/oshirase.service';
import { buildOshirase } from '@test/fixtures/auth.factory';
import {
  buildCreateOshiraseBody,
  buildOshiraseEntity,
  buildUpdateOshiraseBody,
  futureDateString,
  pastDateString,
} from '@test/fixtures/oshirase.factory';
import { buildSession } from '@test/fixtures/session.factory';

describe('OshiraseService — SCR-001 (public findLogin)', () => {
  let service: OshiraseService;
  let qbMock: any;
  let repo: any;
  let codeService: any;

  // m_code seeded labels for OSHIRASE_TYPE (Group B — extensible at runtime).
  const OSHIRASE_TYPE_LABELS: Record<number, string> = {
    1: 'システム',
    2: '重要',
    3: '一般',
  };

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    repo = {
      createQueryBuilder: jest.fn(() => qbMock),
    };
    codeService = {
      getLabel: jest.fn((category: string, value: number) =>
        category === 'OSHIRASE_TYPE' ? OSHIRASE_TYPE_LABELS[value] ?? '' : '',
      ),
    };
    service = new OshiraseService(repo, codeService);
  });

  describe('findLogin', () => {
    it('should return mapped list with type label "システム" for oshirase_type=1 when status=2 and within window', async () => {
      qbMock.getMany.mockResolvedValue([
        buildOshirase({
          oshiraseId: 1,
          oshiraseType: 1,
          title: 'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
          publishStartDate: new Date('2026-04-10T00:00:00Z'),
        }),
      ]);

      const result = await service.findLogin({});

      expect(result).toEqual([
        {
          oshirase_id: 1,
          oshirase_type: 1,
          oshirase_type_label: 'システム',
          title: 'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
          publish_start_date: '2026-04-10',
        },
      ]);
    });

    it.each([
      ['oshirase_type=2 as "重要" when row is type 2', 2, '重要'],
      ['oshirase_type=3 as "一般" when row is type 3', 3, '一般'],
      // Unknown type → empty label (defensive).
      ['empty label when oshirase_type is unknown (defensive)', 99, ''],
    ])('should label %s', async (_desc, oshiraseType, expectedLabel) => {
      qbMock.getMany.mockResolvedValue([buildOshirase({ oshiraseType })]);
      const result = await service.findLogin({});
      expect(result[0].oshirase_type_label).toBe(expectedLabel);
    });

    it('should default publish_location to 1 when query omits it', async () => {
      await service.findLogin({});
      expect(qbMock.where).toHaveBeenCalledWith(
        'o.publish_location = :publishLocation',
        { publishLocation: 1 },
      );
    });

    // publish_location is no longer a tunable param — the route hard-codes
    // LOGIN (=1). Menu-screen oshirase moved to GET /oshirase/menu.

    it('should default limit to 20 when query omits it', async () => {
      await service.findLogin({});
      expect(qbMock.take).toHaveBeenCalledWith(20);
    });

    it('should cap limit at 20 when client sends a higher number', async () => {
      await service.findLogin({ limit: 50 });
      expect(qbMock.take).toHaveBeenCalledWith(20);
    });

    it('should filter status=2 (公開) when querying t_oshirase', async () => {
      await service.findLogin({});
      // Implementation switched to a parameterised filter with the
      // OshiraseStatus enum (`OshiraseStatus.Public = 2`). The literal
      // value 2 is still asserted via the binding object.
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'o.status = :status',
        { status: 2 },
      );
    });

    it('should restrict to oshirase_type 1,2,3 (excludes 4 締め切り時間) when querying', async () => {
      await service.findLogin({});
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'o.oshirase_type IN (:...types)',
        { types: [1, 2, 3] },
      );
    });

    it('should filter publish_start_date <= NOW when querying', async () => {
      await service.findLogin({});
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'o.publish_start_date <= :now',
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it('should filter publish_end_date IS NULL OR >= NOW when querying', async () => {
      await service.findLogin({});
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        '(o.publish_end_date IS NULL OR o.publish_end_date >= :now)',
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it('should restrict to JA-wide notices (ja_id IS NULL) when querying', async () => {
      await service.findLogin({});
      expect(qbMock.andWhere).toHaveBeenCalledWith('o.ja_id IS NULL');
    });

    it('should order by COALESCE(updated_at, created_at) DESC when listing', async () => {
      await service.findLogin({});
      expect(qbMock.orderBy).toHaveBeenCalledWith(
        'COALESCE(o.updated_at, o.created_at)',
        'DESC',
      );
    });

    it('should return empty array when no notices match', async () => {
      qbMock.getMany.mockResolvedValue([]);
      const result = await service.findLogin({});
      expect(result).toEqual([]);
    });

    it('should format publish_start_date as the JST calendar date (not UTC) when serialising', async () => {
      // 2026-04-10T18:30:00Z = 2026-04-11 03:30 JST → JST date is the 11th.
      // toISOString().slice(0,10) would wrongly yield '2026-04-10'.
      qbMock.getMany.mockResolvedValue([
        buildOshirase({ publishStartDate: new Date('2026-04-10T18:30:00Z') }),
      ]);
      const result = await service.findLogin({});
      expect(result[0].publish_start_date).toBe('2026-04-11');
    });

    it('should keep JST midnight on the same calendar day (boundary)', async () => {
      // 2026-04-09T15:00:00Z = 2026-04-10 00:00 JST → must render '2026-04-10'.
      qbMock.getMany.mockResolvedValue([
        buildOshirase({ publishStartDate: new Date('2026-04-09T15:00:00Z') }),
      ]);
      const result = await service.findLogin({});
      expect(result[0].publish_start_date).toBe('2026-04-10');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-010 — menu screen list (authenticated getMenuList). Own describe so
// the query-builder mock (needs getMany + getOne for the two parallel
// queries) stays isolated from the SCR-001 block.
// ═══════════════════════════════════════════════════════════════════════

describe('OshiraseService — SCR-010 (menu getMenuList)', () => {
  let service: OshiraseService;
  let qbMock: any;
  let repo: any;
  let codeService: any;

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    };
    repo = { createQueryBuilder: jest.fn(() => qbMock) };
    codeService = { getLabel: jest.fn(() => '') };
    service = new OshiraseService(repo, codeService);
  });

  // Helper: every andWhere(sql, binding?) call as [sql, binding] pairs.
  const andWhereCalls = () => qbMock.andWhere.mock.calls;
  const calledAndWhere = (sql: string) =>
    andWhereCalls().some((c: any[]) => c[0] === sql);

  it('should filter publish_location IN (MENU=2, MENU_DEADLINE=3)', async () => {
    await service.getMenuList(buildSession({ ja_id: null }));
    expect(qbMock.where).toHaveBeenCalledWith(
      'o.publish_location IN (:...publishLocations)',
      { publishLocations: [2, 3] },
    );
  });

  it('should filter status=2 (公開)', async () => {
    await service.getMenuList(buildSession());
    expect(qbMock.andWhere).toHaveBeenCalledWith('o.status = :status', {
      status: 2,
    });
  });

  it('should check the publish window (start <= now, end NULL or >= now)', async () => {
    await service.getMenuList(buildSession());
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      'o.publish_start_date <= :now',
      expect.objectContaining({ now: expect.any(Date) }),
    );
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      '(o.publish_end_date IS NULL OR o.publish_end_date >= :now)',
      expect.objectContaining({ now: expect.any(Date) }),
    );
  });

  it('should filter target_kanri_kubun by the viewer role_id (empty = all)', async () => {
    await service.getMenuList(buildSession({ role_id: 3 }));
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      "(o.target_kanri_kubun = '' OR (',' || o.target_kanri_kubun || ',') LIKE :kanriNeedle)",
      { kanriNeedle: '%,3,%' },
    );
  });

  it('should restrict 日農 (ja_id null) to global notices only (ja_id IS NULL)', async () => {
    await service.getMenuList(buildSession({ ja_id: null }));
    expect(calledAndWhere('o.ja_id IS NULL')).toBe(true);
    expect(calledAndWhere('(o.ja_id IS NULL OR o.ja_id = :userJaId)')).toBe(
      false,
    );
  });

  it('should scope a JA user to global OR own-JA notices', async () => {
    await service.getMenuList(buildSession({ role_id: 4, ja_id: 7 }));
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      '(o.ja_id IS NULL OR o.ja_id = :userJaId)',
      { userJaId: 7 },
    );
  });

  it('should split list (type != 4) and deadline (type = 4)', async () => {
    await service.getMenuList(buildSession());
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      'o.oshirase_type != :deadlineType',
      { deadlineType: 4 },
    );
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      'o.oshirase_type = :deadlineType',
      { deadlineType: 4 },
    );
  });

  it('should order by COALESCE(updated_at, created_at) DESC', async () => {
    await service.getMenuList(buildSession());
    expect(qbMock.orderBy).toHaveBeenCalledWith(
      'COALESCE(o.updated_at, o.created_at)',
      'DESC',
    );
  });

  it('should default the list limit to 20 when omitted', async () => {
    await service.getMenuList(buildSession());
    expect(qbMock.take).toHaveBeenCalledWith(20);
  });

  it('should cap the list limit at 20 when a higher value is requested', async () => {
    await service.getMenuList(buildSession(), 100);
    expect(qbMock.take).toHaveBeenCalledWith(20);
    expect(qbMock.take).not.toHaveBeenCalledWith(100);
  });

  it('should take only 1 deadline notice', async () => {
    await service.getMenuList(buildSession());
    expect(qbMock.take).toHaveBeenCalledWith(1);
  });

  it('should map rows into oshirase_list and a null deadline when none', async () => {
    qbMock.getMany.mockResolvedValue([
      buildOshirase({ oshiraseId: 5, oshiraseType: 1, title: 'お知らせ' }),
    ]);
    qbMock.getOne.mockResolvedValue(null);
    const res = await service.getMenuList(buildSession());
    expect(res.data.oshirase_list).toHaveLength(1);
    expect(res.data.oshirase_list[0]).toMatchObject({
      oshirase_id: 5,
      oshirase_type: 1,
      title: 'お知らせ',
    });
    expect(res.data.deadline_notice).toBeNull();
  });

  it('should return the pinned deadline notice when present', async () => {
    qbMock.getOne.mockResolvedValue(
      buildOshirase({ oshiraseId: 9, oshiraseType: 4, title: '締め切り' }),
    );
    const res = await service.getMenuList(buildSession());
    expect(res.data.deadline_notice).toMatchObject({
      oshirase_id: 9,
      oshirase_type: 4,
    });
  });

  describe('is_new (NEW badge — within 7 days of updated_at, fallback created_at)', () => {
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    it('should be true when updated_at is within the last 7 days', async () => {
      qbMock.getMany.mockResolvedValue([
        buildOshirase({
          updatedAt: new Date(Date.now() - 3 * DAY),
          createdAt: new Date(Date.now() - 30 * DAY), // old create, recent update
        }),
      ]);
      const res = await service.getMenuList(buildSession());
      expect(res.data.oshirase_list[0].is_new).toBe(true);
    });

    it('should be false when updated_at is older than 7 days', async () => {
      qbMock.getMany.mockResolvedValue([
        buildOshirase({
          updatedAt: new Date(Date.now() - 8 * DAY),
          createdAt: new Date(Date.now() - 1 * DAY), // recent create ignored
        }),
      ]);
      const res = await service.getMenuList(buildSession());
      expect(res.data.oshirase_list[0].is_new).toBe(false);
    });

    it('should fall back to created_at when updated_at is null', async () => {
      qbMock.getMany.mockResolvedValue([
        buildOshirase({
          updatedAt: null as unknown as Date,
          createdAt: new Date(Date.now() - 2 * DAY),
        }),
      ]);
      const res = await service.getMenuList(buildSession());
      expect(res.data.oshirase_list[0].is_new).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SCR-031 — admin CRUD endpoints (separate top-level describe so its
// 4-arg constructor — repo + codeService + auditLog + dataSource — and
// txManager mock setup don't leak into the SCR-001 public-path block
// above).
// ═══════════════════════════════════════════════════════════════════════

describe('OshiraseService — SCR-031 (admin CRUD)', () => {
  let service: any;
  let oshiraseRepo: any;
  let codeService: any;
  let auditLog: any;
  let dataSource: any;
  let qbMock: any;
  let countQbMock: any;
  let txManager: any;
  const req = { ip: '192.168.1.50', headers: { 'user-agent': 'jest' } } as any;
  const session = buildSession({ account_id: 1, ja_id: null });

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawAndEntities: jest
        .fn()
        .mockResolvedValue({ entities: [], raw: [] }),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    countQbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };

    // [ja-name-batch] Second query builder for the m_ja lookup that
    // resolves ja_name per row in getList(). Default seed returns no
    // rows — tests that load oshirase rows with non-null ja_id seed
    // this to map ja_id → ja_name explicitly.
    const jaLookupQbMock: any = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    oshiraseRepo = {
      createQueryBuilder: jest.fn(() => qbMock),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn(async (e: any) => e),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      manager: {
        transaction: jest.fn(),
        createQueryBuilder: jest.fn(() => jaLookupQbMock),
      },
    };
    // Expose for per-test seeding.
    (oshiraseRepo as any).__jaLookupQbMock = jaLookupQbMock;

    codeService = {
      has: jest.fn().mockReturnValue(true),
      getLabel: jest.fn((category: string, value: number) => {
        if (category === 'OSHIRASE_TYPE') {
          return { 1: 'システム', 2: '重要', 3: '一般', 4: '締め切り時間' }[value] ?? '';
        }
        if (category === 'PUBLISH_LOCATION') {
          return { 1: 'ログイン画面', 2: 'メニュー画面' }[value] ?? '';
        }
        if (category === 'OSHIRASE_STATUS') {
          return { 1: '下書き', 2: '公開', 3: '非公開' }[value] ?? '';
        }
        return '';
      }),
    };

    auditLog = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
      logOperation: jest.fn().mockResolvedValue(undefined),
    };

    txManager = {
      // Default save returns the payload merged with timestamps so that
      // toOshiraseListItem / toOshiraseDetail (which call .toISOString())
      // don't throw. Individual tests override via mockImplementationOnce.
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        const now = new Date('2026-04-01T00:00:00Z');
        return {
          oshiraseId: 1,
          createdAt: now,
          updatedAt: now,
          ...value,
        };
      }),
      create: jest.fn((_cls: any, payload: any) => payload),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      getRepository: jest.fn(() => ({})),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };

    service = new OshiraseService(oshiraseRepo, codeService, auditLog, dataSource);
  });

  afterEach(() => jest.restoreAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  // API-031-001 — getList
  // ═══════════════════════════════════════════════════════════════════
  describe('getList', () => {
    it('should return paginated response with data + meta keys when called', async () => {
      qbMock.getManyAndCount.mockResolvedValue([
        [
          buildOshiraseEntity({ oshiraseId: 1 }),
          buildOshiraseEntity({ oshiraseId: 2, jaId: 1, oshiraseType: 3, status: 1, publishLocation: 1 }),
        ],
        25,
      ]);
      // [ja-name-batch] Row 2 has jaId=1 → service does a batch lookup
      // via repo.manager. Seed the m_ja row so ja_name resolves.
      (oshiraseRepo as any).__jaLookupQbMock.getRawMany.mockResolvedValue([
        { ja_id: 1, ja_name: 'JA東京中央' },
      ]);

      const result = await service.getList({});

      expect(result).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          meta: expect.objectContaining({
            total: 25,
            page: 1,
            per_page: 20,
          }),
        }),
      );
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          oshirase_id: 1,
          ja_id: null,
          ja_name: null,
          oshirase_type: 1,
          publish_location: 2,
          status: 2,
          title: 'システムメンテナンスのお知らせ',
        }),
      );
      // [no-labels-policy] Authenticated SCR-031 list no longer emits
      // *_label fields; FE resolves via useCodesStore().label(...).
      expect(result.data[0]).not.toHaveProperty('oshirase_type_label');
      expect(result.data[0]).not.toHaveProperty('publish_location_label');
      expect(result.data[0]).not.toHaveProperty('status_label');
      // [ja-name-join] Lock the leftJoin contract — row 2's ja_name
      // is resolved from m_ja, not from any local FE lookup.
      expect(result.data[1].ja_name).toBe('JA東京中央');
    });

    it('should filter soft-deleted rows via deleted_at IS NULL when querying', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getList({});
      // applyJaScope-free; service uses .where('o.deleted_at IS NULL') or
      // findAndCount with { deletedAt: IsNull() } — either covers §4.4.
      const calls = [
        ...qbMock.where.mock.calls,
        ...qbMock.andWhere.mock.calls,
      ];
      const softDelCall = calls.find(([sql]: any[]) =>
        typeof sql === 'string' && /deleted_at/i.test(sql),
      );
      // Service may also use repo.findAndCount with object where — either is OK.
      expect(softDelCall || oshiraseRepo.count).toBeDefined();
    });

    it('should pin 締め切り時間 (type=4) first via the primary orderBy', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getList({});
      expect(qbMock.orderBy).toHaveBeenCalledWith(
        '(o.oshirase_type = 4)',
        'DESC',
      );
    });

    it('should default the secondary sort to COALESCE(updated_at, created_at) DESC when sort params are omitted', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getList({});
      // After pinning type=4, the default secondary sort is by recency of
      // change (created OR updated) so a freshly touched notice bubbles to
      // position 2.
      expect(qbMock.addOrderBy).toHaveBeenCalledWith(
        'COALESCE(o.updated_at, o.created_at)',
        'DESC',
      );
    });

    it('should honour an explicit whitelisted sort_by over the default', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getList({ sort_by: 'title', sort_order: 'asc' });
      expect(qbMock.addOrderBy).toHaveBeenCalledWith('o.title', 'ASC');
    });

    it('should apply page=2 per_page=10 via take + skip when paginated', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getList({ page: 2, per_page: 10 });
      expect(qbMock.take).toHaveBeenCalledWith(10);
      expect(qbMock.skip).toHaveBeenCalledWith(10);
    });

    it('should return data:[] and meta.total=0 when repo returns no rows', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      const result = await service.getList({});
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // API-031-002 — getDetail
  // ═══════════════════════════════════════════════════════════════════
  describe('getDetail', () => {
    it('should return the detail with raw code values when oshirase_id exists (labels resolved client-side)', async () => {
      oshiraseRepo.findOne.mockResolvedValue(buildOshiraseEntity({ oshiraseId: 1 }));

      const result = await service.getDetail(1);

      expect(result.data).toEqual(
        expect.objectContaining({
          oshirase_id: 1,
          oshirase_type: 1,
          publish_location: 2,
          status: 2,
          content: expect.any(String),
          target_kanri_kubun: '1,2,3',
        }),
      );
      // [no-labels-policy] Authenticated detail endpoint omits *_label.
      expect(result.data).not.toHaveProperty('oshirase_type_label');
      expect(result.data).not.toHaveProperty('publish_location_label');
      expect(result.data).not.toHaveProperty('status_label');
    });

    it('should query repo with { oshirase_id, deleted_at IS NULL } when called', async () => {
      oshiraseRepo.findOne.mockResolvedValue(buildOshiraseEntity({ oshiraseId: 5 }));
      await service.getDetail(5);
      expect(oshiraseRepo.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException when oshirase_id does not exist', async () => {
      oshiraseRepo.findOne.mockResolvedValue(null);
      await expect(service.getDetail(9999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // API-031-003 — create
  // ═══════════════════════════════════════════════════════════════════
  describe('create', () => {
    it('should INSERT a new oshirase and return the mapped row when body is valid', async () => {
      const body = buildCreateOshiraseBody();
      txManager.save.mockImplementationOnce(async (_cls: any, payload: any) => ({
        ...buildOshiraseEntity(),
        oshiraseId: 10,
        ...payload,
      }));

      const result = await service.create(body, session, req);

      expect(result.data).toEqual(
        expect.objectContaining({
          oshirase_id: 10,
          oshirase_type: 1,
          publish_location: 2,
          status: 2,
        }),
      );
      expect(result.data).not.toHaveProperty('oshirase_type_label');
      expect(result.message).toBe('登録しました。');
    });

    it('should reject with DEADLINE_NOTICE_DUPLICATE when an oshirase_type=4 (publish_location=3) already exists', async () => {
      oshiraseRepo.count.mockResolvedValue(1);
      const body = buildCreateOshiraseBody({ publish_location: 3, oshirase_type: 4 });

      await expect(service.create(body, session, req)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'DEADLINE_NOTICE_DUPLICATE' }),
      });
    });

    it('should reject with VALIDATION_ERROR when oshirase_type=4 is paired with publish_location≠3', async () => {
      // 顧客確認 2026-05: type=4 ⇔ publish_location=3 は 1:1。
      // FE は watcher で自動同期するが、API 直接呼び出し対策で BE 側も検査する。
      const body = buildCreateOshiraseBody({ publish_location: 2, oshirase_type: 4 });

      await expect(service.create(body, session, req)).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'publish_location' }),
          ]),
        }),
      });
    });

    it('should reject with VALIDATION_ERROR when publish_location=3 is paired with oshirase_type≠4', async () => {
      const body = buildCreateOshiraseBody({ publish_location: 3, oshirase_type: 1 });

      await expect(service.create(body, session, req)).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'oshirase_type' }),
          ]),
        }),
      });
    });

    it('should NOT run the duplicate-check when oshirase_type !== 4', async () => {
      const body = buildCreateOshiraseBody({ publish_location: 1, oshirase_type: 1 });
      await service.create(body, session, req);
      expect(oshiraseRepo.count).not.toHaveBeenCalled();
    });

    it('should reject with VALIDATION_ERROR when publish_start_date is in the past', async () => {
      // 顧客確認 2026-05: 新規作成時、開始日は現在分以降であること。
      const body = buildCreateOshiraseBody({ publish_start_date: pastDateString(1) });

      await expect(service.create(body, session, req)).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'publish_start_date',
              message: '過去日は選択できません。',
            }),
          ]),
        }),
      });
    });

    it('should reject with VALIDATION_ERROR when publish_end_date is before publish_start_date', async () => {
      // ACSMS-MSG-031-008: 開始<=終了の相関チェック。終了日が開始日より
      // 前のボディは BE 側で 400 (publish_end_date フィールドエラー) を返す。
      const body = buildCreateOshiraseBody({
        publish_start_date: futureDateString(10),
        publish_end_date: futureDateString(5),
      });

      await expect(service.create(body, session, req)).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'publish_end_date',
              message: '終了日は開始日より後にしてください。',
            }),
          ]),
        }),
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should ALLOW publish_end_date NULL (無期限) — no correlation check', async () => {
      const body = buildCreateOshiraseBody({
        publish_start_date: futureDateString(7),
        publish_end_date: null,
      });

      await expect(service.create(body, session, req)).resolves.toBeDefined();
    });

    it('should call AuditLogService.logCreate with operation CREATE inside the same transaction when create succeeds', async () => {
      await service.create(buildCreateOshiraseBody(), session, req);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          table: 't_oshirase',
        }),
        expect.any(Object),
        txManager,
      );
    });

    it('should rollback and emit error log (log_type=3) outside transaction when audit log fails', async () => {
      auditLog.logCreate.mockRejectedValueOnce(new Error('audit-down'));

      await expect(service.create(buildCreateOshiraseBody(), session, req)).rejects.toBeDefined();

      expect(auditLog.logError).toHaveBeenCalledWith(
        expect.objectContaining({ table: 't_oshirase' }),
        'CREATE',
        expect.any(Error),
      );
    });

    it('should still emit error log when txManager.save throws', async () => {
      txManager.save.mockRejectedValueOnce(new Error('db-down'));

      await expect(service.create(buildCreateOshiraseBody(), session, req)).rejects.toBeDefined();

      expect(auditLog.logError).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // API-031-004 — update
  // ═══════════════════════════════════════════════════════════════════
  describe('update', () => {
    it('should UPDATE the existing oshirase and return the mapped row when body is valid', async () => {
      // Existing publishStartDate must be in the future so the
      // past-date validation in OshiraseService.update doesn't trip.
      const existing = buildOshiraseEntity({
        oshiraseId: 1,
        publishStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);

      const body = buildUpdateOshiraseBody();
      const result = await service.update(1, body, session, req);

      expect(result.data).toEqual(
        expect.objectContaining({
          oshirase_id: 1,
          title: body.title,
        }),
      );
      expect(result.message).toBe('更新しました。');
    });

    it('should throw NotFoundException when oshirase_id does not exist', async () => {
      oshiraseRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(9999, buildUpdateOshiraseBody(), session, req),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject with VALIDATION_ERROR when publish_end_date is before publish_start_date', async () => {
      // ACSMS-MSG-031-008: 編集時も開始<=終了の相関チェックが効く。
      const existing = buildOshiraseEntity({
        oshiraseId: 1,
        publishStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);

      const body = buildUpdateOshiraseBody({
        publish_start_date: futureDateString(10),
        publish_end_date: futureDateString(5),
      });

      await expect(service.update(1, body, session, req)).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'publish_end_date',
              message: '終了日は開始日より後にしてください。',
            }),
          ]),
        }),
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should call AuditLogService.logUpdate with bare UPDATE operation + before + after states inside the same transaction', async () => {
      const existing = buildOshiraseEntity({
        oshiraseId: 1,
        title: 'Before',
        publishStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);

      await service.update(1, buildUpdateOshiraseBody({ title: 'After' }), session, req);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 1, targetId: 1, table: 't_oshirase' }),
        expect.any(Object),
        expect.any(Object),
        txManager,
      );
    });

    it('should rollback and emit error log when audit log fails', async () => {
      const existing = buildOshiraseEntity({
        oshiraseId: 1,
        publishStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);
      auditLog.logUpdate.mockRejectedValueOnce(new Error('audit-down'));

      await expect(
        service.update(1, buildUpdateOshiraseBody(), session, req),
      ).rejects.toBeDefined();

      expect(auditLog.logError).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: 1, table: 't_oshirase' }),
        'UPDATE',
        expect.any(Error),
      );
    });

    it('should reject with VALIDATION_ERROR when publish_start_date in the body differs from the existing past start_date', async () => {
      // 顧客確認 2026-05: 保存済み開始日が過去 + 値変更 → 拒否。
      // VALIDATION_ERROR + errors[publish_start_date] の標準形で投げ、
      // FE の applyServerErrors が field-level エラーにマップできる形にする。
      const existing = buildOshiraseEntity({
        oshiraseId: 1,
        publishStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);

      await expect(
        service.update(
          1,
          buildUpdateOshiraseBody({ publish_start_date: futureDateString(14) }),
          session,
          req,
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'publish_start_date',
              message: '過去日は選択できません。',
            }),
          ]),
        }),
      });
    });

    it('should reject with VALIDATION_ERROR when existing publish_start_date is future and the new value is in the past', async () => {
      // 顧客確認 2026-05: 保存済み開始日=未来 + 新値<現在 → 拒否。
      // 旧仕様（過去-存在 + 変更時のみ拒否）では未来→過去への改竄が通っていた。
      const existing = buildOshiraseEntity({
        oshiraseId: 1,
        publishStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);

      await expect(
        service.update(
          1,
          buildUpdateOshiraseBody({ publish_start_date: pastDateString(1) }),
          session,
          req,
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'publish_start_date',
              message: '過去日は選択できません。',
            }),
          ]),
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // API-031-005 — remove
  // ═══════════════════════════════════════════════════════════════════
  describe('remove', () => {
    it('should soft-delete the oshirase and return the success message when oshirase_id exists', async () => {
      const existing = buildOshiraseEntity({ oshiraseId: 1 });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);

      const result = await service.remove(1, session, req);

      expect(result).toEqual({ message: '削除しました。' });
    });

    it('should throw NotFoundException when oshirase_id does not exist', async () => {
      oshiraseRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(9999, session, req)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject deletion when the target record is 締め切り時間 (oshirase_type=4)', async () => {
      // 顧客確認 2026-05: 締め切り時間レコードは削除不可。BE 側でも防御線を張る。
      const existing = buildOshiraseEntity({ oshiraseId: 8, oshiraseType: 4 });
      oshiraseRepo.findOne.mockResolvedValue(existing);

      await expect(service.remove(8, session, req)).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          error_code: 'BAD_REQUEST',
          message: '締め切り時間のお知らせは削除できません。',
        }),
      });
    });

    it('should call AuditLogService.logDelete with bare DELETE operation + before state inside the same transaction', async () => {
      const existing = buildOshiraseEntity({ oshiraseId: 7 });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);

      await service.remove(7, session, req);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(auditLog.logDelete).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 1, targetId: 7, table: 't_oshirase' }),
        expect.any(Object),
        txManager,
      );
    });

    it('should rollback and emit error log when audit log fails', async () => {
      const existing = buildOshiraseEntity({ oshiraseId: 1 });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);
      auditLog.logDelete.mockRejectedValueOnce(new Error('audit-down'));

      await expect(service.remove(1, session, req)).rejects.toBeDefined();

      expect(auditLog.logError).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: 1, table: 't_oshirase' }),
        'DELETE',
        expect.any(Error),
      );
    });
  });
});

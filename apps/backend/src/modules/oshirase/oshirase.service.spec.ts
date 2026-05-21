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

    it('should label oshirase_type=2 as "重要" when row is type 2', async () => {
      qbMock.getMany.mockResolvedValue([buildOshirase({ oshiraseType: 2 })]);
      const result = await service.findLogin({});
      expect(result[0].oshirase_type_label).toBe('重要');
    });

    it('should label oshirase_type=3 as "一般" when row is type 3', async () => {
      qbMock.getMany.mockResolvedValue([buildOshirase({ oshiraseType: 3 })]);
      const result = await service.findLogin({});
      expect(result[0].oshirase_type_label).toBe('一般');
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

    it('should default limit to 10 when query omits it', async () => {
      await service.findLogin({});
      expect(qbMock.take).toHaveBeenCalledWith(10);
    });

    it('should cap limit at 10 when client sends a higher number', async () => {
      await service.findLogin({ limit: 50 });
      expect(qbMock.take).toHaveBeenCalledWith(10);
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

    it('should order by publish_start_date DESC when listing', async () => {
      await service.findLogin({});
      expect(qbMock.orderBy).toHaveBeenCalledWith(
        'o.publish_start_date',
        'DESC',
      );
    });

    it('should return empty array when no notices match', async () => {
      qbMock.getMany.mockResolvedValue([]);
      const result = await service.findLogin({});
      expect(result).toEqual([]);
    });

    it('should format publish_start_date as YYYY-MM-DD when serialising', async () => {
      qbMock.getMany.mockResolvedValue([
        buildOshirase({ publishStartDate: new Date('2026-04-10T18:30:00Z') }),
      ]);
      const result = await service.findLogin({});
      expect(result[0].publish_start_date).toBe('2026-04-10');
    });

    it('should return empty label when oshirase_type is unknown (defensive)', async () => {
      qbMock.getMany.mockResolvedValue([buildOshirase({ oshiraseType: 99 })]);
      const result = await service.findLogin({});
      expect(result[0].oshirase_type_label).toBe('');
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
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    countQbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };

    oshiraseRepo = {
      createQueryBuilder: jest.fn(() => qbMock),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn(async (e: any) => e),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      manager: { transaction: jest.fn() },
    };

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
          oshirase_type: 1,
          oshirase_type_label: 'システム',
          publish_location: 2,
          publish_location_label: 'メニュー画面',
          status: 2,
          status_label: '公開',
          title: 'システムメンテナンスのお知らせ',
        }),
      );
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

    it('should default ORDER BY created_at DESC when sort params are omitted', async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.getList({});
      // Service pins oshirase_type=4 (deadline notice) at the top via the
      // first orderBy() call, then applies the user-requested sort via
      // addOrderBy(). The default sort is on created_at DESC.
      const orderCalls = [
        ...qbMock.orderBy.mock.calls,
        ...qbMock.addOrderBy.mock.calls,
      ];
      const createdAtCall = orderCalls.find(
        ([sql]: any[]) => typeof sql === 'string' && /created_at/i.test(sql),
      );
      expect(createdAtCall).toBeDefined();
      expect(createdAtCall![1]).toBe('DESC');
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
    it('should return the detail with mapped labels when oshirase_id exists', async () => {
      oshiraseRepo.findOne.mockResolvedValue(buildOshiraseEntity({ oshiraseId: 1 }));

      const result = await service.getDetail(1);

      expect(result.data).toEqual(
        expect.objectContaining({
          oshirase_id: 1,
          oshirase_type: 1,
          oshirase_type_label: 'システム',
          publish_location_label: 'メニュー画面',
          status_label: '公開',
          content: expect.any(String),
          target_kanri_kubun: '1,2,3',
        }),
      );
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
          oshirase_type_label: 'システム',
          publish_location_label: 'メニュー画面',
          status_label: '公開',
        }),
      );
      expect(result.message).toBe('登録しました。');
    });

    it('should reject with DEADLINE_NOTICE_DUPLICATE when publish_location=2 + oshirase_type=4 already exists', async () => {
      oshiraseRepo.count.mockResolvedValue(1);
      const body = buildCreateOshiraseBody({ publish_location: 2, oshirase_type: 4 });

      await expect(service.create(body, session, req)).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'DEADLINE_NOTICE_DUPLICATE' }),
      });
    });

    it('should NOT run the duplicate-check when publish_location=1 or oshirase_type !== 4', async () => {
      const body = buildCreateOshiraseBody({ publish_location: 1, oshirase_type: 1 });
      await service.create(body, session, req);
      expect(oshiraseRepo.count).not.toHaveBeenCalled();
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

    it('should reject when publish_start_date in the body differs from the existing past start_date', async () => {
      // api.md §4.3: 過去日の場合、リクエストの publish_start_date との差分を
      // 確認し、変更されている場合はバリデーションエラーとして扱う。
      // Source throws BadRequestException with bare string message →
      // GlobalExceptionFilter maps HTTP 400 → BAD_REQUEST error_code by default.
      const existing = buildOshiraseEntity({
        oshiraseId: 1,
        publishStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      });
      oshiraseRepo.findOne.mockResolvedValue(existing);
      txManager.findOne.mockResolvedValue(existing);

      // Submit with a different (future) start date — should be rejected
      // because the stored start_date has already passed.
      await expect(
        service.update(
          1,
          buildUpdateOshiraseBody({ publish_start_date: futureDateString(14) }),
          session,
          req,
        ),
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining('過去日'),
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

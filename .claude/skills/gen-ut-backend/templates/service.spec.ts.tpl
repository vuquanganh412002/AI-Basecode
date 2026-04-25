// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: __SCREEN_ID__ — __SCREEN__
//
// Placeholders:
//   __MODULE__  = module name (e.g. "tanka")
//   __ENTITY__  = entity class name (e.g. "Tanka")
//   __SERVICE__ = service class name (e.g. "TankaService")
//
// This spec drives `src/modules/__MODULE__/__MODULE__.service.ts`.
// Every `it()` below maps back to a clause in
// `docs/design/__SCREEN_ID__/__SCREEN_ID__-api.md`.

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { __SERVICE__ } from '../../src/modules/__MODULE__/__MODULE__.service';
import { __ENTITY__ } from '../../src/modules/__MODULE__/entities/__MODULE__.entity';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { build__ENTITY__ } from '../../test/fixtures/__MODULE__.factory';
import { buildSession } from '../../test/fixtures/session.factory';

describe('__SERVICE__', () => {
  let service: __SERVICE__;
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let auditLog: { logOperation: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repo = {
      findOne: vi.fn(),
      find: vi.fn(),
      findAndCount: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      })),
    };
    auditLog = { logOperation: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        __SERVICE__,
        { provide: getRepositoryToken(__ENTITY__), useValue: repo },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get(__SERVICE__);
  });

  // ─── One describe block per API endpoint (mapped from api.md §§) ────────
  //
  // describe('findAll', () => {
  //   it('should return paginated list when called by NICHINO_ADMIN', async () => {
  //     // COVERS: 4.3 データ取得条件の設定, 4.4 データ件数の取得, 4.5 データ取得
  //     const rows = [buildTanka(), buildTanka()];
  //     repo.findAndCount.mockResolvedValue([rows, 2]);
  //     const session = buildSession({ role_code: 'NICHINO_ADMIN' });
  //     const result = await service.findAll({ page: 1, per_page: 20 }, session);
  //     expect(result.data).toHaveLength(2);
  //     expect(result.meta.total).toBe(2);
  //   });
  //
  //   it('should filter by ja_id when called by JA_HONTEN', async () => {
  //     // COVERS: DataScope rule
  //   });
  //
  //   it('should throw DataScopeViolationException when accessing other JA record', async () => {
  //     // COVERS: err:DATA_SCOPE_VIOLATION
  //   });
  // });
});

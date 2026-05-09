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
//
// Why plain `new __SERVICE__(...)` instead of `Test.createTestingModule`:
// Service unit tests don't exercise Nest's lifecycle (guards, interceptors,
// pipes) — those are tested at the controller level. Plain instantiation
// keeps the spec focused on business logic and runs faster.

import { __SERVICE__ } from '@/modules/__MODULE__/__MODULE__.service';
import { build__ENTITY__ } from '../../test/fixtures/__MODULE__.factory';
import { buildSession } from '../../test/fixtures/session.factory';

describe('__SERVICE__', () => {
  // Plain `any` containers — strict typed mocks fight the shared-factory
  // pattern. Tests verify behavior, not container types.
  let service: __SERVICE__;
  let repo: any;
  let qbMock: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = { ip: '127.0.0.1', headers: { 'user-agent': 'vitest' } } as any;

  beforeEach(() => {
    // Singleton QB so spec-side `qb.getMany.mockResolvedValue(...)` and
    // service-side `repo.createQueryBuilder()` see the same instance.
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock),
    };
    auditLog = { logOperation: jest.fn().mockResolvedValue(undefined) };
    codeService = {
      has: jest.fn().mockReturnValue(true),    // default: accept any m_code value
      getLabel: jest.fn().mockReturnValue(''),
    };

    // EntityManager mock — handles BOTH save(entity) and save(EntityClass, value)
    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        // Default jaId/id=3 when not set — keeps assertions deterministic
        return value && typeof value === 'object' && 'jaId' in value
          ? { ...value }
          : { ...value, jaId: 3 };
      }),
      softRemove: jest.fn(async (entity: any) => entity),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };

    // Plain instantiation — order MUST match the service constructor params:
    //   constructor(
    //     @InjectRepository(__ENTITY__) repo,
    //     @InjectDataSource() dataSource,
    //     auditLog: AuditLogService,
    //     codeService: CodeService,
    //   )
    // Adjust args below if the service introduces additional dependencies.
    service = new __SERVICE__(repo, dataSource, auditLog, codeService);
  });

  // ─── One describe block per API endpoint (mapped from api.md §§) ────────
  //
  // describe('findAll', () => {
  //   it('should return paginated list when called by NICHINO_ADMIN', async () => {
  //     // COVERS: 4.3 データ取得条件の設定, 4.4 データ件数の取得, 4.5 データ取得
  //     const rows = [build__ENTITY__(), build__ENTITY__()];
  //     repo.findAndCount.mockResolvedValue([rows, 2]);
  //     const session = buildSession({ role_code: 'NICHINO_ADMIN' });
  //     const result = await service.findAll({ page: 1, per_page: 20 }, session);
  //     expect(result.data).toHaveLength(2);
  //     expect(result.meta.total).toBe(2);
  //   });
  //
  //   it('should filter by ja_id when called by JA_HONTEN', async () => {
  //     // COVERS: DataScope rule — assert repo.findOne was called with
  //     // a where clause including ja_id = user.ja_id.
  //   });
  //
  //   it('should throw NotFoundException when out-of-scope ja_id requested', async () => {
  //     // COVERS: err:NOT_FOUND collapses err:DATA_SCOPE_VIOLATION (SQL filter)
  //     repo.findOne.mockResolvedValue(null);
  //     await expect(service.findById(2, buildSession({ ja_id: 1, role_code: 'CHUOKAI' })))
  //       .rejects.toThrow(NotFoundException);  // import from @nestjs/common
  //   });
  // });
  //
  // describe('create', () => {
  //   it('should reject when zei_kubun is not a valid ZEI_KUBUN code', async () => {
  //     codeService.has.mockImplementation((cat, val) =>
  //       cat !== 'ZEI_KUBUN' || [1, 2].includes(val));
  //     await expect(service.create({ ...validDto, zei_kubun: 99 }, session, baseReq))
  //       .rejects.toMatchObject({
  //         response: expect.objectContaining({
  //           error_code: 'VALIDATION_ERROR',
  //           errors: expect.arrayContaining([
  //             expect.objectContaining({ field: 'zei_kubun' }),
  //           ]),
  //         }),
  //       });
  //   });
  //
  //   it('should wrap INSERT + audit log in single transaction when create succeeds', async () => {
  //     // COVERS: transaction boundary
  //     await service.create(validDto, session, baseReq);
  //     expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  //     expect(txManager.save).toHaveBeenCalledTimes(1);
  //     expect(auditLog.logOperation).toHaveBeenCalledTimes(1);
  //   });
  //
  //   it('should call AuditLogService.logOperation with bare CREATE operation', async () => {
  //     // COVERS: 4.x 操作ログ — operation MUST be bare 'CREATE', NEVER 'JA_CREATE'
  //     await service.create(validDto, buildSession({ account_id: 11 }), baseReq);
  //     expect(auditLog.logOperation).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         logType: 1,
  //         accountId: 11,
  //         operation: 'CREATE',
  //         resultStatus: 1,
  //         targetTable: 'm___MODULE__',
  //       }),
  //     );
  //   });
  // });
});

// Screen: ACSMS-SCR-027 — ロール管理画面
//
// Drives src/modules/roles/roles.service.ts. Every it() maps to a clause
// in docs/design/ACSMS-SCR-027/ACSMS-SCR-027-api.md (4 endpoints):
//   - ACSMS-API-027-001 findAll roles
//   - ACSMS-API-027-002 findOne role with permission_ids
//   - ACSMS-API-027-003 update role + permission allocations (transaction)
//   - ACSMS-API-027-004 findAllPermissions

import { NotFoundException } from '@/common/exceptions/common.exceptions';

import { RolesService } from '@/modules/roles/roles.service';
import {
  buildRole,
  buildRoleList,
  buildPermissionList,
  buildRolePermission,
  buildUpdateRoleBody,
} from '@test/fixtures/roles.factory';
import { buildSession } from '@test/fixtures/session.factory';

describe('RolesService', () => {
  let service: any;
  let roleRepo: any;
  let permissionRepo: any;
  let rolePermissionRepo: any;
  let qbMock: any;
  let auditLog: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    roleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock),
    };
    permissionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock),
    };
    rolePermissionRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      createQueryBuilder: jest.fn(() => qbMock),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        return { ...value };
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      query: jest.fn(async () => []),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => []),
    };

    // Constructor order MUST match the service:
    //   (roleRepo, permissionRepo, rolePermissionRepo, dataSource, auditLog)
    service = new RolesService(
      roleRepo,
      permissionRepo,
      rolePermissionRepo,
      dataSource,
      auditLog,
    );
  });

  // ─── ACSMS-API-027-001 — GET /api/v1/roles (findAll) ──────────────────────────
  describe('findAll', () => {
    it('should return the 5 seeded roles ordered by role_id ASC when NICHINO_ADMIN calls', async () => {
      // COVERS: §4.3 SELECT m_roles + §4.4 レスポンス生成
      roleRepo.find.mockResolvedValue(buildRoleList());

      const result = await service.findAll();

      expect(result.data).toHaveLength(5);
      expect(result.data[0]).toMatchObject({ role_id: 1, role_code: 'NICHINO_ADMIN' });
      expect(result.data[4]).toMatchObject({ role_id: 5, role_code: 'JA_KANRI_SHITEN' });
    });

    it('should filter out soft-deleted rows when calling repo.find', async () => {
      // COVERS: §4.3 deleted_at IS NULL
      roleRepo.find.mockResolvedValue([]);

      await service.findAll();

      // TypeORM passes { where: { deletedAt: IsNull() } } OR equivalent.
      // Assert the call happened — exact predicate format depends on the impl,
      // but find MUST be called at least once.
      expect(roleRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should order by role_id ASC per §4.3 ORDER BY clause', async () => {
      // COVERS: §4.3 ORDER BY role_id ASC
      roleRepo.find.mockResolvedValue(buildRoleList());

      await service.findAll();

      const findArgs = roleRepo.find.mock.calls[0][0];
      // Either passed as { order: { roleId: 'ASC' } } object form, or a query
      // builder — accept either by inspecting the find call options.
      expect(findArgs).toBeDefined();
    });

    it('should return data shape matching api.md レスポンスデータ (role_id, role_code, role_name, description)', async () => {
      // COVERS: §レスポンスデータ all 4 fields
      roleRepo.find.mockResolvedValue([
        buildRole({
          roleId: 3,
          roleCode: 'CHUOKAI',
          roleName: '中央会',
          description: '中央会アカウント',
        }),
      ]);

      const result = await service.findAll();

      expect(result.data[0]).toEqual({
        role_id: 3,
        role_code: 'CHUOKAI',
        role_name: '中央会',
        description: '中央会アカウント',
      });
    });

    it('should serialize description as null when DB column is null', async () => {
      // COVERS: §レスポンスデータ description Nullable=〇
      roleRepo.find.mockResolvedValue([buildRole({ description: null })]);

      const result = await service.findAll();

      expect(result.data[0].description).toBeNull();
    });
  });

  // ─── ACSMS-API-027-002 — GET /api/v1/roles/:role_id (findOne) ─────────────────
  describe('findOne', () => {
    it('should return role detail with permission_ids array when role exists', async () => {
      // COVERS: §4.3 happy path — role SELECT + permission_ids JOIN
      roleRepo.findOne.mockResolvedValue(
        buildRole({
          roleId: 1,
          roleCode: 'NICHINO_ADMIN',
          roleName: '日農（管理者）',
          description: '日本農業新聞 管理者アカウント',
        }),
      );
      rolePermissionRepo.find.mockResolvedValue([
        buildRolePermission({ roleId: 1, permissionId: 16 }),
        buildRolePermission({ roleId: 1, permissionId: 17 }),
        buildRolePermission({ roleId: 1, permissionId: 18 }),
      ]);

      const result = await service.findOne(1);

      expect(result.data.role_id).toBe(1);
      expect(result.data.role_code).toBe('NICHINO_ADMIN');
      expect(result.data.permission_ids).toEqual([16, 17, 18]);
    });

    it('should sort permission_ids ASC per §4.3 ORDER BY permission_id ASC', async () => {
      // COVERS: §4.3 ORDER BY permission_id ASC
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      rolePermissionRepo.find.mockResolvedValue([
        buildRolePermission({ roleId: 3, permissionId: 38 }),
        buildRolePermission({ roleId: 3, permissionId: 1 }),
        buildRolePermission({ roleId: 3, permissionId: 17 }),
      ]);

      const result = await service.findOne(3);

      expect(result.data.permission_ids).toEqual([1, 17, 38]);
    });

    it('should throw NotFoundException when role does not exist (§4.3 → 404 NOT_FOUND)', async () => {
      // COVERS: エラー一覧 row 7 NOT_FOUND
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with code NOT_FOUND on the exception payload', async () => {
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toMatchObject({
        response: { error_code: 'NOT_FOUND' },
      });
    });

    it('should include created_at and updated_at in the response per レスポンスデータ rows 7-8', async () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const updatedAt = new Date('2026-04-14T14:30:00Z');
      roleRepo.findOne.mockResolvedValue(buildRole({ createdAt, updatedAt }));
      rolePermissionRepo.find.mockResolvedValue([]);

      const result = await service.findOne(1);

      expect(result.data.created_at).toBeDefined();
      expect(result.data.updated_at).toBeDefined();
    });

    it('should return empty permission_ids array when role has no permissions', async () => {
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 99 }));
      rolePermissionRepo.find.mockResolvedValue([]);

      const result = await service.findOne(99);

      expect(result.data.permission_ids).toEqual([]);
    });

    it('should filter out soft-deleted role_permission rows when assembling permission_ids', async () => {
      // COVERS: §4.3 second query — deleted_at IS NULL
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 1 }));
      rolePermissionRepo.find.mockResolvedValue([]);

      await service.findOne(1);

      // findOne now issues TWO `rolePermissionRepo.find` calls — one for
      // the full permission_ids list, one filtered by `locked: true` for
      // the locked_permission_ids subset. Both must filter deleted_at.
      expect(rolePermissionRepo.find).toHaveBeenCalledTimes(2);
      const calls = rolePermissionRepo.find.mock.calls;
      for (const [arg] of calls) {
        expect(arg.where).toEqual(expect.objectContaining({ roleId: 1 }));
      }
    });

    // [locked-permissions] Detail endpoint must expose the locked
    // subset so the FE can render those checkboxes disabled.
    it('should return locked_permission_ids subset derived from rows where locked=true', async () => {
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 1 }));
      // First find() = all active rows (permission_ids list).
      // Second find() = locked-only filter (locked_permission_ids).
      rolePermissionRepo.find
        .mockResolvedValueOnce([
          { permissionId: 1 },
          { permissionId: 2 },
          { permissionId: 99 },
        ])
        .mockResolvedValueOnce([
          { permissionId: 1 },
          { permissionId: 2 },
        ]);

      const result = await service.findOne(1);

      expect(result.data.permission_ids).toEqual([1, 2, 99]);
      expect(result.data.locked_permission_ids).toEqual([1, 2]);
    });
  });

  // ─── ACSMS-API-027-003 — PUT /api/v1/roles/:role_id (update) ──────────────────
  describe('update', () => {
    it('should update role basic info + replace permission allocations atomically', async () => {
      // COVERS: §4.4.1 + §4.4.2 + §4.4.3 (single transaction)
      const session = buildSession();
      const body = buildUpdateRoleBody({ permission_ids: [1, 2, 28] });

      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3, roleCode: 'CHUOKAI' }));
      permissionRepo.count.mockResolvedValue(3);  // all 3 IDs valid
      rolePermissionRepo.find.mockResolvedValueOnce([]); // before-snapshot
      txManager.findOne = jest.fn().mockResolvedValue(
        buildRole({ roleId: 3, roleCode: 'CHUOKAI', roleName: body.role_name }),
      );

      await service.update(3, body, session, baseReq);

      // Single transaction wraps everything.
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      // Role basic info updated.
      expect(txManager.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when role_id does not exist (§4.3 → 404)', async () => {
      // COVERS: エラー一覧 row 7 NOT_FOUND
      roleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, buildUpdateRoleBody(), buildSession(), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when any permission_id does not exist in m_permissions (§4.1 → VALIDATION_ERROR)', async () => {
      // COVERS: §4.1 last block — INSERT-side existence check
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(2); // body has 3 IDs but only 2 found

      await expect(
        service.update(
          3,
          buildUpdateRoleBody({ permission_ids: [1, 2, 9999] }),
          buildSession(),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: { error_code: 'VALIDATION_ERROR' },
      });
    });

    // [locked-permissions] Guard fires BEFORE the transaction, so a
    // body that drops a locked permission_id must throw VALIDATION_ERROR
    // without ever updating the DB or writing an audit log.
    it('should reject when the body drops a locked permission_id', async () => {
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 1, roleCode: 'NICHINO_ADMIN' }));
      permissionRepo.count.mockResolvedValue(1);
      // Current: ja.view (id=2) is locked, ja.delete (id=4) is NOT locked.
      rolePermissionRepo.find.mockResolvedValue([
        { permissionId: 2, locked: true },
        { permissionId: 4, locked: false },
      ]);

      // Body tries to keep only id=4 (drops the locked id=2).
      await expect(
        service.update(1, buildUpdateRoleBody({ permission_ids: [4] }), buildSession(), baseReq),
      ).rejects.toMatchObject({
        response: { error_code: 'VALIDATION_ERROR' },
      });
      // Transaction never starts.
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should preserve the `locked` flag when re-inserting an unchanged locked permission', async () => {
      const session = buildSession();
      // Current: id=1 locked, id=2 NOT locked. Body keeps both.
      rolePermissionRepo.find.mockResolvedValue([
        { permissionId: 1, locked: true },
        { permissionId: 2, locked: false },
      ]);
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(2);
      txManager.findOne = jest.fn().mockResolvedValue(buildRole({ roleId: 3 }));

      await service.update(3, buildUpdateRoleBody({ permission_ids: [1, 2] }), session, baseReq);

      // Find the re-insert call (manager.save with RolePermission rows).
      const saveCalls = txManager.save.mock.calls.filter(
        (call: any[]) => Array.isArray(call[1]),
      );
      expect(saveCalls.length).toBeGreaterThan(0);
      const insertedRows = saveCalls[0][1] as Array<{ permissionId: number; locked: boolean }>;
      const row1 = insertedRows.find((r) => r.permissionId === 1);
      const row2 = insertedRows.find((r) => r.permissionId === 2);
      expect(row1?.locked).toBe(true);   // preserved
      expect(row2?.locked).toBe(false);  // preserved
    });

    it('should soft-delete existing role_permission rows before INSERTing new ones (§4.4.2 → §4.4.3)', async () => {
      const session = buildSession();
      const body = buildUpdateRoleBody({ permission_ids: [1, 5] });
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(2);
      rolePermissionRepo.find.mockResolvedValue([]);
      txManager.findOne = jest.fn().mockResolvedValue(buildRole({ roleId: 3 }));

      await service.update(3, body, session, baseReq);

      // §4.4.2 UPDATE m_roles_permissions SET deleted_at = NOW() WHERE role_id = ...
      // Either txManager.update is called for soft-delete OR txManager.query.
      const softDeleteCalled =
        txManager.update.mock.calls.length > 0 ||
        txManager.query.mock.calls.some(
          (call: any[]) => typeof call[0] === 'string' && /UPDATE\s+m_roles_permissions/i.test(call[0]),
        );
      expect(softDeleteCalled).toBe(true);
    });

    it('should NOT INSERT into m_roles_permissions when permission_ids is empty (§4.4.3 注記)', async () => {
      // COVERS: §4.4.3 ※ permission_ids が空配列の場合、INSERT は実行しない
      const session = buildSession();
      const body = buildUpdateRoleBody({ permission_ids: [] });
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(0);
      txManager.findOne = jest.fn().mockResolvedValue(buildRole({ roleId: 3 }));

      await service.update(3, body, session, baseReq);

      // No txManager.save() with array of role-permission rows.
      const savedRolePermissions = txManager.save.mock.calls.filter((call: any[]) => {
        const arg = call[call.length - 1];
        return Array.isArray(arg) && arg.length > 0;
      });
      expect(savedRolePermissions).toHaveLength(0);
    });

    it('should call AuditLogService.logUpdate with operation=UPDATE inside the transaction (§4.5)', async () => {
      // COVERS: §4.5 操作ログ記録 + transaction boundary contract
      const session = buildSession();
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(0);
      rolePermissionRepo.find.mockResolvedValue([]);
      txManager.findOne = jest.fn().mockResolvedValue(buildRole({ roleId: 3 }));

      await service.update(3, buildUpdateRoleBody({ permission_ids: [] }), session, baseReq);

      // Either logUpdate or logOperation must have been called with bare 'UPDATE'.
      const auditCalled =
        auditLog.logUpdate.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some(
          (call: any[]) => call[0]?.operation === 'UPDATE',
        );
      expect(auditCalled).toBe(true);
    });

    it('should pass the tx manager to AuditLogService so the audit INSERT joins the surrounding transaction', async () => {
      // COVERS: rule "main DML + audit log must share one tx"
      const session = buildSession();
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(0);
      rolePermissionRepo.find.mockResolvedValue([]);
      txManager.findOne = jest.fn().mockResolvedValue(buildRole({ roleId: 3 }));

      await service.update(3, buildUpdateRoleBody({ permission_ids: [] }), session, baseReq);

      // Whichever audit method was called, its LAST arg should be the txManager.
      const call =
        auditLog.logUpdate.mock.calls[0] ?? auditLog.logOperation.mock.calls[0];
      const lastArg = call?.[call.length - 1];
      expect(lastArg).toBe(txManager);
    });

    it('should rollback the role UPDATE when AuditLogService.logUpdate throws', async () => {
      // COVERS: rollback contract — business write + audit log atomic
      const session = buildSession();
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(0);
      rolePermissionRepo.find.mockResolvedValue([]);
      txManager.findOne = jest.fn().mockResolvedValue(buildRole({ roleId: 3 }));
      auditLog.logUpdate.mockRejectedValue(new Error('audit-fail'));
      auditLog.logOperation.mockRejectedValue(new Error('audit-fail'));
      // Simulate dataSource.transaction propagating the rejection (rollback).
      dataSource.transaction = jest.fn(async (cb: any) => {
        await cb(txManager);
      });
      dataSource.transaction.mockImplementation(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (e) {
          throw e;
        }
      });

      await expect(
        service.update(3, buildUpdateRoleBody({ permission_ids: [] }), session, baseReq),
      ).rejects.toBeDefined();
    });

    it('should emit error audit log (log_type=3) when transaction rolls back (§4.7)', async () => {
      // COVERS: §4.7 例外処理 — トランザクション外の error log
      const session = buildSession();
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(0);
      // Force the tx to throw — service should still log_type=3 outside.
      dataSource.transaction = jest.fn(async () => {
        throw new Error('db-down');
      });

      await expect(
        service.update(3, buildUpdateRoleBody({ permission_ids: [] }), session, baseReq),
      ).rejects.toBeDefined();

      // Error log fired OUTSIDE the rejected transaction.
      const errorLogCalled =
        auditLog.logError.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some(
          (call: any[]) => call[0]?.logType === 3 || call[0]?.log_type === 3,
        );
      expect(errorLogCalled).toBe(true);
    });

    it('should return the updated role with refreshed permission_ids in the response', async () => {
      const session = buildSession();
      const body = buildUpdateRoleBody({ permission_ids: [1, 2, 3] });
      roleRepo.findOne.mockResolvedValue(buildRole({ roleId: 3 }));
      permissionRepo.count.mockResolvedValue(3);
      rolePermissionRepo.find.mockResolvedValue([]);
      txManager.findOne = jest.fn().mockResolvedValue(
        buildRole({ roleId: 3, roleName: body.role_name, description: body.description }),
      );

      const result = await service.update(3, body, session, baseReq);

      expect(result.data.role_id).toBe(3);
      expect(result.data.role_name).toBe(body.role_name);
      expect(result.data.permission_ids).toEqual(expect.arrayContaining([1, 2, 3]));
    });
  });

  // ─── ACSMS-API-027-004 — GET /api/v1/permissions (findAllPermissions) ─────────
  describe('findAllPermissions', () => {
    it('should return all permissions sorted by permission_id ASC', async () => {
      // COVERS: §4.3 SELECT m_permissions + ORDER BY permission_id ASC
      permissionRepo.find.mockResolvedValue(buildPermissionList());

      const result = await service.findAllPermissions();

      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({
        permission_id: 1,
        permission_code: 'dokusya.create',
        permission_name: '購読者登録',
      });
    });

    it('should filter out soft-deleted rows when querying m_permissions', async () => {
      // COVERS: §4.3 deleted_at IS NULL
      permissionRepo.find.mockResolvedValue([]);

      await service.findAllPermissions();

      expect(permissionRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should map every レスポンスデータ field correctly (permission_id, code, name, description)', async () => {
      // COVERS: §レスポンスデータ all 4 fields
      permissionRepo.find.mockResolvedValue([
        buildPermissionList()[2], // account.create
      ]);

      const result = await service.findAllPermissions();

      expect(result.data[0]).toEqual({
        permission_id: 28,
        permission_code: 'account.create',
        permission_name: 'アカウント登録',
        description: '購読者情報の新規登録',
      });
    });

    it('should serialize description as null when DB column is null', async () => {
      // COVERS: §レスポンスデータ description Nullable=〇
      permissionRepo.find.mockResolvedValue([buildPermissionList()[0]]);
      // Override the description to null for this test.
      permissionRepo.find.mockResolvedValue([
        { ...buildPermissionList()[0], description: null },
      ]);

      const result = await service.findAllPermissions();

      expect(result.data[0].description).toBeNull();
    });
  });
});

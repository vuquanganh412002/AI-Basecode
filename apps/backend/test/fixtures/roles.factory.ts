// Screen: ACSMS-SCR-027 — ロール管理画面
//
// Fixture builders for Role / Permission / RolePermission entities used by
// service / controller / integration specs.

import type { Permission } from '@/database/entities/permission.entity';
import type { Role } from '@/database/entities/role.entity';
import type { RolePermission } from '@/database/entities/role-permission.entity';

export function buildRole(overrides: Partial<Role> = {}): Role {
  const now = new Date();
  return {
    roleId: 1,
    roleCode: 'NICHINO_ADMIN',
    roleName: '日農（管理者）',
    description: '日本農業新聞 管理者アカウント',
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Role;
}

/** Canonical 5-role seed list per docs/database/seeder.md §3. */
export function buildRoleList(): Role[] {
  return [
    buildRole({
      roleId: 1,
      roleCode: 'NICHINO_ADMIN',
      roleName: '日農（管理者）',
      description: '日本農業新聞 管理者アカウント',
    }),
    buildRole({
      roleId: 2,
      roleCode: 'NICHINO_STAFF',
      roleName: '日農（担当者）',
      description: '日本農業新聞 担当者アカウント',
    }),
    buildRole({
      roleId: 3,
      roleCode: 'CHUOKAI',
      roleName: '中央会',
      description: '中央会アカウント',
    }),
    buildRole({
      roleId: 4,
      roleCode: 'JA_HONTEN',
      roleName: 'JA本店',
      description: 'JA本店アカウント',
    }),
    buildRole({
      roleId: 5,
      roleCode: 'JA_KANRI_SHITEN',
      roleName: 'JA管理支店',
      description: 'JA管理支店アカウント',
    }),
  ];
}

export function buildPermission(overrides: Partial<Permission> = {}): Permission {
  const now = new Date();
  return {
    permissionId: 1,
    permissionCode: 'dokusya.create',
    permissionName: '購読者登録',
    description: '購読者情報の新規登録',
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as Permission;
}

export function buildPermissionList(): Permission[] {
  return [
    buildPermission({ permissionId: 1, permissionCode: 'dokusya.create', permissionName: '購読者登録' }),
    buildPermission({ permissionId: 2, permissionCode: 'dokusya.view', permissionName: '購読者参照' }),
    buildPermission({ permissionId: 28, permissionCode: 'account.create', permissionName: 'アカウント登録' }),
  ];
}

export function buildRolePermission(overrides: Partial<RolePermission> = {}): RolePermission {
  const now = new Date();
  return {
    rolePermissionId: 1,
    roleId: 3,
    permissionId: 1,
    deletedAt: null,
    createdAt: now,
    createdBy: 'SYSTEM',
    updatedAt: now,
    updatedBy: 'SYSTEM',
    ...overrides,
  } as unknown as RolePermission;
}

/** Default valid body for PUT /api/v1/roles/:role_id per api.md §3 リクエスト例. */
export function buildUpdateRoleBody(overrides: Record<string, unknown> = {}) {
  return {
    role_name: '中央会',
    description: '中央会アカウント（更新）',
    permission_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41, 42, 43],
    ...overrides,
  };
}

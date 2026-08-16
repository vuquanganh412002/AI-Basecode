import type { Role } from '@/database/entities/role.entity';
import type { Permission } from '@/database/entities/permission.entity';

/** 一覧アイテム（ACSMS-API-027-001）— 4項目、timestamp なし。 */
export interface RoleListItem {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
}

/** 詳細アイテム（ACSMS-API-027-002 / ACSMS-API-027-003）— permission_ids + timestamp を追加。 */
export interface RoleDetailResponse extends RoleListItem {
  permission_ids: number[];
  /**
   * `permission_ids` のうち `m_roles_permissions.locked = TRUE`（seed ベースライン）の
   * 部分集合。FE は該当チェックボックスを disabled にし、BE はこれを外す PATCH を拒否。
   */
  locked_permission_ids: number[];
  created_at: string | null;
  updated_at: string | null;
}

/** 権限一覧アイテム（ACSMS-API-027-004）。 */
export interface PermissionListItem {
  permission_id: number;
  permission_code: string;
  permission_name: string;
  description: string | null;
}

/** Role entity → ACSMS-SCR-027 一覧形状へ変換。 */
export function toRoleListItem(role: Role): RoleListItem {
  return {
    role_id: Number(role.roleId),
    role_code: role.roleCode,
    role_name: role.roleName,
    description: role.description ?? null,
  };
}

/** Role entity + ソート済み permission_ids → 詳細形状へ変換。 */
export function toRoleDetailResponse(
  role: Role,
  permissionIds: number[],
  lockedPermissionIds: number[] = [],
): RoleDetailResponse {
  return {
    ...toRoleListItem(role),
    permission_ids: permissionIds,
    locked_permission_ids: lockedPermissionIds,
    created_at: role.createdAt ? role.createdAt.toISOString() : null,
    updated_at: role.updatedAt ? role.updatedAt.toISOString() : null,
  };
}

/** Permission entity → ACSMS-SCR-027 一覧形状へ変換。 */
export function toPermissionListItem(p: Permission): PermissionListItem {
  return {
    permission_id: Number(p.permissionId),
    permission_code: p.permissionCode,
    permission_name: p.permissionName,
    description: p.description ?? null,
  };
}

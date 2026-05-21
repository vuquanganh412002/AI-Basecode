import type { Role } from '@/database/entities/role.entity';
import type { Permission } from '@/database/entities/permission.entity';

/** Listing item (API-027-001) — 4 fields, no timestamps. */
export interface RoleListItem {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
}

/** Detail item (API-027-002 / API-027-003) — adds permission_ids + timestamps. */
export interface RoleDetailResponse extends RoleListItem {
  permission_ids: number[];
  created_at: string | null;
  updated_at: string | null;
}

/** Permission list item (API-027-004). */
export interface PermissionListItem {
  permission_id: number;
  permission_code: string;
  permission_name: string;
  description: string | null;
}

/** Map a Role entity row to the SCR-027 list shape. */
export function toRoleListItem(role: Role): RoleListItem {
  return {
    role_id: Number(role.roleId),
    role_code: role.roleCode,
    role_name: role.roleName,
    description: role.description ?? null,
  };
}

/** Map a Role entity + its sorted permission_ids to the detail shape. */
export function toRoleDetailResponse(
  role: Role,
  permissionIds: number[],
): RoleDetailResponse {
  return {
    ...toRoleListItem(role),
    permission_ids: permissionIds,
    created_at: role.createdAt ? role.createdAt.toISOString() : null,
    updated_at: role.updatedAt ? role.updatedAt.toISOString() : null,
  };
}

/** Map a Permission entity row to the SCR-027 list shape. */
export function toPermissionListItem(p: Permission): PermissionListItem {
  return {
    permission_id: Number(p.permissionId),
    permission_code: p.permissionCode,
    permission_name: p.permissionName,
    description: p.description ?? null,
  };
}

// Hand-written wrapper around the Orval-generated /api/v1/roles endpoints.
// Functions here are what SCR-027 (RoleManagementView) imports and what its
// unit spec mocks via vi.mock('@/api/roles/roles').
// Shapes mirror docs/design/ACSMS-SCR-027/ACSMS-SCR-027-api.md.

import axiosInstance from '@/api/axios-instance';

export interface RoleListItem {
  role_id: number;
  role_code: string;
  role_name: string;
  /** Nullable per api.md §レスポンスデータ row 5. */
  description: string | null;
}

export interface RoleDetail extends RoleListItem {
  permission_ids: number[];
  /**
   * Subset of `permission_ids` that are part of the role's seeded
   * baseline (`m_roles_permissions.locked = TRUE`). The FE renders
   * matching checkboxes `disabled` so admins can't accidentally
   * strip system-essential permissions; the BE rejects any PATCH
   * that drops one with a `VALIDATION_ERROR`.
   */
  locked_permission_ids: number[];
  /** ISO8601. Nullable only on read-after-create races; otherwise populated. */
  created_at: string | null;
  /** ISO8601. Nullable per api.md (row 8). */
  updated_at: string | null;
}

export interface UpdateRoleBody {
  role_name: string;
  description?: string;
  permission_ids: number[];
}

export interface RoleListResponse {
  data: RoleListItem[];
}

export interface RoleDetailResponse {
  data: RoleDetail;
}

export interface RoleUpdateResponse {
  data: RoleDetail;
  message: string;
}

/** GET /api/v1/roles — ACSMS-API-027-001. */
export async function listRoles(): Promise<RoleListResponse> {
  const res = await axiosInstance.get<RoleListResponse>('/api/v1/roles');
  return res.data;
}

/** GET /api/v1/roles/:role_id — ACSMS-API-027-002. */
export async function getRole(roleId: number): Promise<RoleDetailResponse> {
  const res = await axiosInstance.get<RoleDetailResponse>(`/api/v1/roles/${roleId}`);
  return res.data;
}

/** PUT /api/v1/roles/:role_id — ACSMS-API-027-003. */
export async function updateRole(
  roleId: number,
  body: UpdateRoleBody,
): Promise<RoleUpdateResponse> {
  const res = await axiosInstance.put<RoleUpdateResponse>(
    `/api/v1/roles/${roleId}`,
    body,
  );
  return res.data;
}

// ─── ACSMS-API-COMMON-002 — GET /api/v1/roles/dropdown ─────────────────
// Shared dropdown lookup used by SCR-024 / SCR-025 admin screens.
// Authenticated-only — no role gate (caller's screen guard authorized
// the user). Spec: docs/design/ACSMS-SCR-024 §ACSMS-API-COMMON-002.

export interface RoleDropdownItem {
  role_id: number;
  role_code: string;
  role_name: string;
}

export interface RoleDropdownResponse {
  data: RoleDropdownItem[];
}

export async function listRolesDropdown(): Promise<RoleDropdownResponse> {
  const res = await axiosInstance.get<RoleDropdownResponse>(
    '/api/v1/roles/dropdown',
  );
  return res.data;
}

// Hand-written axios wrapper for the /api/v1/permissions endpoint.
// Consumed only by SCR-027 (RoleManagementView) for the permission checkbox
// grid; mocked in unit specs via vi.mock('@/api/permissions/permissions').
// Shape mirrors docs/design/ACSMS-SCR-027/ACSMS-SCR-027-api.md §API-027-004.

import axiosInstance from '@/api/axios-instance';

export interface PermissionListItem {
  permission_id: number;
  permission_code: string;
  permission_name: string;
  /** Nullable per api.md §レスポンスデータ row 5. */
  description: string | null;
}

export interface PermissionListResponse {
  data: PermissionListItem[];
}

/** GET /api/v1/permissions — ACSMS-API-027-004. */
export async function listPermissions(): Promise<PermissionListResponse> {
  const res = await axiosInstance.get<PermissionListResponse>('/api/v1/permissions');
  return res.data;
}

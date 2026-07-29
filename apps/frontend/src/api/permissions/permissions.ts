// /api/v1/permissions 用の手書き axios wrapper。
// SCR-027 (RoleManagementView) の権限チェックボックスグリッドのみが使用。
// unit spec は vi.mock('@/api/permissions/permissions') でモック。
// 型は docs/design/ACSMS-SCR-027/ACSMS-SCR-027-api.md §API-027-004 に準拠。

import axiosInstance from '@/api/axios-instance';

export interface PermissionListItem {
  permission_id: number;
  permission_code: string;
  permission_name: string;
  /** api.md §レスポンスデータ row 5 に従い null 許容。 */
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

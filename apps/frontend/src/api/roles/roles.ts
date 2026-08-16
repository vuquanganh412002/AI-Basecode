// /api/v1/roles 用の手書き axios wrapper。
// ACSMS-SCR-027 (RoleManagementView) が import し、unit spec が
// vi.mock('@/api/roles/roles') でモックする関数群。
// 型は docs/design/ACSMS-SCR-027/ACSMS-SCR-027-api.md に準拠。

import axiosInstance from '@/api/axios-instance';

export interface RoleListItem {
  role_id: number;
  role_code: string;
  role_name: string;
  /** api.md §レスポンスデータ row 5 に従い null 許容。 */
  description: string | null;
}

export interface RoleDetail extends RoleListItem {
  permission_ids: number[];
  /**
   * `permission_ids` のうちロールのシード baseline に含まれるもの
   * （`m_roles_permissions.locked = TRUE`）。FE は該当チェックボックスを
   * `disabled` で描画し admin がシステム必須権限を誤って外せないようにする。
   * BE はそれを外す PATCH を `VALIDATION_ERROR` で拒否する。
   */
  locked_permission_ids: number[];
  /** ISO8601。作成直後の read-after-create レースの時のみ null、通常は設定済み。 */
  created_at: string | null;
  /** ISO8601。api.md（row 8）に従い null 許容。 */
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
// SCR-024 / SCR-025 admin 画面が使う共通 dropdown ルックアップ。
// 認証済みのみ — ロールゲートなし（呼び出し元の画面ガードが認可済み）。
// spec: docs/design/ACSMS-SCR-024 §ACSMS-API-COMMON-002。

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

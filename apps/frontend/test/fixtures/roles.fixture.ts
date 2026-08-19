// Test fixtures for ACSMS-SCR-027 (ロール管理画面).
// Shapes mirror docs/design/ACSMS-SCR-027/ACSMS-SCR-027-api.md レスポンスデータ.

export interface RoleListItem {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
}

export interface RoleDetail extends RoleListItem {
  permission_ids: number[];
  /** Subset of permission_ids whose checkbox FE renders disabled. */
  locked_permission_ids: number[];
  created_at: string | null;
  updated_at: string | null;
}

export interface PermissionListItem {
  permission_id: number;
  permission_code: string;
  permission_name: string;
  description: string | null;
}

export interface RoleListResponse {
  data: RoleListItem[];
}

export interface RoleDetailResponse {
  data: RoleDetail;
}

export interface PermissionListResponse {
  data: PermissionListItem[];
}

export interface UpdateRoleFormPayload {
  role_name: string;
  description: string;
  permission_ids: number[];
}

/** Single role row helper used by list assertions (ACSMS-API-027-001). */
export function buildRoleListItem(overrides: Partial<RoleListItem> = {}): RoleListItem {
  return {
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    role_name: '日農（管理者）',
    description: '日本農業新聞 管理者アカウント',
    ...overrides,
  };
}

/** Canonical 5-role list per docs/database/seeder.md §3. */
export function buildRoleList(): RoleListItem[] {
  return [
    buildRoleListItem({ role_id: 1, role_code: 'NICHINO_ADMIN', role_name: '日農（管理者）', description: '日本農業新聞 管理者アカウント' }),
    buildRoleListItem({ role_id: 2, role_code: 'NICHINO_STAFF', role_name: '日農（担当者）', description: '日本農業新聞 担当者アカウント' }),
    buildRoleListItem({ role_id: 3, role_code: 'CHUOKAI', role_name: '中央会', description: '中央会アカウント' }),
    buildRoleListItem({ role_id: 4, role_code: 'JA_HONTEN', role_name: 'JA本店', description: 'JA本店アカウント' }),
    buildRoleListItem({ role_id: 5, role_code: 'JA_KANRI_SHITEN', role_name: 'JA管理支店', description: 'JA管理支店アカウント' }),
  ];
}

/** Default 5-role list response (matches ACSMS-API-027-001 example). */
export function buildRoleListResponse(
  overrides: Partial<RoleListResponse> = {},
): RoleListResponse {
  return {
    data: overrides.data ?? buildRoleList(),
  };
}

/** Default role detail response — uses CHUOKAI (role_id=3) with seeder permission_ids. */
export function buildRoleDetail(overrides: Partial<RoleDetail> = {}): RoleDetail {
  return {
    role_id: 3,
    role_code: 'CHUOKAI',
    role_name: '中央会',
    description: '中央会アカウント',
    permission_ids: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      17, 18, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41, 42, 43,
    ],
    // Default: all seeded (= same as permission_ids) — exercises the
    // canonical "everything locked" path that real roles produce.
    // Specs that need a mix of locked + admin-added override this.
    locked_permission_ids: overrides.locked_permission_ids ?? [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      17, 18, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41, 42, 43,
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Response wrapper for GET /api/v1/roles/:role_id (ACSMS-API-027-002). */
export function buildRoleDetailResponse(
  overrides: Partial<RoleDetail> = {},
): RoleDetailResponse {
  return { data: buildRoleDetail(overrides) };
}

/** Single permission row helper. */
export function buildPermissionListItem(
  overrides: Partial<PermissionListItem> = {},
): PermissionListItem {
  return {
    permission_id: 1,
    permission_code: 'dokusya.create',
    permission_name: '購読者登録',
    description: '購読者情報の新規登録',
    ...overrides,
  };
}

/**
 * Default 43-permission list (full seeder set per docs/database/seeder.md §2)
 * — used by 編集モード permission grid + 全選択 checkbox tests.
 */
export function buildPermissionList(): PermissionListItem[] {
  return [
    buildPermissionListItem({ permission_id: 1, permission_code: 'dokusya.create', permission_name: '購読者登録', description: '購読者情報の新規登録' }),
    buildPermissionListItem({ permission_id: 2, permission_code: 'dokusya.view', permission_name: '購読者参照', description: '購読者明細検索・一覧表示' }),
    buildPermissionListItem({ permission_id: 3, permission_code: 'dokusya.update', permission_name: '購読者編集', description: '購読者情報の編集' }),
    buildPermissionListItem({ permission_id: 4, permission_code: 'dokusya.delete', permission_name: '購読者削除', description: '購読者情報の削除' }),
    buildPermissionListItem({ permission_id: 5, permission_code: 'dokusya.import', permission_name: '購読者Excelデータ取込', description: '購読者情報のExcel一括取込' }),
    buildPermissionListItem({ permission_id: 6, permission_code: 'dokusya.replace_hanbaiten', permission_name: '統廃合販売店読者移行', description: '販売店統廃合に伴う購読者の販売店一括置換' }),
    buildPermissionListItem({ permission_id: 7, permission_code: 'hanbaiten.create', permission_name: '販売店登録', description: '販売店情報の新規登録' }),
    buildPermissionListItem({ permission_id: 8, permission_code: 'hanbaiten.view', permission_name: '販売店参照', description: '販売店明細検索・一覧表示' }),
    buildPermissionListItem({ permission_id: 9, permission_code: 'hanbaiten.update', permission_name: '販売店編集', description: '販売店情報の編集' }),
    buildPermissionListItem({ permission_id: 10, permission_code: 'hanbaiten.delete', permission_name: '販売店削除', description: '販売店情報の削除' }),
    buildPermissionListItem({ permission_id: 11, permission_code: 'hanbaiten.import', permission_name: '販売店Excelデータ取込', description: '販売店情報のExcel一括取込' }),
    buildPermissionListItem({ permission_id: 12, permission_code: 'tanka.create', permission_name: '単価登録', description: '単価マスタの新規登録' }),
    buildPermissionListItem({ permission_id: 13, permission_code: 'tanka.view', permission_name: '単価参照', description: '単価マスタの検索・一覧表示' }),
    buildPermissionListItem({ permission_id: 14, permission_code: 'tanka.update', permission_name: '単価編集', description: '単価マスタの編集' }),
    buildPermissionListItem({ permission_id: 15, permission_code: 'tanka.delete', permission_name: '単価削除', description: '単価マスタの削除' }),
    buildPermissionListItem({ permission_id: 16, permission_code: 'ja.create', permission_name: 'JA登録', description: 'JAマスタの新規登録' }),
    buildPermissionListItem({ permission_id: 17, permission_code: 'ja.view', permission_name: 'JA参照', description: 'JAマスタの参照' }),
    buildPermissionListItem({ permission_id: 18, permission_code: 'ja.update', permission_name: 'JA編集', description: 'JAマスタの編集' }),
    buildPermissionListItem({ permission_id: 19, permission_code: 'ja.delete', permission_name: 'JA削除', description: 'JAマスタの削除' }),
    buildPermissionListItem({ permission_id: 28, permission_code: 'account.create', permission_name: 'アカウント登録', description: 'アカウントの新規作成' }),
    buildPermissionListItem({ permission_id: 36, permission_code: 'file.upload', permission_name: 'ファイルアップロード', description: 'ファイルのアップロード' }),
    buildPermissionListItem({ permission_id: 38, permission_code: 'log.view', permission_name: 'ログ参照', description: '操作ログの参照' }),
  ];
}

/** Default permission list response (ACSMS-API-027-004). */
export function buildPermissionListResponse(
  overrides: Partial<PermissionListResponse> = {},
): PermissionListResponse {
  return {
    data: overrides.data ?? buildPermissionList(),
  };
}

/** Default valid PUT /api/v1/roles/:role_id body (ACSMS-API-027-003). */
export function buildUpdateRoleForm(
  overrides: Partial<UpdateRoleFormPayload> = {},
): UpdateRoleFormPayload {
  return {
    role_name: '中央会',
    description: '中央会アカウント（更新）',
    permission_ids: [1, 2, 3, 28],
    ...overrides,
  };
}

/**
 * Minimal authenticated NICHINO_ADMIN user — only this role can reach
 * the screen per screen-design.md §機能詳細 1.2. Override `role_code` to
 * model the access-denied path.
 */
export function buildAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    account_id: 1,
    login_id: 'admin01',
    account_name: '管理者太郎',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    role_name: '日農（管理者）',
    ja_id: null,
    kanri_shiten_id: null,
    todofuken_code: null,
    paper_flg: false,
    denshi_flg: false,
    email: 'admin@nichino.co.jp',
    mfa_enable_flg: false,
    permissions: [],
    ...overrides,
  };
}

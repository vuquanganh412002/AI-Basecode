/**
 * アカウントのロール判別子。`apps/backend/src/common/enums/role-code.enum.ts` のミラー。
 *
 * `RoleManagementView` / `JaFormView` / `KanriShitenFormView` / `ShitenFormView` /
 * `AccountsListView` / `AccountFormView` 等のビューに散在していたマジック文字列比較
 * （`'NICHINO_ADMIN'`, `'CHUOKAI'`, …）を置き換える。
 *
 * 表示ラベル（`日農（管理者）` 等）は auth ユーザーの `role_name`（BE 側で `m_roles` を結合）
 * または `/api/v1/roles/dropdown` ペイロードから取得 — テンプレートにハードコードしない。
 */
export const RoleCode = {
  NICHINO_ADMIN: 'NICHINO_ADMIN',
  NICHINO_STAFF: 'NICHINO_STAFF',
  CHUOKAI: 'CHUOKAI',
  JA_HONTEN: 'JA_HONTEN',
  JA_KANRI_SHITEN: 'JA_KANRI_SHITEN',
} as const;
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

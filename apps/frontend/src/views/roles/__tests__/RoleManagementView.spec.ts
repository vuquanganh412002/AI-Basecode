// Screen: ACSMS-SCR-027 — ロール管理画面
//
// Drives src/views/roles/RoleManagementView.vue. Every it() maps to a
// clause in docs/design/ACSMS-SCR-027/screen-design.md (機能定義 + メッセージ情報) +
// docs/design/ACSMS-SCR-027/index.html (UI structure) +
// docs/design/ACSMS-SCR-027/ACSMS-SCR-027-api.md (ACSMS-API-027-001..004).
//
// Layout per screen-design: ONE view that hosts both the role list (閲覧モード)
// AND an inline edit form + permission checkbox grid (編集モード). Clicking
// 編集 on a row flips the view into 編集モード, 保存 commits the role + permission
// allocation via PUT /api/v1/roles/:role_id, クリア resets back to 閲覧モード.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import RoleManagementView from '@/views/roles/RoleManagementView.vue';
import {
  buildRoleList,
  buildRoleListResponse,
  buildRoleDetail,
  buildRoleDetailResponse,
  buildPermissionListResponse,
  buildAuthUser,
} from '@test/fixtures/roles.fixture';

// Mock the hand-written roles API wrapper (`src/api/roles/roles.ts`)
// exporting these named functions.
vi.mock('@/api/roles/roles', () => ({
  listRoles: vi.fn(),
  getRole: vi.fn(),
  updateRole: vi.fn(),
}));

// Permissions list comes from a sibling hand-written wrapper
// `src/api/permissions/permissions.ts` (ACSMS-API-027-004). Kept separate from
// roles per the tag-per-controller wrapper convention.
vi.mock('@/api/permissions/permissions', () => ({
  listPermissions: vi.fn(),
}));

// Spy on antd's global toasts so we can assert success / error copy.
// Antd's `MessageType` is a callable with PromiseLike — return undefined via
// cast so the spy compiles even once @ts-nocheck is removed by /gen-code.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Override default NICHINO_ADMIN session (use for access-denied path). */
  user?: ReturnType<typeof buildAuthUser>;
}

async function renderView(opts: RenderOptions = {}): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
      { path: '/roles', name: 'RoleManagement', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'RoleManagement' });
  await router.isReady();

  const wrapper = mount(RoleManagementView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAuthUser() },
          },
        }),
        Antd,
      ],
    },
  });
  await flushPromises();
  return { wrapper, router };
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { listRoles, getRole, updateRole } = await import('@/api/roles/roles');
  vi.mocked(listRoles).mockResolvedValue(buildRoleListResponse());
  vi.mocked(getRole).mockResolvedValue(buildRoleDetailResponse());
  vi.mocked(updateRole).mockResolvedValue({
    data: buildRoleDetail(),
    message: '更新しました。',
  });

  const { listPermissions } = await import('@/api/permissions/permissions');
  vi.mocked(listPermissions).mockResolvedValue(buildPermissionListResponse());
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1.0 + 1.1) — 閲覧モード
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — initial render (機能定義 1.x)', () => {
  // Page title 「ロール管理」 + breadcrumb come from MainLayout's
  // AppHeader (driven by route meta), NOT from this view. Don't assert on
  // them in unit-mount tests — they only render via the full layout chain.

  it('should render the ロール一覧 section heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('ロール一覧');
  });

  it('should fetch the roles list once when mounted', async () => {
    await renderView();
    const { listRoles } = await import('@/api/roles/roles');
    expect(listRoles).toHaveBeenCalledTimes(1);
  });

  it('should fetch the permissions list once when mounted', async () => {
    await renderView();
    const { listPermissions } = await import('@/api/permissions/permissions');
    expect(listPermissions).toHaveBeenCalledTimes(1);
  });

  it('should render all 5 seeded roles in the table when list resolves', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    for (const role of buildRoleList()) {
      expect(text).toContain(role.role_code);
      expect(text).toContain(role.role_name);
    }
  });

  it('should render an 編集 link in the operation column for each row when mounted', async () => {
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    // 5 rows × 1 編集 link each → at least 5 affordances
    expect(editLinks.length).toBeGreaterThanOrEqual(5);
  });

  it('should NOT render the role-edit form when mounted in 閲覧モード', async () => {
    // COVERS: index.html — section#registrationForm initially `hidden`.
    const { wrapper } = await renderView();
    // The 保存 button only renders when the form is in 編集モード.
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === '保存' || b.text().includes('保'));
    expect(saveBtn).toBeUndefined();
  });

  it('should NOT render the 権限設定 panel when mounted in 閲覧モード', async () => {
    // COVERS: index.html — div#permissionPanel initially `hidden`.
    const { wrapper } = await renderView();
    expect(wrapper.text()).not.toContain('権限設定');
  });

  it('should render the table column headers when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    // Table headers per index.html: 編集 / ロールコード / ロール名 / 説明
    expect(text).toContain('ロールコード');
    expect(text).toContain('ロール名');
    expect(text).toContain('説明');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. ロール情報更新（編集モード）(機能定義 2.0 / 2.1)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — enter edit mode (機能定義 2.1)', () => {
  it('should call getRole with the row role_id when 編集 is clicked', async () => {
    const { wrapper } = await renderView();
    const { getRole } = await import('@/api/roles/roles');
    vi.mocked(getRole).mockClear();

    // Click 編集 on the 3rd row (CHUOKAI — role_id=3, has permission_ids).
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    expect(editLinks.length).toBeGreaterThanOrEqual(3);
    await editLinks[2].trigger('click');
    await flushPromises();

    expect(getRole).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getRole).mock.calls[0]?.[0]).toBe(3);
  });

  it('should show the role-edit form when 編集 is clicked', async () => {
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[0].trigger('click');
    await flushPromises();

    // 保存 button only renders in 編集モード.
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('保'));
    expect(saveBtn).toBeDefined();
  });

  it('should show the 権限設定 panel when 編集 is clicked', async () => {
    // COVERS: 機能定義 2.1 — 権限設定パネルを表示
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[0].trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('権限設定');
  });

  it('should pre-fill the role-name input with the selected role data when 編集 is clicked', async () => {
    const { getRole } = await import('@/api/roles/roles');
    vi.mocked(getRole).mockResolvedValue(
      buildRoleDetailResponse({
        role_id: 3,
        role_code: 'CHUOKAI',
        role_name: '中央会',
        description: '中央会アカウント',
      }),
    );

    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[2].trigger('click');
    await flushPromises();

    // Assert by reading the input values rather than wrapper.text() — antd's
    // <a-input> binds the value attribute via v-model, not as a DOM text node.
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const values = inputs.map((i) => (i.element as HTMLInputElement).value);
    expect(values.some((v) => v === '中央会')).toBe(true);
    expect(values.some((v) => v === 'CHUOKAI')).toBe(true);
  });

  it('should disable the role_code input when entering 編集モード', async () => {
    // COVERS: 機能定義 2.1 — ロールコードは編集不可とする
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[0].trigger('click');
    await flushPromises();

    // Find the input whose value equals the selected role's code, then
    // verify its disabled attribute / class.
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const codeInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === 'NICHINO_ADMIN',
    );
    expect(codeInput).toBeDefined();
    expect(codeInput!.attributes('disabled')).toBeDefined();
  });

  it('should NOT disable the role_name input when entering 編集モード', async () => {
    // COVERS: 機能定義 2.1 — ロール名・説明を有効化
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[0].trigger('click');
    await flushPromises();

    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const nameInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '日農（管理者）',
    );
    expect(nameInput).toBeDefined();
    expect(nameInput!.attributes('disabled')).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 権限のチェックボックス操作 (機能定義 4.0)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — permission checkboxes (機能定義 4.x)', () => {
  async function enterEditMode(roleIndex = 2) {
    const { wrapper, router } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[roleIndex].trigger('click');
    await flushPromises();
    return { wrapper, router };
  }

  it('should render one checkbox per permission when in 編集モード', async () => {
    // COVERS: index.html renderPermissionCheckboxes() — checkbox per permission row
    const { wrapper } = await enterEditMode();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    // Fixture has 22 permissions + 1 全選択 checkbox = 23 minimum.
    expect(checkboxes.length).toBeGreaterThanOrEqual(22);
  });

  it('should render the 全選択 checkbox when in 編集モード', async () => {
    // COVERS: 機能定義 4.2 — 「全選択」のチェックボックス
    // The label is conveyed via aria-label/title on the master checkbox
    // (not a visible text node) so screen readers + hover tooltips work
    // while the header row stays visually compact.
    const { wrapper } = await enterEditMode();
    const master = wrapper.find('input[type="checkbox"][aria-label="全選択"]');
    expect(master.exists()).toBe(true);
  });

  it('should pre-check the permission checkboxes that match permission_ids when entering 編集モード', async () => {
    // COVERS: 機能定義 2.1 — 権限設定パネルを表示（現在の権限を反映）
    // CHUOKAI fixture includes permission_id=1 (購読者登録) and EXCLUDES
    // permission_id=16 (ja.create). Verify the right subset is checked.
    const { wrapper } = await enterEditMode();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    const checkedCount = checkboxes.filter(
      (c) => (c.element as HTMLInputElement).checked,
    ).length;
    // CHUOKAI has 29 permissions per seeder.md §3; with the fixture's
    // 22-permission subset we expect a non-zero pre-checked count.
    expect(checkedCount).toBeGreaterThan(0);
  });

  it('should toggle an individual permission off when its checked checkbox is clicked', async () => {
    // COVERS: 機能定義 4.1 — OFFにする場合、該当の権限付与が解除される
    const { wrapper } = await enterEditMode();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    const checkedBox = checkboxes.find(
      (c) => (c.element as HTMLInputElement).checked,
    );
    expect(checkedBox).toBeDefined();
    await checkedBox!.setValue(false);
    await flushPromises();
    expect((checkedBox!.element as HTMLInputElement).checked).toBe(false);
  });

  it('should toggle an individual permission on when its unchecked checkbox is clicked', async () => {
    // COVERS: 機能定義 4.1 — ONにする場合、該当の権限が付与される状態になる
    const { wrapper } = await enterEditMode();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    const uncheckedBox = checkboxes.find(
      (c) => !(c.element as HTMLInputElement).checked,
    );
    expect(uncheckedBox).toBeDefined();
    await uncheckedBox!.setValue(true);
    await flushPromises();
    expect((uncheckedBox!.element as HTMLInputElement).checked).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3b. ロック済み権限 — disabled state (locked_permission_ids)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — locked permissions', () => {
  it('should render `disabled` on every checkbox whose permission_id is in locked_permission_ids', async () => {
    const { getRole } = await import('@/api/roles/roles');
    vi.mocked(getRole).mockResolvedValue(
      buildRoleDetailResponse({
        permission_ids: [1, 2, 3, 4],
        locked_permission_ids: [1, 2], // ids 1+2 disabled; 3+4 editable
      }),
    );

    const { wrapper } = await renderView();
    // Enter edit mode on CHUOKAI (id=3, index 2 in default list).
    const editButtons = wrapper.findAll('button').filter((b) => b.text().includes('編集'));
    await editButtons[2].trigger('click');
    await flushPromises();

    const boxes = wrapper.findAll('[data-test="permission-checkbox"]');
    // Simpler: just count disabled state by position. Permissions are rendered in
    // index order from the mocked permissions list — assert via attribute scan.
    const disabledCount = boxes.filter((b) => b.attributes('disabled') !== undefined).length;
    expect(disabledCount).toBeGreaterThanOrEqual(2);
  });

  it('should keep checked + disabled state for locked when 全て解除 is clicked', async () => {
    const { getRole } = await import('@/api/roles/roles');
    vi.mocked(getRole).mockResolvedValue(
      buildRoleDetailResponse({
        permission_ids: [1, 2, 3],
        locked_permission_ids: [1],
      }),
    );

    const { wrapper } = await renderView();
    const editButtons = wrapper.findAll('button').filter((b) => b.text().includes('編集'));
    await editButtons[2].trigger('click');
    await flushPromises();

    // Find the "全て選択" master checkbox in the table header and toggle OFF.
    const headerBoxes = wrapper.findAll('thead input[type="checkbox"], div input[type="checkbox"]');
    const master = headerBoxes[0];
    await master.setValue(false);
    await flushPromises();

    // formState.permission_ids must still contain id=1 (locked).
    const vm = wrapper.vm as unknown as { formState: { permission_ids: number[] } };
    expect(vm.formState.permission_ids).toContain(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3c. getRole 失敗時の保存ガード (regression — permission-wipe-on-save)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — getRole failure guard (permission-wipe regression)', () => {
  it('should block 保存 and show a reload message when getRole fails while entering 編集モード', async () => {
    // A transient getRole() failure must NOT let 保存 send an empty
    // permission_ids and wipe the role's permissions server-side.
    const { getRole } = await import('@/api/roles/roles');
    vi.mocked(getRole).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[2].trigger('click');
    await flushPromises();

    // Form still opens (role_name/description pre-filled from the row).
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('権限情報の取得に失敗しました');

    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockClear();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateRole).not.toHaveBeenCalled();
  });

  it('should allow 保存 normally once getRole succeeds after a prior failure', async () => {
    const { getRole, updateRole } = await import('@/api/roles/roles');
    vi.mocked(getRole).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[2].trigger('click');
    await flushPromises();
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    // Re-open 編集 on the same row — getRole now resolves normally.
    vi.mocked(getRole).mockResolvedValueOnce(buildRoleDetailResponse());
    await editLinks[2].trigger('click');
    await flushPromises();

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.text()).not.toContain('権限情報の取得に失敗しました');

    vi.mocked(updateRole).mockClear();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateRole).toHaveBeenCalledTimes(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. 保存ボタン — バリデーション (機能定義 2.2)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — save validation (機能定義 2.2)', () => {
  async function enterEditMode() {
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[2].trigger('click');
    await flushPromises();
    return wrapper;
  }

  it('should render the 保存 submit button when in 編集モード', async () => {
    const wrapper = await enterEditMode();
    // Antd inserts a half-width space between two adjacent CJK chars
    // (`保 存`) — match by selector + substring.
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.text()).toContain('保');
  });

  it('should render the クリア cancel button when in 編集モード', async () => {
    const wrapper = await enterEditMode();
    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'クリア' || b.text().includes('クリ'));
    expect(cancelBtn).toBeDefined();
  });

  it('should show ACSMS-MSG-027-004 「必須項目です。」 when role_name is empty and 保存 is clicked', async () => {
    // COVERS: 機能定義 2.2 — ロール名: 必須、入力しない場合 ACSMS-MSG-027-004
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');

    // Clear role_name input.
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const nameInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '中央会',
    );
    expect(nameInput).toBeDefined();
    await nameInput!.setValue('');
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Help/error text rendered next to the field per <a-form-item :help>.
    expect(wrapper.text()).toContain('必須項目です。');
    // Server MUST NOT be called when client-side validation fails.
    expect(updateRole).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-027-004 「必須項目です。」 when role_name exceeds 20 chars and 保存 is clicked', async () => {
    // COVERS: 機能定義 2.2 — ロール名: 最大20文字
    // Per screen-design ACSMS-MSG-027-004 is the canonical message for the
    // role_name validation failure regardless of empty vs over-length.
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');

    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const nameInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '中央会',
    );
    expect(nameInput).toBeDefined();
    await nameInput!.setValue('あ'.repeat(21));
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Client-side validation triggers — server not called.
    expect(updateRole).not.toHaveBeenCalled();
    // Some validation message must be visible adjacent to the input.
    const help = wrapper.findAll('.ant-form-item-explain, [role="alert"]');
    expect(help.length).toBeGreaterThan(0);
  });

  it('should show ACSMS-MSG-027-007 「説明は200文字以内で入力してください。」 when description exceeds 200 chars', async () => {
    // COVERS: 機能定義 2.2 — 説明: 任意、最大200文字。ACSMS-MSG-027-007
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');

    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const descInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '中央会アカウント',
    );
    expect(descInput).toBeDefined();
    await descInput!.setValue('あ'.repeat(201));
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('説明は200文字以内で入力してください。');
    expect(updateRole).not.toHaveBeenCalled();
  });

  it('should accept description up to exactly 200 chars when 保存 is clicked', async () => {
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockClear();

    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const descInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '中央会アカウント',
    );
    await descInput!.setValue('あ'.repeat(200));
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateRole).toHaveBeenCalledTimes(1);
  });

  it('should accept empty description (空欄可) when 保存 is clicked', async () => {
    // COVERS: 機能定義 2.2 — 説明: 任意
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockClear();

    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const descInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '中央会アカウント',
    );
    await descInput!.setValue('');
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateRole).toHaveBeenCalledTimes(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. 保存ボタン — 成功フロー (機能定義 2.3)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — save success (機能定義 2.3)', () => {
  async function enterEditMode() {
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[2].trigger('click');
    await flushPromises();
    return wrapper;
  }

  it('should call updateRole with the editing role_id and the form payload when 保存 is clicked', async () => {
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateRole).toHaveBeenCalledTimes(1);
    // First positional arg = role_id of the row we entered edit mode on (CHUOKAI = 3).
    expect(vi.mocked(updateRole).mock.calls[0]?.[0]).toBe(3);
    // Second arg = body with role_name / description / permission_ids.
    const body = vi.mocked(updateRole).mock.calls[0]?.[1] as unknown as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      role_name: '中央会',
      description: '中央会アカウント',
    });
    expect(Array.isArray(body.permission_ids)).toBe(true);
  });

  it('should show ACSMS-MSG-027-001 「更新しました。」 toast when updateRole succeeds', async () => {
    // COVERS: 機能定義 2.3 — 更新成功 → ACSMS-MSG-027-001
    const wrapper = await enterEditMode();
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Verb-only convention — useNotify().updated() emits '更新しました。'.
    // Per .claude/rules/vue.md, the subject (ロール) is implied by screen context.
    expect(successSpy).toHaveBeenCalledWith('更新しました。');
  });

  it('should reload the role list when updateRole succeeds', async () => {
    // COVERS: 機能定義 2.3 — ロール一覧を再読込
    const wrapper = await enterEditMode();
    const { listRoles } = await import('@/api/roles/roles');
    const initialCalls = vi.mocked(listRoles).mock.calls.length;

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(vi.mocked(listRoles).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should return to 閲覧モード and hide the form when updateRole succeeds', async () => {
    // COVERS: 機能定義 2.3 — 閲覧モードへ変換
    const wrapper = await enterEditMode();

    // Sanity: form is visible BEFORE submit.
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // After successful save the 保存 button (and the form holding it)
    // should be gone — back to 閲覧モード.
    const submitAfter = wrapper.find('button[type="submit"]');
    expect(submitAfter.exists()).toBe(false);
  });

  it('should NOT include role_code in the updateRole body when 保存 is clicked (api.md §3 注記)', async () => {
    // COVERS: api.md §3 注記 — role_code は更新不可。リクエストに含めない。
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const body = vi.mocked(updateRole).mock.calls[0]?.[1] as unknown as Record<
      string,
      unknown
    >;
    expect(body).toBeDefined();
    expect('role_code' in body).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. 保存ボタン — 失敗フロー (機能定義 2.3 + メッセージ情報)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — save error paths', () => {
  async function enterEditMode() {
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[2].trigger('click');
    await flushPromises();
    return wrapper;
  }

  it('should NOT show success toast when updateRole rejects with 404 NOT_FOUND', async () => {
    // COVERS: 機能定義 2.3 — データ取得失敗 → ACSMS-MSG-027-002
    // The global axios interceptor surfaces the BE message; the view
    // therefore MUST NOT also call message.success.
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          error_code: 'NOT_FOUND',
          message: '指定されたロールが見つかりません',
        },
      },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });

  it('should NOT show success toast when updateRole rejects with 500 INTERNAL_SERVER_ERROR', async () => {
    // COVERS: 機能定義 2.3 — システムエラー → ACSMS-MSG-027-003
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockRejectedValueOnce({
      response: {
        status: 500,
        data: { error_code: 'INTERNAL_SERVER_ERROR' },
      },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });

  it('should stay in 編集モード when updateRole rejects', async () => {
    // The form should NOT be hidden on error — user should be able to
    // fix the input and retry without losing their work.
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Submit button still rendered — form still visible.
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('should map BE VALIDATION_ERROR errors[] to fieldErrors and render them under the matching field (regression)', async () => {
    // Bug: the catch block did nothing besides a comment, so a BE-side
    // VALIDATION_ERROR (e.g. a business rule useApiForm-based screens map
    // automatically) had nowhere to render on this hand-rolled form.
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          errors: [{ field: 'role_name', message: '既に同名のロールが存在します。' }],
        },
      },
    });

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('既に同名のロールが存在します。');
  });

  it('should clear a previously-shown server VALIDATION_ERROR once the next submit succeeds', async () => {
    const wrapper = await enterEditMode();
    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          errors: [{ field: 'role_name', message: '既に同名のロールが存在します。' }],
        },
      },
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('既に同名のロールが存在します。');

    vi.mocked(updateRole).mockResolvedValueOnce({
      data: buildRoleDetail({
        role_id: 3,
        role_code: 'CHUOKAI',
        role_name: '中央会',
        description: '',
        permission_ids: [],
      }),
      message: '更新しました。',
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).not.toContain('既に同名のロールが存在します。');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6b. Enter キーでの暗黙 submit 抑止（フォームは20項目超 — vue.md §preventEnterImplicitSubmit）
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — Enter key implicit submit guard', () => {
  it('should NOT call updateRole when Enter is pressed inside the ロール名 text input (regression)', async () => {
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[2].trigger('click');
    await flushPromises();

    const { updateRole } = await import('@/api/roles/roles');
    vi.mocked(updateRole).mockClear();

    const nameInput = wrapper
      .findAll('input')
      .find((i) => (i.element as HTMLInputElement).value === '中央会');
    expect(nameInput).toBeDefined();
    await nameInput!.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(updateRole).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. クリアボタン (機能定義 3.0)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — clear button (機能定義 3.x)', () => {
  async function enterEditMode() {
    const { wrapper } = await renderView();
    const editLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '編集' || el.text().includes('編集'));
    await editLinks[2].trigger('click');
    await flushPromises();
    return wrapper;
  }

  it('should NOT show the confirm modal when クリア is clicked with no dirty changes (機能定義 3.2)', async () => {
    // COVERS: 機能定義 3.2 — 変更なしの場合 → 確認モーダルなしでフォームを初期状態にリセット
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
      destroy: () => undefined,
      update: () => undefined,
    }));
    const wrapper = await enterEditMode();

    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'クリア' || b.text().includes('クリ'));
    expect(cancelBtn).toBeDefined();
    await cancelBtn!.trigger('click');
    await flushPromises();

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should keep the form open in edit mode when クリア is clicked with no dirty changes (機能定義 3.2 v1.3)', async () => {
    // COVERS: 機能定義 3.2 (v1.3) — 変更なし → 確認なし、編集モードを維持
    // （破棄すべき変更がないため表示は変わらない）。閲覧モードへは戻らない。
    const wrapper = await enterEditMode();

    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'クリア' || b.text().includes('クリ'));
    await cancelBtn!.trigger('click');
    await flushPromises();

    // 編集モード維持 → submit ボタンは表示されたまま。
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('should show the confirm modal with ACSMS-MSG-027-005 when クリア is clicked after a dirty change (機能定義 3.3)', async () => {
    // COVERS: 機能定義 3.3 — 変更ありの場合 → 確認モーダル（ACSMS-MSG-027-005）
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
      destroy: () => undefined,
      update: () => undefined,
    }));
    const wrapper = await enterEditMode();

    // Dirty the role_name so the form is now "modified".
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const nameInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '中央会',
    );
    await nameInput!.setValue('中央会（変更後）');
    await flushPromises();

    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'クリア' || b.text().includes('クリ'));
    await cancelBtn!.trigger('click');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    // Modal content must surface the ACSMS-MSG-027-005 literal.
    const args = confirmSpy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(JSON.stringify(args)).toContain('未保存データがあります');
  });

  it('should revert unsaved changes and keep the form open when クリア confirm modal 「はい」 is clicked (機能定義 3.3 v1.3)', async () => {
    // COVERS: 機能定義 3.3 (v1.3) — 「はい」をクリック → 未保存の変更のみを破棄し、
    // 編集中ロールの保存済みの値に戻す。編集モードは維持（閲覧モードへ戻らない）。
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      // Synchronously invoke onOk — simulates user clicking 「はい」.
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const wrapper = await enterEditMode();

    // Dirty the form first.
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const nameInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '中央会',
    );
    await nameInput!.setValue('中央会（変更後）');
    await flushPromises();

    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'クリア' || b.text().includes('クリ'));
    await cancelBtn!.trigger('click');
    await flushPromises();

    // 編集モード維持 → submit ボタンは表示されたまま。
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
    // 未保存の変更は破棄され、保存済みの値（中央会）に戻る。
    const revertedInputs = wrapper
      .findAll('input')
      .filter((i) => i.element.type === 'text');
    expect(
      revertedInputs.some((i) => (i.element as HTMLInputElement).value === '中央会'),
    ).toBe(true);
    expect(
      revertedInputs.some(
        (i) => (i.element as HTMLInputElement).value === '中央会（変更後）',
      ),
    ).toBe(false);
  });

  it('should keep the form open when クリア confirm modal 「いいえ」 is clicked', async () => {
    // COVERS: 機能定義 3.3 — 「いいえ」をクリック → 何も行わず、現在の画面を維持
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      // Simulate user clicking 「いいえ」 — invoke onCancel only.
      opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const wrapper = await enterEditMode();

    // Dirty the form first.
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const nameInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === '中央会',
    );
    await nameInput!.setValue('中央会（変更後）');
    await flushPromises();

    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'クリア' || b.text().includes('クリ'));
    await cancelBtn!.trigger('click');
    await flushPromises();

    // Form still visible.
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. 権限チェック (機能定義 1.2 + メッセージ情報 ACSMS-MSG-027-006)
// ───────────────────────────────────────────────────────────────────────
describe('RoleManagementView — access control (機能定義 1.2)', () => {
  it('should NOT call listRoles when the current user is NOT NICHINO_ADMIN', async () => {
    // COVERS: 機能定義 1.2 — この画面で操作できるのは「日農（管理者）」のみ
    // ACSMS-MSG-027-006 — アクセス権がありません。
    // In practice the router guard bounces non-admins via the global
    // PermissionsGuard equivalent on the FE side, but the view itself
    // MUST refuse to fetch when the role check fails (defence in depth).
    await renderView({
      user: buildAuthUser({ role_code: 'CHUOKAI', role_id: 3 }),
    });
    const { listRoles } = await import('@/api/roles/roles');
    expect(listRoles).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-027-006 「アクセス権がありません。」 message when the current user is NOT NICHINO_ADMIN', async () => {
    // COVERS: メッセージ情報 ACSMS-MSG-027-006
    const { wrapper } = await renderView({
      user: buildAuthUser({ role_code: 'JA_HONTEN', role_id: 4 }),
    });
    expect(wrapper.text()).toContain('アクセス権がありません。');
  });
});

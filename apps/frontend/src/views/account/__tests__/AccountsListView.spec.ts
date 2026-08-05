// Screen: ACSMS-SCR-024 — アカウントマスタ明細検索画面
//
// Drives src/views/account/AccountsListView.vue. Every it() maps to a clause
// in docs/design/ACSMS-SCR-024/screen-design.md (機能定義 + メッセージ情報) +
// docs/design/ACSMS-SCR-024/index.html (UI structure) +
// docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md (API-024-001 / 024-002 +
// COMMON-002 / -003 / -004 dropdowns).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import AccountsListView from '@/views/account/AccountsListView.vue';

import { resetTodofukenCache } from '@/composables/useTodofuken';
import {
  buildAccountListResponse,
  buildRoleDropdownList,
  buildJaDropdownResponse,
  buildKanriShitenDropdownList,
  buildAuthUser,
} from '@test/fixtures/accounts.fixture';

// API wrapper for SCR-024 endpoints. /gen-code-frontend will create
// `src/api/account/account.ts` exporting these names.
vi.mock('@/api/account/account', () => ({
  listAccounts: vi.fn(),
  removeAccount: vi.fn(),
}));

// Roles dropdown — COMMON-002.
vi.mock('@/api/roles/roles', () => ({
  listRolesDropdown: vi.fn(),
}));

// JA dropdown — COMMON-003 (already exists, mocked here so the view
// doesn't hit real HTTP during mount).
vi.mock('@/api/ja/ja', () => ({
  getJaDropdown: vi.fn(),
}));

// 管理支店 dropdown — COMMON-004 (already exists, mocked here).
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
}));

// Spy on antd's global toasts. Antd's `MessageType` is a callable
// PromiseLike — return undefined via cast so the spy compiles even
// once `@ts-nocheck` is removed.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Override default NICHINO_ADMIN session (for access-denied path). */
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
      { path: '/accounts', name: 'AccountList', component: { template: '<div />' } },
      { path: '/accounts/create', name: 'AccountCreate', component: { template: '<div />' } },
      {
        path: '/accounts/:id/edit',
        name: 'AccountEdit',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'AccountList' });
  await router.isReady();

  const wrapper = mount(AccountsListView, {
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
  // 都道府県は useTodofuken のモジュール共有キャッシュ。テスト間で持ち越すと
  // 2件目以降が「取得済み」になり HTTP 回数の検証が崩れる。
  resetTodofukenCache();
  vi.clearAllMocks();
  const { listAccounts, removeAccount } = await import('@/api/account/account');
  vi.mocked(listAccounts).mockResolvedValue(buildAccountListResponse());
  vi.mocked(removeAccount).mockResolvedValue({ message: '削除しました。' });

  const { listRolesDropdown } = await import('@/api/roles/roles');
  vi.mocked(listRolesDropdown).mockResolvedValue({ data: buildRoleDropdownList() });

  const { getJaDropdown } = await import('@/api/ja/ja');
  vi.mocked(getJaDropdown).mockResolvedValue(buildJaDropdownResponse());

  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  vi.mocked(getKanriShitenDropdown).mockResolvedValue({
    data: buildKanriShitenDropdownList(),
  });
});

// ───────────────────────────────────────────────────────────────────────
// 1. 初期表示 (機能定義 1.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — initial render (機能定義 1.x)', () => {
  // Page title 「アカウントマスタ明細検索画面」 + breadcrumb come from
  // MainLayout's AppHeader (driven by route meta), NOT this view. Don't
  // assert page title from inside the view spec.

  it('should render the アカウント一覧 section heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('アカウント一覧');
  });

  it('should fetch the accounts list once when mounted', async () => {
    await renderView();
    const { listAccounts } = await import('@/api/account/account');
    expect(listAccounts).toHaveBeenCalledTimes(1);
  });

  it('should fetch the role dropdown once when mounted (COMMON-002)', async () => {
    await renderView();
    const { listRolesDropdown } = await import('@/api/roles/roles');
    expect(listRolesDropdown).toHaveBeenCalledTimes(1);
  });

  it('should fetch the JA dropdown once when mounted (COMMON-003)', async () => {
    await renderView();
    const { getJaDropdown } = await import('@/api/ja/ja');
    expect(getJaDropdown).toHaveBeenCalled();
  });

  it('should render an empty search form (空白の検索フォーム) when mounted', async () => {
    const { wrapper } = await renderView();
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('ログインID'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('管理者区分'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('JA'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('管理支店'))).toBe(true);
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    // Default fixture returns 2 rows: admin001 + ja_honten001.
    expect(wrapper.text()).toContain('admin001');
    expect(wrapper.text()).toContain('ja_honten001');
  });

  it('should render the 検索 submit button when mounted', async () => {
    const { wrapper } = await renderView();
    // Antd may inject a half-width space inside CJK button labels —
    // match by selector first, then partial text.
    const searchBtn = wrapper.find('button[type="submit"]');
    expect(searchBtn.exists()).toBe(true);
  });

  it('should render the 検索クリア button when mounted', async () => {
    const { wrapper } = await renderView();
    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    expect(clearBtn).toBeDefined();
  });

  it('should render the 新規登録 button when mounted', async () => {
    const { wrapper } = await renderView();
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新') && b.text().includes('登録'));
    expect(createBtn).toBeDefined();
  });

  it('should render the table column headers when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    // Headers per index.html + api.md レスポンスデータ.
    expect(text).toContain('ログインID');
    expect(text).toContain('アカウント名');
    expect(text).toContain('管理者区分');
    expect(text).toContain('JA');
    expect(text).toContain('管理支店');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 検索 (機能定義 2.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — search (機能定義 2.x)', () => {
  it('should call listAccounts with login_id partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockClear();

    const codeInput = wrapper.find('input[type="text"]');
    await codeInput.setValue('admin');
    // JSDom doesn't auto-submit on a click; trigger the form's submit
    // event directly so BaseSearchForm's @submit fires.
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listAccounts).toHaveBeenCalled();
    const callArg = vi.mocked(listAccounts).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ login_id: 'admin' });
  });

  it('should call listAccounts with role_id filter when 管理者区分 dropdown changes', async () => {
    // Antd select is portal-rendered → drive via state mutation +
    // form submit (same pattern as JaListView spec for todofuken).
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.role_id = 4;
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ role_id: 4 }),
    );
  });

  it('should NOT include role_id in listAccounts params when 管理者区分 is unset', async () => {
    const { listAccounts } = await import('@/api/account/account');
    await renderView();
    const initialCall = vi.mocked(listAccounts).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(initialCall?.role_id).toBeUndefined();
  });

  it('should call listAccounts with ja_id filter when JA dropdown is selected', async () => {
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.ja_id = 10;
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ ja_id: 10 }),
    );
  });

  it('should call listAccounts with kanri_shiten_id filter when 管理支店 is selected', async () => {
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kanri_shiten_id = 20;
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ kanri_shiten_id: 20 }),
    );
  });

  it('should display ACSMS-MSG-024-001 「検索結果が見つかりませんでした。」 when search returns zero rows', async () => {
    // COVERS: 機能定義 2.3 検索結果なし
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockResolvedValue(
      buildAccountListResponse({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }),
    );

    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should still call listAccounts when listAccounts rejects with 500 (interceptor handles toast)', async () => {
    // COVERS: 機能定義 2.4 システムエラー — ACSMS-MSG-024-002 via global interceptor.
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    await renderView();
    expect(vi.mocked(listAccounts)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 検索クリア (機能定義 3.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — clear search (機能定義 3.x)', () => {
  it('should clear login_id field when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const codeInput = wrapper.find('input[type="text"]');
    await codeInput.setValue('admin');

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect((codeInput.element as HTMLInputElement).value).toBe('');
  });

  it('should reset to page 1 when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockClear();

    // Make the screen non-pristine so 検索クリア resets+refetches (a pristine
    // screen is now a no-op — see useTableQuery.isPristine).
    (wrapper.vm as unknown as { state: { filters: { login_id: string } } })
      .state.filters.login_id = 'x';

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listAccounts).toHaveBeenCalled();
    const callArg = vi.mocked(listAccounts).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ page: 1 });
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. アカウント編集 (機能定義 4.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — edit navigation (機能定義 4.x)', () => {
  it('should navigate to AccountEdit when ログインID link is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    // The ログインID column is a clickable link — find anchor by text.
    const links = wrapper.findAll('a, button').filter((el) => el.text().includes('admin001'));
    expect(links.length).toBeGreaterThanOrEqual(1);
    await links[0].trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('AccountEdit');
  });

  it('should pass the account_id as :id route param when ログインID link is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const links = wrapper.findAll('a, button').filter((el) => el.text().includes('admin001'));
    await links[0].trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    // account_id = 1 for admin001 per the default fixture.
    expect(pushed).toContain('"id":1');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. 新規登録 (機能定義 5.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — create navigation (機能定義 5.x)', () => {
  it('should navigate to AccountCreate when 新規登録 is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新') && b.text().includes('登録'));
    expect(createBtn).toBeDefined();
    await createBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('AccountCreate');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. ページネーション (機能定義 6.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — pagination (機能定義 6.x)', () => {
  it('should request 20 rows per page by default when mounted', async () => {
    await renderView();
    const { listAccounts } = await import('@/api/account/account');
    const callArg = vi.mocked(listAccounts).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.per_page).toBe(20);
  });

  it('should reset to page 1 when search filters change after pagination', async () => {
    // COVERS: 機能定義 6 — フィルタ変更時、ページは1にリセット
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockClear();

    const codeInput = wrapper.find('input[type="text"]');
    await codeInput.setValue('NEW');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listAccounts).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.page).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. カスケード JA→管理支店 (機能定義 8.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — JA→管理支店 cascade (機能定義 8.x)', () => {
  it('should fetch the 管理支店 dropdown when a JA is selected', async () => {
    // COVERS: 機能定義 8.1 JA選択→対応する管理支店一覧読み込み
    const { wrapper } = await renderView();
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(getKanriShitenDropdown).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.ja_id = 10;
    await flushPromises();

    expect(getKanriShitenDropdown).toHaveBeenCalled();
    // API signature is `getKanriShitenDropdown(jaId: number)` — primitive,
    // not an envelope. (Was `{ ja_id }` in an earlier draft of COMMON-004.)
    expect(vi.mocked(getKanriShitenDropdown).mock.calls[0]?.[0]).toBe(10);
  });

  it('should reset the kanri_shiten_id filter when JA selection changes', async () => {
    // COVERS: 機能定義 8.1 既存管理支店リセット
    const { wrapper } = await renderView();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.ja_id = 10;
      vm.state.filters.kanri_shiten_id = 20;
    }
    await flushPromises();

    if (vm.state?.filters) vm.state.filters.ja_id = 11;
    await flushPromises();

    expect(vm.state?.filters?.kanri_shiten_id).toBeFalsy();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. アカウント削除 (機能定義 9.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — delete (機能定義 9.x)', () => {
  it('should render a 削除 link in the 操作 column for each row when mounted', async () => {
    const { wrapper } = await renderView();
    const deleteLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    expect(deleteLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('should open the ACSMS-MSG-024-004 confirmation dialog when 削除 is clicked', async () => {
    // COVERS: 機能定義 9.3 確認ダイアログ表示
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
      destroy: () => undefined,
      update: () => undefined,
    }));
    const { wrapper } = await renderView();

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    const args = confirmSpy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    const flat = JSON.stringify(args);
    expect(flat).toContain('このアカウントを削除してもよろしいですか');
  });

  it('should call removeAccount with the row account_id when delete is confirmed', async () => {
    // COVERS: 機能定義 9.4 「はい」→ DELETE call
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeAccount } = await import('@/api/account/account');
    vi.mocked(removeAccount).mockClear();

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(removeAccount).toHaveBeenCalled();
    expect(vi.mocked(removeAccount).mock.calls[0]?.[0]).toBe(1); // first row account_id
  });

  it('should display ACSMS-MSG-024-005 「削除しました。」 toast when delete succeeds', async () => {
    // COVERS: 機能定義 9.4 成功メッセージ
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    // Verb-only convention — useNotify().deleted() emits '削除しました。'.
    // ACSMS-MSG-024-005 matches the verb-only literal.
    expect(successSpy).toHaveBeenCalledWith('削除しました。');
  });

  it('should reload the account list when delete succeeds', async () => {
    // COVERS: 機能定義 9.4 検索結果一覧を再読込
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    const initialCalls = vi.mocked(listAccounts).mock.calls.length;

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(vi.mocked(listAccounts).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should NOT call removeAccount when the user cancels the confirm dialog', async () => {
    // COVERS: 機能定義 9.5 「いいえ」→ 何もしない
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeAccount } = await import('@/api/account/account');
    vi.mocked(removeAccount).mockClear();

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(removeAccount).not.toHaveBeenCalled();
  });

  it('should NOT show success toast when removeAccount rejects with 409 CONFLICT', async () => {
    // COVERS: 機能定義 9.2 紐づいている場合 → ACSMS-MSG-024-003
    // The global axios interceptor surfaces the BE message; the view
    // therefore MUST NOT also call message.success.
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeAccount } = await import('@/api/account/account');
    vi.mocked(removeAccount).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error_code: 'CONFLICT',
          message: '関連データが存在するため削除できません。',
        },
      },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });

  it('should NOT show success toast when removeAccount rejects with 500', async () => {
    // COVERS: 機能定義 9.6 システムエラー → ACSMS-MSG-024-002
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeAccount } = await import('@/api/account/account');
    vi.mocked(removeAccount).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 9. 権限チェック (機能定義 1.2 + メッセージ情報 ACSMS-MSG-024-006)
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — access control (機能定義 1.2)', () => {
  it('should NOT call listAccounts when the current user is NOT NICHINO_ADMIN', async () => {
    // COVERS: 機能定義 1.2 日農管理者のみアクセス可能
    await renderView({
      user: buildAuthUser({ role_code: 'CHUOKAI', role_id: 3, permissions: [] }),
    });
    const { listAccounts } = await import('@/api/account/account');
    expect(listAccounts).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-024-006 「アクセス権がありません。」 message when the current user is NOT NICHINO_ADMIN', async () => {
    // COVERS: メッセージ情報 ACSMS-MSG-024-006
    const { wrapper } = await renderView({
      user: buildAuthUser({ role_code: 'JA_HONTEN', role_id: 4, permissions: [] }),
    });
    expect(wrapper.text()).toContain('アクセス権がありません。');
  });
});

// ───────────────────────────────────────────────────────────────────────
// Empty-search guard — clicking 検索 with all filters blank must NOT call
// the list API (the initial load already showed the default list).
// 検索クリア remains the reset path. See useTableQuery.hasActiveFilters.
// ───────────────────────────────────────────────────────────────────────
describe('AccountsListView — empty 検索 is a no-op', () => {
  it('should NOT call listAccounts when 検索 is submitted with all filters empty', async () => {
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockClear(); // drop the onMounted fetch
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(listAccounts).not.toHaveBeenCalled();
  });

  it('should NOT call listAccounts when 検索クリア is clicked on a pristine screen', async () => {
    const { wrapper } = await renderView();
    const { listAccounts } = await import('@/api/account/account');
    vi.mocked(listAccounts).mockClear(); // drop the onMounted fetch
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();
    expect(listAccounts).not.toHaveBeenCalled();
  });
});

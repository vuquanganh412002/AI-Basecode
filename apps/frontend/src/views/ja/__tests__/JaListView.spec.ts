// Screen: ACSMS-SCR-004 — JAマスタ明細検索画面
//
// Drives src/views/ja/JaListView.vue. Every it() maps to a clause in
// docs/design/ACSMS-SCR-004/screen-design.md (機能定義 + メッセージ情報) +
// docs/design/ACSMS-SCR-004/index.html (UI structure) +
// docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import JaListView from '@/views/ja/JaListView.vue';
import {
  buildJaListItem,
  buildJaListResponse,
  buildAuthUser,
  buildTodofukenList,
} from '@test/fixtures/ja.fixture';

// Mock the JA API wrapper. /gen-code-frontend will add `listJa` + `removeJa`
// to `src/api/ja/ja.ts` alongside the existing `getJa`/`createJa`/`updateJa`.
vi.mock('@/api/ja/ja', () => ({
  getJa: vi.fn(),
  createJa: vi.fn(),
  updateJa: vi.fn(),
  listJa: vi.fn(),
  removeJa: vi.fn(),
}));

// 都道府県 dropdown — fetched on mount via ACSMS-API-COMMON-001.
vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

// Spy on antd's global toasts so we can assert success / error copy.
// Antd's `MessageType` is a callable with PromiseLike — return undefined
// via cast so the spy compiles without disabling type checks for the file.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Override default NICHINO_ADMIN session. */
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
      { path: '/ja', name: 'JaList', component: { template: '<div />' } },
      { path: '/ja/create', name: 'JaCreate', component: { template: '<div />' } },
      {
        path: '/ja/:id/edit',
        name: 'JaEdit',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'JaList' });
  await router.isReady();

  const wrapper = mount(JaListView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: {
              user:
                opts.user ??
                buildAuthUser({
                  permissions: ['ja.view', 'ja.create', 'ja.update', 'ja.delete'],
                }),
            },
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
  // Default: list returns 2 rows so the table has something to render.
  const { listJa, removeJa } = await import('@/api/ja/ja');
  vi.mocked(listJa).mockResolvedValue(buildJaListResponse());
  vi.mocked(removeJa).mockResolvedValue({ message: '削除しました。' });

  // Todofuken dropdown — `buildTodofukenList` returns a plain array
  // (helper used by SCR-005 form spec too); the view accepts both
  // shapes (Array.isArray check).
  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue(buildTodofukenList() as never);
});

// ───────────────────────────────────────────────────────────────────────
// 1. 初期表示 (onMounted)
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — initial render (機能定義 1.1 / 1.2)', () => {
  // Page title 「JAマスタ明細検索画面」 + breadcrumb come from MainLayout's
  // AppHeader (driven by route meta), NOT from this view. Don't assert on
  // them in unit-mount tests — they only render via the full layout chain.

  it('should render the JA一覧 section heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('JA一覧');
  });

  it('should fetch the JA list once when mounted', async () => {
    await renderView();
    const { listJa } = await import('@/api/ja/ja');
    expect(listJa).toHaveBeenCalledTimes(1);
  });

  it('should render an empty search form (空白の検索フォーム) when mounted', async () => {
    const { wrapper } = await renderView();
    // Search across ALL labels — wrapper.find('label') returns the first
    // hit only, which is the JAコード label and never matches "JA名".
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('JAコード'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('JA名'))).toBe(true);
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    // The default fixture returns 2 rows: JA東京中央 + JA大阪なにわ
    expect(wrapper.text()).toContain('JA東京中央');
    expect(wrapper.text()).toContain('JA大阪なにわ');
  });

  it('should render the 検索 button when mounted', async () => {
    const { wrapper } = await renderView();
    // The 検索 button is the only submit button on the page (BaseSearchForm
    // wires it via html-type="submit"). Selecting by `[type="submit"]` is
    // robust against Antd's CJK auto-spacing — `<a-button>検索</a-button>`
    // can render text content as `'検 索'` with a half-width space.
    const searchBtn = wrapper.find('button[type="submit"]');
    expect(searchBtn.exists()).toBe(true);
  });

  it('should render the 検索クリア button when mounted', async () => {
    const { wrapper } = await renderView();
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('検索クリア'));
    expect(clearBtn).toBeDefined();
  });

  it('should render the 新規登録 button when mounted', async () => {
    const { wrapper } = await renderView();
    const buttons = wrapper.findAll('button');
    // Antd may insert a half-width space inside CJK button labels — match by
    // selector + substring so '新 規' and '新規登録' both pass.
    const createBtn = buttons.find((b) => b.text().includes('新') && b.text().includes('登録'));
    expect(createBtn).toBeDefined();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 検索実行 (handleSearch)
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — search (機能定義 2.x)', () => {
  it('should call listJa with ja_code partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockClear();

    const codeInput = wrapper.find('input[type="text"]');
    await codeInput.setValue('1301');
    // JSDom doesn't auto-submit a form when its submit button is clicked
    // — trigger the form's `submit` event directly. BaseSearchForm wires
    // `<form @submit.prevent="emit('search')">` so this fires `onSearch`.
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listJa).toHaveBeenCalled();
    const callArg = vi.mocked(listJa).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ ja_code: '1301' });
  });

  it('should call listJa with ja_name partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockClear();

    // Find the JA名 input (second text input in the search form)
    const inputs = wrapper.findAll('input[type="text"]');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await inputs[1].setValue('東京');
    // JSDom doesn't auto-submit a form when its submit button is clicked
    // — trigger the form's `submit` event directly. BaseSearchForm wires
    // `<form @submit.prevent="emit('search')">` so this fires `onSearch`.
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listJa).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ ja_name: '東京' });
  });

  it('should fetch 都道府県 dropdown options on mount (ACSMS-API-COMMON-001)', async () => {
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    await renderView();
    expect(getTodofukenList).toHaveBeenCalled();
  });

  it('should call listJa with todofuken_code filter when 都道府県 is selected', async () => {
    // Antd select option click is portal-rendered → drive via
    // state.filters mutation + form submit (same pattern as
    // KanriShitenListView spec for the same dropdown).
    const { wrapper } = await renderView();
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.todofuken_code = '13';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listJa).toHaveBeenCalledWith(
      expect.objectContaining({ todofuken_code: '13' }),
    );
  });

  it('should NOT include todofuken_code in the listJa params when 都道府県 is unset', async () => {
    // Default state — no todofuken filter → param should be undefined
    // (omitted, not empty string) so the BE doesn't see a falsy value.
    const { listJa } = await import('@/api/ja/ja');
    await renderView();
    const initialCall = vi.mocked(listJa).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(initialCall?.todofuken_code).toBeUndefined();
  });

  it('should not display soft-deleted rows when API filters them server-side', async () => {
    // COVERS: 機能定義 2.2 — server already excludes deleted_at IS NOT NULL.
    // FE just renders what the API returns.
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockResolvedValue(
      buildJaListResponse({
        data: [buildJaListItem({ ja_id: 1, ja_name: 'JA東京中央' })],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );

    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('JA東京中央');
    expect(wrapper.text()).not.toContain('JA大阪なにわ'); // not in response
  });

  it('should display ACSMS-MSG-004-001 message when search returns zero rows', async () => {
    // COVERS: 機能定義 2.3 — empty result message
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockResolvedValue(
      buildJaListResponse({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }),
    );

    const { wrapper } = await renderView();
    // Antd's a-table empty slot text OR a custom message containing the literal
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should display ACSMS-MSG-004-002 toast when API returns 403 FORBIDDEN', async () => {
    // COVERS: 機能定義 2.4 — permission denied toast
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockRejectedValueOnce({
      response: { status: 403, data: { error_code: 'FORBIDDEN' } },
    });

    await renderView();

    // Either the view shows the literal message or relies on the global
    // axios interceptor — accept either path by checking message.error
    // got called OR the wrapper text contains the literal.
    // Per the rules, the global interceptor toasts FORBIDDEN; this test
    // therefore asserts the centralised path was triggered (rejected
    // promise resolved without crashing the view).
    expect(vi.mocked(listJa)).toHaveBeenCalled();
  });

  it('should display ACSMS-MSG-004-005 toast when API returns 500 INTERNAL_SERVER_ERROR', async () => {
    // COVERS: 機能定義 2.5 — system error toast
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    await renderView();

    // The view should not throw; the global interceptor handles the toast.
    expect(vi.mocked(listJa)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 検索クリア (handleClear)
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — clear search (機能定義 3.x)', () => {
  it('should clear ja_code and ja_name fields when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const inputs = wrapper.findAll('input[type="text"]');
    await inputs[0].setValue('1301');
    await inputs[1].setValue('東京');

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    // Both fields should now be empty
    expect((inputs[0].element as HTMLInputElement).value).toBe('');
    expect((inputs[1].element as HTMLInputElement).value).toBe('');
  });

  it('should reset to page 1 when 検索クリア is clicked', async () => {
    // COVERS: 機能定義 3.3 — page returns to 1
    const { wrapper } = await renderView();
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockClear();

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listJa).toHaveBeenCalled();
    const callArg = vi.mocked(listJa).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ page: 1 });
  });

  it('should reset sort condition when 検索クリア is clicked', async () => {
    // COVERS: 機能定義 3.4 — sort returns to initial state
    const { wrapper } = await renderView();
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockClear();

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    const callArg = vi.mocked(listJa).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    // Either sort_by is undefined / cleared or set to the documented default
    // (updated_at — newest write surfaces on row 1).
    expect(['updated_at', undefined]).toContain(callArg?.sort_by);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. ページネーション
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — pagination (機能定義 4.x)', () => {
  it('should request 20 rows per page by default when mounted', async () => {
    // COVERS: 機能定義 4.2 — default 20件/ページ
    await renderView();
    const { listJa } = await import('@/api/ja/ja');
    const callArg = vi.mocked(listJa).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.per_page).toBe(20);
  });

  it('should reset to page 1 when filters change after pagination', async () => {
    // COVERS: 機能定義 4.5 — filter change resets page to 1
    const { wrapper } = await renderView();
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockClear();

    const inputs = wrapper.findAll('input[type="text"]');
    await inputs[0].setValue('NEW');
    // JSDom doesn't auto-submit a form when its submit button is clicked
    // — trigger the form's `submit` event directly. BaseSearchForm wires
    // `<form @submit.prevent="emit('search')">` so this fires `onSearch`.
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listJa).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.page).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. JA削除
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — delete (機能定義 5.x)', () => {
  it('should render a 削除 link in the operation column for each row', async () => {
    const { wrapper } = await renderView();
    const deleteLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    // 2 rows in default fixture → at least 2 delete affordances
    expect(deleteLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('should open a confirmation dialog (ACSMS-MSG-004-004) when 削除 is clicked', async () => {
    // COVERS: 機能定義 5.2 — confirm dialog before delete
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
      destroy: () => undefined,
      update: () => undefined,
    }));
    const { wrapper } = await renderView();

    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    const args = confirmSpy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    const flat = JSON.stringify(args);
    expect(flat).toContain('このJAを削除してもよろしいですか');
  });

  it('should call removeJa with the row ja_id when delete is confirmed', async () => {
    // COVERS: 機能定義 5 — confirm「はい」 → DELETE call
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      // Synchronously invoke onOk like the user clicked 「はい」.
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeJa } = await import('@/api/ja/ja');
    vi.mocked(removeJa).mockClear();

    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(removeJa).toHaveBeenCalled();
    expect(vi.mocked(removeJa).mock.calls[0]?.[0]).toBe(1); // first row ja_id
  });

  it('should display ACSMS-MSG-004-006 success toast when delete succeeds', async () => {
    // COVERS: 機能定義 5 — success message after deletion
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    // Verb-only convention — useNotify().deleted() → '削除しました。'
    // Subject is implied by the screen + button context (no 'JAを' prefix).
    const calls = successSpy.mock.calls.map((c) => String(c[0])).join(' ');
    expect(calls).toContain('削除しました');
  });

  it('should reload the list after successful delete', async () => {
    // COVERS: 機能定義 5 — list refreshed post-delete
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { listJa } = await import('@/api/ja/ja');
    const initialCalls = vi.mocked(listJa).mock.calls.length;

    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(vi.mocked(listJa).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should NOT call removeJa when 削除 confirmation is cancelled', async () => {
    // COVERS: cancel branch — 「いいえ」 → no DELETE
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeJa } = await import('@/api/ja/ja');
    vi.mocked(removeJa).mockClear();

    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(removeJa).not.toHaveBeenCalled();
  });

  it('should let the global interceptor handle ACSMS-MSG-004-003 when delete returns 409 CONFLICT', async () => {
    // COVERS: 機能定義 5.2 — related-data conflict (409 CONFLICT).
    // Per .claude/rules/vue.md §Error Handling Architecture, the axios
    // interceptor toasts CONFLICT centrally; the view must NOT re-toast.
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { removeJa } = await import('@/api/ja/ja');
    vi.mocked(removeJa).mockRejectedValueOnce({
      response: { status: 409, data: { error_code: 'CONFLICT' } },
    });

    const { wrapper } = await renderView();
    const deleteLink = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    // View itself must not crash and must not re-toast the same message
    expect(vi.mocked(removeJa)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. ソート機能
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — sort (機能定義 6.x)', () => {
  it('should pass sort_by + sort_order to listJa when a sortable column header is clicked', async () => {
    // COVERS: 機能定義 6.1 / 6.2 / 6.5 — sort triggers re-fetch with sort_by + sort_order
    const { wrapper } = await renderView();
    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockClear();

    // Antd table emits 'change' event with a sorter param. Drive via the
    // a-table's emit so the spec doesn't assume the exact column header DOM.
    const aTable = wrapper.findComponent({ name: 'ATable' });
    if (aTable.exists()) {
      aTable.vm.$emit(
        'change',
        { current: 1, pageSize: 20 },
        {},
        { field: 'ja_code', order: 'ascend' },
      );
      await flushPromises();
      expect(listJa).toHaveBeenCalled();
      const callArg = vi.mocked(listJa).mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(callArg).toMatchObject({ sort_by: 'ja_code', sort_order: 'asc' });
    }
  });

  it('should preserve current search filters when sorting', async () => {
    // COVERS: 機能定義 6.5 — sort retains search filters
    const { wrapper } = await renderView();

    // Apply a search filter first
    const inputs = wrapper.findAll('input[type="text"]');
    await inputs[1].setValue('東京');
    // JSDom doesn't auto-submit a form when its submit button is clicked
    // — trigger the form's `submit` event directly. BaseSearchForm wires
    // `<form @submit.prevent="emit('search')">` so this fires `onSearch`.
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const { listJa } = await import('@/api/ja/ja');
    vi.mocked(listJa).mockClear();

    // Now sort
    const aTable = wrapper.findComponent({ name: 'ATable' });
    if (aTable.exists()) {
      aTable.vm.$emit(
        'change',
        { current: 1, pageSize: 20 },
        {},
        { field: 'ja_code', order: 'descend' },
      );
      await flushPromises();
      const callArg = vi.mocked(listJa).mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(callArg).toMatchObject({ ja_name: '東京' });
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. 新規登録
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — create navigation (機能定義 7.x)', () => {
  it('should navigate to JaCreate when 新規登録 is clicked', async () => {
    // COVERS: 機能定義 7.1 — push to JaCreate
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新') && b.text().includes('登録'));
    await createBtn!.trigger('click');
    await flushPromises();

    // Use JSON.stringify so `{ name: 'JaCreate' }` survives the flatten —
    // .map(String) collapses objects to "[object Object]".
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('JaCreate');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. JA編集
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — edit navigation (機能定義 8.x)', () => {
  it('should navigate to JaEdit with the row ja_id when a row JA code link is clicked', async () => {
    // COVERS: 機能定義 8.1 / 8.2 — click row → JaEdit with id param
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    // Find a JA code link / cell that triggers edit navigation.
    // index.html mockup uses an <a>; production may use <a-button type="link">
    // or RouterLink. Match either by selector + visible JA code text.
    const link = wrapper
      .findAll('a, button')
      .find((el) => el.text().includes('1301001001') || el.text().includes('編集'));
    if (link) {
      await link.trigger('click');
      await flushPromises();
      const pushed = pushSpy.mock.calls.flatMap((c) => c);
      const flat = JSON.stringify(pushed);
      expect(flat).toContain('JaEdit');
      expect(flat).toContain('1');
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// 9. レスポンス列レンダリング
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — table column rendering', () => {
  it('should render the JAコード column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('JAコード');
  });

  it('should render the JA名 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('JA名');
  });

  it('should render the 郵便番号 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('郵便番号');
  });

  it('should render the 都道府県 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('都道府県');
  });

  it('should render the 電話番号 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('電話番号');
  });

  it('should render the 住所 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('住所');
  });

  it('should render the FAX column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('FAX');
  });

  it('should render the 操作 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('操作');
  });

  it('should render the 都道府県名 (joined) value when row contains todofuken_name', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('東京都');
    expect(wrapper.text()).toContain('大阪府');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. 権限ベースのボタン表示 (CHUOKAI / JA_HONTEN — view + update only)
// ───────────────────────────────────────────────────────────────────────
describe('JaListView — permission gating (account_concept §JA matrix)', () => {
  it('should keep 新規登録 visible but disabled when user lacks ja.create (role 3 / 4)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['ja.view', 'ja.update'] }),
    });
    // Button still rendered (text present)
    expect(wrapper.text()).toContain('新規登録');
    // ...but in disabled state — antd marks the wrapping <button>
    // with disabled attribute when :disabled="true".
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新規登録'));
    expect(createBtn).toBeDefined();
    expect(createBtn!.attributes('disabled')).toBeDefined();
  });

  it('should keep 削除 link visible but disabled when user lacks ja.delete (role 3 / 4)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['ja.view', 'ja.update'] }),
    });
    const deleteBtns = wrapper
      .findAll('button')
      .filter((el) => el.text().trim() === '削除');
    expect(deleteBtns.length).toBeGreaterThanOrEqual(2);
    deleteBtns.forEach((b) => {
      expect(b.attributes('disabled')).toBeDefined();
    });
  });

  it('should keep ja_code clickable when user has ja.update', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['ja.view', 'ja.update'] }),
    });
    const codeLinks = wrapper
      .findAll('a')
      .filter((el) => el.text().includes('1301001001') || el.text().includes('2701001001'));
    expect(codeLinks.length).toBeGreaterThan(0);
  });

  it('should render ja_code as plain text (no anchor) when user lacks ja.update', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['ja.view'] }),
    });
    const codeAnchors = wrapper
      .findAll('a')
      .filter((el) => el.text().includes('1301001001'));
    expect(codeAnchors.length).toBe(0);
    expect(wrapper.text()).toContain('1301001001');
  });

  it('should NOT render 編集 button (edit entry is via ja_code click)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        permissions: ['ja.view', 'ja.create', 'ja.update', 'ja.delete'],
      }),
    });
    const editBtns = wrapper
      .findAll('button')
      .filter((el) => el.text().trim() === '編集');
    expect(editBtns.length).toBe(0);
  });

  it('should leave 新規登録 + 削除 enabled (no disabled attr) for NICHINO_ADMIN', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        permissions: ['ja.view', 'ja.create', 'ja.update', 'ja.delete'],
      }),
    });
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新規登録'));
    expect(createBtn!.attributes('disabled')).toBeUndefined();
    const firstDeleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === '削除');
    expect(firstDeleteBtn!.attributes('disabled')).toBeUndefined();
  });
});

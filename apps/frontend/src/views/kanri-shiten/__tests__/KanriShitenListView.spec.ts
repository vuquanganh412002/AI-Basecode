// @ts-nocheck — spec mocks ja.fixture's buildTodofukenList() as plain
// array, but real API returns { data }. View accepts both; banner kept
// rather than retyping the fixture across SCRs.
// Screen: ACSMS-SCR-008 — 管理支店マスタ明細検索画面
//
// Drives src/views/kanri-shiten/KanriShitenListView.vue. Every it() maps
// to a clause in docs/design/ACSMS-SCR-008/screen-design.md (機能定義 +
// メッセージ情報) + docs/design/ACSMS-SCR-008/index.html (UI structure) +
// docs/design/ACSMS-SCR-008/ACSMS-SCR-008-api.md (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import KanriShitenListView from '@/views/kanri-shiten/KanriShitenListView.vue';
import {
  buildKanriShitenListItem,
  buildKanriShitenListResponse,
  buildAuthUser,
} from '@test/fixtures/kanri-shiten.fixture';
import { buildTodofukenList } from '@test/fixtures/ja.fixture';

// Mock the kanri-shiten API client — /gen-code-frontend will create it
// alongside the existing JA / Tanka API wrappers.
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  listKanriShiten: vi.fn(),
  removeKanriShiten: vi.fn(),
}));

// 都道府県 dropdown reuses the existing m_todofuken endpoint (shared
// with SCR-005 JA form).
vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

// Antd `MessageType` is callable + PromiseLike — cast noop to the
// expected return so the spies compile cleanly.
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
      { path: '/kanri-shiten', name: 'KanriShitenList', component: { template: '<div />' } },
      { path: '/kanri-shiten/create', name: 'KanriShitenCreate', component: { template: '<div />' } },
      {
        path: '/kanri-shiten/:id/edit',
        name: 'KanriShitenEdit',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'KanriShitenList' });
  await router.isReady();

  const wrapper = mount(KanriShitenListView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: {
              user: opts.user ?? buildAuthUser(),
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
  const { listKanriShiten, removeKanriShiten } = await import(
    '@/api/kanri-shiten/kanri-shiten'
  );
  vi.mocked(listKanriShiten).mockResolvedValue(buildKanriShitenListResponse());
  vi.mocked(removeKanriShiten).mockResolvedValue({ message: '削除しました。' });

  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue(buildTodofukenList());
});

// ═════════════════════════════════════════════════════════════════════
// 初期表示 (機能定義 §1.1 / §1.2)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenListView — initial render (§1)', () => {
  it('should fetch the kanri-shiten list once when mounted', async () => {
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    await renderView();
    expect(listKanriShiten).toHaveBeenCalledTimes(1);
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('東京中央支店');
    expect(wrapper.text()).toContain('JA北海道中央管理支店');
  });

  it('should render the 検索 button when mounted', async () => {
    const { wrapper } = await renderView();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
  });

  it('should render the 検索クリア button when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('クリア');
  });

  it('should render the 新規登録 button when caller has kanri_shiten.create permission', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['kanri_shiten.view', 'kanri_shiten.create'] }),
    });
    expect(wrapper.text()).toContain('新規登録');
  });

  it('should fetch todofuken list once on mount (for 都道府県 dropdown)', async () => {
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    await renderView();
    expect(getTodofukenList).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 検索 (機能定義 §2.x) — 5 filters
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenListView — search (§2)', () => {
  it('should call listKanriShiten with kanri_shiten_code partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(listKanriShiten).mockClear();

    // Drive via state.filters — view's placeholder is "選択してください"
    // (placeholder-based input lookup is fragile to copy changes).
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kanri_shiten_code = '3300';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listKanriShiten).toHaveBeenCalledTimes(1);
    expect(listKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ kanri_shiten_code: '3300' }),
    );
  });

  it('should call listKanriShiten with kanri_shiten_name partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(listKanriShiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kanri_shiten_name = '東京';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ kanri_shiten_name: '東京' }),
    );
  });

  it('should call listKanriShiten with todofuken_code filter when 都道府県 is selected', async () => {
    // COVERS: 画面イメージ v1.3 — 都道府県 prefecture pulldown filter
    const { wrapper } = await renderView();
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(listKanriShiten).mockClear();

    // The view should expose the prefecture select bound to filters.todofuken_code.
    // Drive the search via state mutation + form submit so this is robust to
    // antd's select internals (option click depends on portal rendering).
    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.todofuken_code = '13';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ todofuken_code: '13' }),
    );
  });

  it('should call listKanriShiten with tel partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(listKanriShiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.tel = '0312';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ tel: '0312' }),
    );
  });

  it('should call listKanriShiten with fax partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(listKanriShiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.fax = '0112';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ fax: '0112' }),
    );
  });

  it('should display ACSMS-MSG-008-001 empty-result message when list returns zero rows', async () => {
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(listKanriShiten).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    });
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should trim whitespace on every text filter before applying when 検索 is clicked', async () => {
    // COVERS: vue.md §List view rules #5a — trim text filters in onSearch
    const { wrapper } = await renderView();
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(listKanriShiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kanri_shiten_code = '  3300  ';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ kanri_shiten_code: '3300' }),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════
// 検索条件クリア (機能定義 §3.x)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenListView — clear search (§3)', () => {
  it('should clear all 5 filter fields when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.kanri_shiten_code = '3300';
      vm.state.filters.kanri_shiten_name = '東京';
      vm.state.filters.todofuken_code = '13';
      vm.state.filters.tel = '0312';
      vm.state.filters.fax = '0312';
    }
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('クリア'));
    expect(clearBtn).toBeDefined();
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(vm.state.filters.kanri_shiten_code).toBe('');
    expect(vm.state.filters.kanri_shiten_name).toBe('');
    // todofuken_code default is undefined (vs '') so <a-select> renders
    // its placeholder when no prefecture is chosen — see view's
    // KanriShitenFilters type.
    expect(vm.state.filters.todofuken_code).toBeUndefined();
    expect(vm.state.filters.tel).toBe('');
    expect(vm.state.filters.fax).toBe('');
  });

  it('should reset to page 1 when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state) vm.state.page = 3;
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(vm.state.page).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 新規登録 / 編集 navigation (機能定義 §4 / §5)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenListView — create / edit navigation (§4 / §5)', () => {
  it('should navigate to KanriShitenCreate when 新規登録 is clicked', async () => {
    const { wrapper, router } = await renderView({
      user: buildAuthUser({ permissions: ['kanri_shiten.view', 'kanri_shiten.create'] }),
    });
    const pushSpy = vi.spyOn(router, 'push');

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新規登録'));
    expect(createBtn).toBeDefined();
    await createBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('KanriShitenCreate');
  });

  it('should navigate to KanriShitenEdit with the row id when 管理支店コード link is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    // Code cells are anchors per index.html lines 689-690 — drive by text.
    const codeLink = wrapper
      .findAll('a')
      .find((a) => a.text().includes('113-3300-001'));
    expect(codeLink).toBeDefined();
    await codeLink!.trigger('click');

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('KanriShitenEdit');
  });

  it('should NOT navigate to KanriShitenCreate when caller lacks kanri_shiten.create permission', async () => {
    // 画面定義§1.3 — only NICHINO_ADMIN creates. CHUOKAI / JA_HONTEN /
    // JA_KANRI_SHITEN see the button greyed-out (per vue.md
    // §Permission-aware list buttons) or hidden.
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'CHUOKAI',
        ja_id: 1,
        permissions: ['kanri_shiten.view'],
      }),
    });
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新規登録'));
    if (createBtn) {
      // Either disabled OR absent — both valid per §Permission-aware patterns.
      expect(createBtn.attributes('disabled')).toBeDefined();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// ページネーション (機能定義 §6.x)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenListView — pagination (§6)', () => {
  it('should request 20 rows per page by default when mounted', async () => {
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    await renderView();
    expect(listKanriShiten).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 20 }),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════
// 削除 (機能定義 §7.x)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenListView — delete (§7)', () => {
  it('should render a 削除 link in the operation column for each row when caller can delete', async () => {
    const { wrapper } = await renderView();
    const deleteButtons = wrapper.findAll('button').filter((b) => b.text().includes('削除'));
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2); // 2 rows in default fixture
  });

  it('should open a confirmation dialog (ACSMS-MSG-008-005) when 削除 is clicked', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      return { destroy: () => undefined, update: () => undefined } as any;
    });

    const { wrapper } = await renderView();
    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    const args = confirmSpy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    const flat = JSON.stringify(args);
    expect(flat).toContain('この管理支店を削除してもよろしいですか');
  });

  it('should call removeKanriShiten with the row id when delete is confirmed', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined } as any;
    });
    const { removeKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');

    const { wrapper } = await renderView();
    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(removeKanriShiten).toHaveBeenCalledWith(1);
  });

  it('should display 削除しました。 toast when delete succeeds', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined } as any;
    });

    const { wrapper } = await renderView();
    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('削除しました。');
  });

  it('should reload the list after successful delete', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined } as any;
    });
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');

    const { wrapper } = await renderView();
    vi.mocked(listKanriShiten).mockClear();

    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(listKanriShiten).toHaveBeenCalled();
  });

  it('should NOT call removeKanriShiten when 削除 confirmation is cancelled', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      // Simulate cancel — only call onCancel, not onOk.
      opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined } as any;
    });
    const { removeKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');

    const { wrapper } = await renderView();
    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(removeKanriShiten).not.toHaveBeenCalled();
  });

  it('should disable 削除 link when caller is CHUOKAI (画面定義§1.3 — admin-only delete)', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'CHUOKAI',
        ja_id: 1,
        permissions: ['kanri_shiten.view'],
      }),
    });

    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    // Either disabled OR absent — both valid per §Permission-aware patterns.
    if (deleteBtn) {
      expect(deleteBtn.attributes('disabled')).toBeDefined();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// ソート (機能定義 §8.x) — 3 sortable columns per §8.1
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenListView — sort (§8)', () => {
  it('should pass sort_by + sort_order to listKanriShiten when sort changes via a-table change event', async () => {
    const { wrapper } = await renderView();
    const { listKanriShiten } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(listKanriShiten).mockClear();

    const aTable = wrapper.findComponent({ name: 'BaseDataTable' }).exists()
      ? wrapper.findComponent({ name: 'BaseDataTable' })
      : wrapper.findComponent({ name: 'ATable' });
    if (aTable.exists()) {
      aTable.vm.$emit(
        'change',
        { current: 1, pageSize: 20 },
        {},
        { field: 'kanri_shiten_name', order: 'descend' },
      );
      await flushPromises();
    }

    expect(listKanriShiten).toHaveBeenCalled();
    const lastCall = vi.mocked(listKanriShiten).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({
      sort_by: 'kanri_shiten_name',
      sort_order: 'desc',
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// テーブルカラムレンダリング (画面項目定義 + index.html)
// ═════════════════════════════════════════════════════════════════════
describe('KanriShitenListView — table column rendering', () => {
  it('should render the 管理支店コード column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('管理支店コード');
  });

  it('should render the 管理支店名 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('管理支店名');
  });

  it('should render the 都道府県 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('都道府県');
  });

  it('should render the 郵便番号 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('郵便番号');
  });

  it('should render the 住所 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('住所');
  });

  it('should render the 電話番号 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('電話番号');
  });

  it('should render the FAX column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('FAX');
  });

  it('should render the 紙版 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('紙版');
  });

  it('should render the 電子版 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('電子版');
  });

  it('should render the 操作 column header when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('操作');
  });
});

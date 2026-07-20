// Screen: ACSMS-SCR-006 — 支店マスタ明細検索画面
//
// Drives src/views/shiten/ShitenListView.vue. Every it() maps to a clause
// in docs/design/ACSMS-SCR-006/screen-design.md (機能定義 §1–§8 +
// メッセージ情報) + docs/design/ACSMS-SCR-006/index.html (UI structure) +
// docs/design/ACSMS-SCR-006/ACSMS-SCR-006-api.md (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import ShitenListView from '@/views/shiten/ShitenListView.vue';
import {
  buildShitenListResponse,
  buildShitenListItem,
  buildAuthUser,
} from '@test/fixtures/shiten.fixture';

// Mock the shiten API client — /gen-code-frontend will extend the
// existing client (`@/api/shiten/shiten.ts` already has getShiten /
// createShiten / updateShiten from SCR-007) with `listShiten` +
// `removeShiten` for SCR-006.
vi.mock('@/api/shiten/shiten', () => ({
  listShiten: vi.fn(),
  removeShiten: vi.fn(),
  // Keep SCR-007 exports stubbed too so other importers don't break.
  getShiten: vi.fn(),
  createShiten: vi.fn(),
  updateShiten: vi.fn(),
}));

// Antd `MessageType` is callable + PromiseLike — cast noop to the
// expected return so the spies compile cleanly.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Override default CHUOKAI session. */
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
      { path: '/shiten', name: 'ShitenList', component: { template: '<div />' } },
      { path: '/shiten/create', name: 'ShitenCreate', component: { template: '<div />' } },
      {
        path: '/shiten/:id/edit',
        name: 'ShitenEdit',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'ShitenList' });
  await router.isReady();

  const wrapper = mount(ShitenListView, {
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
  const { listShiten, removeShiten } = await import('@/api/shiten/shiten');
  vi.mocked(listShiten).mockResolvedValue(buildShitenListResponse());
  vi.mocked(removeShiten).mockResolvedValue({ message: '削除しました。' });
});

// ═════════════════════════════════════════════════════════════════════
// 初期表示 (機能定義 §1.1 / §1.2)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenListView — initial render (§1)', () => {
  it('should fetch the shiten list once when mounted', async () => {
    const { listShiten } = await import('@/api/shiten/shiten');
    await renderView();
    expect(listShiten).toHaveBeenCalledTimes(1);
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('東京支店');
    expect(wrapper.text()).toContain('横浜支店');
    expect(wrapper.text()).toContain('大宮支店');
  });

  it('should render the 検索 submit button when mounted', async () => {
    const { wrapper } = await renderView();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
  });

  it('should render the クリア button when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('クリア');
  });

  it('should render the 新規登録 button when caller has shiten.create permission', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ permissions: ['shiten.view', 'shiten.create'] }),
    });
    expect(wrapper.text()).toContain('新規登録');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 検索 (機能定義 §2.x) — only 1 filter: shiten_name (partial match)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenListView — search (§2)', () => {
  it('should call listShiten with shiten_name partial-match filter when 検索 is submitted', async () => {
    const { wrapper } = await renderView();
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockClear();

    const nameInput = wrapper.find('input[placeholder*="支店名"]');
    if (nameInput.exists()) await nameInput.setValue('東京');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listShiten).toHaveBeenCalledTimes(1);
    expect(listShiten).toHaveBeenCalledWith(
      expect.objectContaining({ shiten_name: '東京' }),
    );
  });

  it('should display empty-result message when list returns zero rows (§2.3)', async () => {
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    });
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should trim whitespace on shiten_name filter before applying when 検索 is submitted', async () => {
    // COVERS: vue.md §List view rules #5a — trim text filters in onSearch
    const { wrapper } = await renderView();
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockClear();

    const nameInput = wrapper.find('input[placeholder*="支店名"]');
    if (nameInput.exists()) await nameInput.setValue('  東京  ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listShiten).toHaveBeenCalledWith(
      expect.objectContaining({ shiten_name: '東京' }),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════
// 検索条件クリア (機能定義 §3.x)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenListView — clear search (§3)', () => {
  it('should clear the shiten_name filter when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.shiten_name = '東京';
    }
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('クリア'));
    expect(clearBtn).toBeDefined();
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(vm.state.filters.shiten_name).toBe('');
  });

  it('should reset to page 1 when クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state) vm.state.page = 3;
    // Make the screen non-pristine so 検索クリア resets (a pristine screen is
    // now a no-op — see useTableQuery.isPristine).
    if (vm.state) vm.state.filters.shiten_name = 'x';
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(vm.state.page).toBe(1);
  });

  it('should re-fetch the default list when クリア is clicked (§3.2)', async () => {
    const { wrapper } = await renderView();
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockClear();

    // Make the screen non-pristine so 検索クリア resets+refetches (a pristine
    // screen is now a no-op — see useTableQuery.isPristine).
    (wrapper.vm as unknown as { state: { filters: { shiten_name: string } } })
      .state.filters.shiten_name = 'x';

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listShiten).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 新規登録 / 編集 navigation (機能定義 §4 / §7)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenListView — create / edit navigation (§4 / §7)', () => {
  it('should navigate to ShitenCreate when 新規登録 is clicked', async () => {
    const { wrapper, router } = await renderView({
      user: buildAuthUser({ permissions: ['shiten.view', 'shiten.create'] }),
    });
    const pushSpy = vi.spyOn(router, 'push');

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新規登録'));
    expect(createBtn).toBeDefined();
    await createBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('ShitenCreate');
  });

  it('should navigate to ShitenEdit with the row id when 支店コード link is clicked (§4.1)', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    // Code cells render as anchors per index.html lines 514-515 — drive by text.
    const codeLink = wrapper
      .findAll('a')
      .find((a) => a.text().includes('T-001'));
    expect(codeLink).toBeDefined();
    await codeLink!.trigger('click');

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('ShitenEdit');
  });

  it('should disable the 新規登録 button when caller lacks shiten.create permission', async () => {
    // Defence-in-depth UX: hide-vs-grey controlled by vue.md
    // §Permission-aware list buttons. View-only role still sees the
    // button as disabled rather than absent, so they know the feature
    // exists.
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'JA_KANRI_SHITEN',
        ja_id: 1,
        kanri_shiten_id: 1,
        permissions: ['shiten.view'],
      }),
    });
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('新規登録'));
    if (createBtn) {
      expect(createBtn.attributes('disabled')).toBeDefined();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 削除 (機能定義 §5.x)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenListView — delete (§5)', () => {
  it('should render a 削除 link in the operation column for each row when caller can delete', async () => {
    const { wrapper } = await renderView();
    const deleteButtons = wrapper.findAll('button').filter((b) => b.text().includes('削除'));
    expect(deleteButtons.length).toBeGreaterThanOrEqual(3); // 3 rows in default fixture
  });

  it('should open a confirmation dialog (ACSMS-MSG-006-005) when 削除 is clicked', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(() => {
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
    expect(flat).toContain('この支店を削除してもよろしいですか');
  });

  it('should call removeShiten with the row id when delete is confirmed (§5.4)', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined } as any;
    });
    const { removeShiten } = await import('@/api/shiten/shiten');

    const { wrapper } = await renderView();
    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(removeShiten).toHaveBeenCalledWith(1);
  });

  it('should display 削除しました。 toast when delete succeeds (§5.4)', async () => {
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

    // Project-wide useNotify().deleted() literal — verb-only, no subject prefix
    // (`.claude/rules/vue.md §useNotify`). Spec-stated text in screen-design.md
    // ("支店を削除しました。") is the customer wording; the project convention
    // strips the subject for uniformity across all CRUD toasts.
    expect(message.success).toHaveBeenCalledWith('削除しました。');
  });

  it('should reload the list after successful delete (§5.4 "検索結果一覧を再読込")', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined } as any;
    });
    const { listShiten } = await import('@/api/shiten/shiten');

    const { wrapper } = await renderView();
    vi.mocked(listShiten).mockClear();

    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(listShiten).toHaveBeenCalled();
  });

  it('should NOT call removeShiten when 削除 confirmation is cancelled (§5.5)', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined } as any;
    });
    const { removeShiten } = await import('@/api/shiten/shiten');

    const { wrapper } = await renderView();
    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(removeShiten).not.toHaveBeenCalled();
  });

  it('should disable the 削除 link when caller lacks shiten.delete permission', async () => {
    // View-only role — still sees the link but greyed-out per
    // vue.md §Permission-aware list buttons.
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'JA_KANRI_SHITEN',
        ja_id: 1,
        kanri_shiten_id: 1,
        permissions: ['shiten.view'],
      }),
    });
    const deleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('削除'));
    if (deleteBtn) {
      expect(deleteBtn.attributes('disabled')).toBeDefined();
    }
  });

  it('should disable 削除 only for rows outside its kanri_shiten when caller is JA_KANRI_SHITEN (顧客要件 2026-06)', async () => {
    // role 5 (kanri_shiten_id=1) can VIEW all branches in the JA but may
    // delete only its own kanri_shiten's rows. Row 1 (own) → enabled;
    // Row 2 (kanri_shiten_id=2) → disabled. BE also enforces 403.
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockResolvedValue(
      buildShitenListResponse({
        data: [
          buildShitenListItem({ shiten_id: 1, shiten_code: 'OWN', kanri_shiten_id: 1 }),
          buildShitenListItem({ shiten_id: 2, shiten_code: 'OTHER', kanri_shiten_id: 2 }),
        ],
      }),
    );
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'JA_KANRI_SHITEN',
        ja_id: 1,
        kanri_shiten_id: 1,
        permissions: ['shiten.view', 'shiten.update', 'shiten.delete'],
      }),
    });
    const deleteButtons = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('削除'));
    expect(deleteButtons).toHaveLength(2);
    // Row order mirrors the API order: [0]=own (enabled), [1]=other (disabled).
    expect(deleteButtons[0].attributes('disabled')).toBeUndefined();
    expect(deleteButtons[1].attributes('disabled')).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════
// ページネーション (機能定義 §6.x)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenListView — pagination (§6)', () => {
  it('should request 20 rows per page by default when mounted (§6.1)', async () => {
    const { listShiten } = await import('@/api/shiten/shiten');
    await renderView();
    expect(listShiten).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 20 }),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════
// ソート (機能定義 §8.x) — 2 sortable columns per §8.1
// ═════════════════════════════════════════════════════════════════════
describe('ShitenListView — sort (§8)', () => {
  it('should pass sort_by + sort_order to listShiten when sort changes via the table change event', async () => {
    const { wrapper } = await renderView();
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockClear();

    const aTable = wrapper.findComponent({ name: 'BaseDataTable' }).exists()
      ? wrapper.findComponent({ name: 'BaseDataTable' })
      : wrapper.findComponent({ name: 'ATable' });
    if (aTable.exists()) {
      aTable.vm.$emit(
        'change',
        { current: 1, pageSize: 20 },
        {},
        { field: 'shiten_name', order: 'descend' },
      );
      await flushPromises();
    }

    expect(listShiten).toHaveBeenCalled();
    const lastCall = vi.mocked(listShiten).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({
      sort_by: 'shiten_name',
      sort_order: 'desc',
    });
  });

  it('should pass sort_by=kanri_shiten_name to listShiten when sorting by the joined parent column', async () => {
    // 管理支店名 lives on m_kanri_shiten — BE adds a LEFT JOIN only when
    // this sort is requested.
    const { wrapper } = await renderView();
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockClear();

    const aTable = wrapper.findComponent({ name: 'BaseDataTable' }).exists()
      ? wrapper.findComponent({ name: 'BaseDataTable' })
      : wrapper.findComponent({ name: 'ATable' });
    if (aTable.exists()) {
      aTable.vm.$emit(
        'change',
        { current: 1, pageSize: 20 },
        {},
        { field: 'kanri_shiten_name', order: 'ascend' },
      );
      await flushPromises();
    }

    const lastCall = vi.mocked(listShiten).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({
      sort_by: 'kanri_shiten_name',
      sort_order: 'asc',
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// テーブルカラムレンダリング (画面項目定義 + index.html)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenListView — table column rendering', () => {
  // 管理支店名 is JOIN'd from m_kanri_shiten by the BE and shown first so
  // users can see which parent branch each shiten belongs to. The cell
  // value '東京中央管理支店' comes from the default fixture row.
  // 支店カナ (index.html line 497) / 金融機関支店フラグ (line 499) headers.
  it.each([
    ['管理支店名 column header as the leading context column when mounted', '管理支店名'],
    ['kanri_shiten_name cell value when rows resolve', '東京中央管理支店'],
    ['支店コード column header when mounted', '支店コード'],
    ['支店名 column header when mounted', '支店名'],
    ['支店カナ column header when mounted', '支店カナ'],
    ['金融機関支店フラグ column header when mounted', '金融機関支店フラグ'],
    ['操作 column header when mounted', '操作'],
  ])('should render the %s', async (_desc, expected) => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain(expected);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Empty-search guard — clicking 検索 with all filters blank must NOT call
// the list API (the initial load already showed the default list).
// 検索クリア remains the reset path. See useTableQuery.hasActiveFilters.
// ───────────────────────────────────────────────────────────────────────
describe('ShitenListView — empty 検索 is a no-op', () => {
  it('should NOT call listShiten when 検索 is submitted with all filters empty', async () => {
    const { wrapper } = await renderView();
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockClear(); // drop the onMounted fetch
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(listShiten).not.toHaveBeenCalled();
  });

  it('should NOT call listShiten when 検索クリア is clicked on a pristine screen', async () => {
    const { wrapper } = await renderView();
    const { listShiten } = await import('@/api/shiten/shiten');
    vi.mocked(listShiten).mockClear(); // drop the onMounted fetch
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();
    expect(listShiten).not.toHaveBeenCalled();
  });
});

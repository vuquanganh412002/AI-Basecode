// Screen: ACSMS-SCR-018 — 販売店明細検索画面
//
// Drives src/views/hanbaiten/HanbaitenListView.vue. Every it() maps to a clause
// in docs/design/ACSMS-SCR-018/screen-design.md (機能定義 + メッセージ情報) +
// docs/design/ACSMS-SCR-018/index.html (UI structure) +
// docs/design/ACSMS-SCR-018/ACSMS-SCR-018-api.md (ACSMS-API-018-001 / 018-002).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import HanbaitenListView from '@/views/hanbaiten/HanbaitenListView.vue';
import {
  buildHanbaitenListResponse,
  buildAuthUser,
} from '@test/fixtures/hanbaiten.fixture';

// API wrapper for ACSMS-SCR-018 endpoints. /gen-code-frontend will create
// `src/api/hanbaiten/hanbaiten.ts` exporting these names.
vi.mock('@/api/hanbaiten/hanbaiten', () => ({
  listHanbaiten: vi.fn(),
  removeHanbaiten: vi.fn(),
  exportHanbaitenExcel: vi.fn(),
}));

// BaseJaDropdown calls /api/v1/ja/dropdown via getJaDropdown — stub it
// so the staff-path tests don't issue real network requests when
// mounting the dropdown card above the search form.
vi.mock('@/api/ja/ja', () => ({
  getJaDropdown: vi.fn().mockResolvedValue({
    data: [
      { ja_id: 7, ja_code: '0007', ja_name: 'JA 七つの郷' },
      { ja_id: 42, ja_code: '0042', ja_name: 'JA 四二農協' },
    ],
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  }),
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
  /** Override default JA_HONTEN session (for permission-gating paths). */
  user?: ReturnType<typeof buildAuthUser>;
  /** Initial URL query (e.g. ACSMS-SCR-021 deep-link ?inactive_tanka=1). */
  query?: Record<string, string>;
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
      { path: '/hanbaiten', name: 'HanbaitenList', component: { template: '<div />' } },
      {
        path: '/hanbaiten/create',
        name: 'HanbaitenCreate',
        component: { template: '<div />' },
      },
      {
        path: '/hanbaiten/:id/edit',
        name: 'HanbaitenEdit',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'HanbaitenList', query: opts.query });
  await router.isReady();

  const wrapper = mount(HanbaitenListView, {
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
  const { listHanbaiten, removeHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
  vi.mocked(listHanbaiten).mockResolvedValue(buildHanbaitenListResponse());
  vi.mocked(removeHanbaiten).mockResolvedValue({ message: '削除しました。' });
});

// ───────────────────────────────────────────────────────────────────────
// 1. 初期表示 (機能定義 1.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — initial render (機能定義 1.x)', () => {
  // Page title 「販売店明細検索画面」 + breadcrumb come from MainLayout's
  // AppHeader (driven by route meta), NOT this view. Don't assert page
  // title from inside the view spec.

  it('should render the 販売店一覧 section heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('販売店一覧');
  });

  it('should fetch the hanbaiten list once when mounted', async () => {
    await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    expect(listHanbaiten).toHaveBeenCalledTimes(1);
  });

  it('should render an empty search form (空白の検索フォーム) when mounted', async () => {
    const { wrapper } = await renderView();
    // Search across ALL labels — wrapper.find('label') returns the first
    // hit only, which masks "FAX" / "住所" / "所長名" labels.
    const labelTexts = wrapper.findAll('label').map((l) => l.text());
    expect(labelTexts.some((t) => t.includes('販売店コード'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('販売店名'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('電話番号'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('FAX'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('住所'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('所長名'))).toBe(true);
    expect(labelTexts.some((t) => t.includes('廃店を含む'))).toBe(true);
  });

  it('should render rows from the API response when list resolves', async () => {
    const { wrapper } = await renderView();
    // Default fixture returns 2 rows: 山田新聞販売店 (H001) + 山田書店 (H002).
    expect(wrapper.text()).toContain('山田新聞販売店');
    expect(wrapper.text()).toContain('山田書店');
    expect(wrapper.text()).toContain('H001');
    expect(wrapper.text()).toContain('H002');
  });

  it('should render the 検索 submit button when mounted', async () => {
    const { wrapper } = await renderView();
    // BaseSearchForm wires html-type="submit" on its one 検索 button.
    // Selecting by `[type="submit"]` is robust against Antd's CJK
    // auto-spacing (`検 索`).
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

  it('should render the 販売店情報登録 button when mounted', async () => {
    const { wrapper } = await renderView();
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('販売店情報登録'));
    expect(createBtn).toBeDefined();
  });

  it('should render the table column headers per v1.2 spec when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    // Headers per index.html + screen-design.md §検索結果テーブル
    expect(text).toContain('販売店コード');
    expect(text).toContain('販売店名');
    // JA column (code + name) inserted at position 3 (after 販売店名).
    expect(text).toContain('JA');
    expect(text).toContain('都道府県');
    expect(text).toContain('郵便番号');
    expect(text).toContain('住所');
    expect(text).toContain('電話番号');
    expect(text).toContain('FAX');
    expect(text).toContain('所長名');
    expect(text).toContain('委託区分');
    // v1.2 rename — 「配達手数料支払サイクル」 (旧「支払区分」)
    expect(text).toContain('配達手数料支払サイクル');
    // v1.2 rename — 「振込手数料負担区分」
    expect(text).toContain('振込手数料負担区分');
    // 振込手数料 column removed; 廃店フラグ column added in its place.
    expect(text).toContain('廃店フラグ');
    expect(text).toContain('操作');
  });

  it('should render the todofuken_name (joined) column value when row has it', async () => {
    // COVERS: ACSMS-API-018-001 v1.2 — m_todofuken LEFT JOIN provides
    // todofuken_name for the 都道府県 column.
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('東京都');
    expect(wrapper.text()).toContain('神奈川県');
  });

  it('should render the JA column with ja_code + ja_name from the joined m_ja row', async () => {
    const { wrapper } = await renderView();
    // Default fixture row carries ja_code='JA02001', ja_name='JA青森'.
    expect(wrapper.text()).toContain('JA02001');
    expect(wrapper.text()).toContain('JA青森');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 検索 (機能定義 2.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — search (機能定義 2.x)', () => {
  it('should call listHanbaiten with hanbaiten_code partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    // First text input is 販売店コード (per index.html field order).
    const codeInput = wrapper.findAll('input[type="text"]')[0];
    await codeInput.setValue('H001');
    // JSDom doesn't auto-submit on a button click — trigger the form's
    // submit event directly so BaseSearchForm's @submit fires.
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listHanbaiten).toHaveBeenCalled();
    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ hanbaiten_code: 'H001' });
  });

  it('should seed 有効単価フラグ=無効 (active_tanka_flg=false) on mount when the SCR-021 deep-link ?inactive_tanka=1 is present', async () => {
    // COVERS: ACSMS-SCR-021 error gate → 販売店明細検索 deep-link（顧客要件2026-07 改訂）
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();
    await renderView({ query: { inactive_tanka: '1' } });
    expect(listHanbaiten).toHaveBeenCalled();
    const arg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ active_tanka_flg: false });
  });

  it('should send active_tanka_flg=false when 有効単価フラグ=無効 is selected and submitted (失効単価参照)', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.active_tanka_flg = '0';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listHanbaiten).toHaveBeenCalled();
    const arg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ active_tanka_flg: false });
  });

  it('should send active_tanka_flg=true when 有効単価フラグ=有効 is selected and submitted (有効単価参照)', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.active_tanka_flg = '1';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const arg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ active_tanka_flg: true });
  });

  it('should NOT filter (active_tanka_flg undefined) when 有効単価フラグ is unselected (default mount call → 両方)', async () => {
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();
    await renderView();
    const arg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toBeDefined();
    // '' のとき toBoolean は undefined を返す（axios は undefined のクエリを送信しない）。
    expect(arg?.active_tanka_flg).toBeUndefined();
  });

  it('should call listHanbaiten with hanbaiten_name partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    const inputs = wrapper.findAll('input[type="text"]');
    // 販売店名 = second text input.
    await inputs[1].setValue('山田');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ hanbaiten_name: '山田' });
  });

  it('should call listHanbaiten with tel partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    // Drive via state mutation to avoid index-fragility on input order.
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.tel = '0312';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ tel: '0312' });
  });

  it('should call listHanbaiten with fax partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.fax = '0398';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ fax: '0398' });
  });

  it('should call listHanbaiten with address partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.address = '東京';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ address: '東京' });
  });

  it('should call listHanbaiten with shocho_name partial-match filter when 検索 is clicked', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.shocho_name = '山田';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ shocho_name: '山田' });
  });

  it('should default haiten_flg to false so 廃店 rows are excluded on mount', async () => {
    // COVERS: 顧客CR 2026-08-24 (revert of 2026-05-26 exact-match) —
    // inclusive semantic. Default (checkbox unchecked) sends
    // haiten_flg=false → BE excludes 廃店.
    await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.haiten_flg).toBe(false);
  });

  it('should send haiten_flg=true when 廃店を含む is checked (show both 営業中 and 廃店)', async () => {
    // COVERS: 顧客CR 2026-08-24 — checked = 廃店を含む全件表示 (NOT 廃店のみ).
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.haiten_flg = true;
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.haiten_flg).toBe(true);
  });

  it('should display ACSMS-MSG-018-001 「検索結果が見つかりませんでした。」 when search returns zero rows', async () => {
    // COVERS: 機能定義 2.4 検索結果なし
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockResolvedValue(
      buildHanbaitenListResponse({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }),
    );

    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should still call listHanbaiten when listHanbaiten rejects with 500 (interceptor handles toast)', async () => {
    // COVERS: 機能定義 2.6 システムエラー — ACSMS-MSG-018-003 via global interceptor.
    // View just clears local state; spec asserts the API was hit and no
    // unhandled rejection surfaced. See .claude/rules/vue.md §List view rule 5.
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    await renderView();
    expect(vi.mocked(listHanbaiten)).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 検索条件クリア (機能定義 3.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — clear search (機能定義 3.x)', () => {
  it('should clear hanbaiten_code field when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const codeInput = wrapper.findAll('input[type="text"]')[0];
    await codeInput.setValue('H001');

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect((codeInput.element as HTMLInputElement).value).toBe('');
  });

  it('should reset to page 1 when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    // Make the screen non-pristine so 検索クリア resets+refetches (a pristine
    // screen is now a no-op — see useTableQuery.isPristine).
    (wrapper.vm as unknown as { state: { filters: { hanbaiten_code: string } } })
      .state.filters.hanbaiten_code = 'x';

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listHanbaiten).toHaveBeenCalled();
    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ page: 1 });
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. 販売店編集 (機能定義 5.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — edit navigation (機能定義 5.x)', () => {
  it('should navigate to HanbaitenEdit when 販売店コード link is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    // 販売店コード rendered as an <a> link in the first column.
    const links = wrapper
      .findAll('a, button')
      .filter((el) => el.text().includes('H001'));
    expect(links.length).toBeGreaterThanOrEqual(1);
    await links[0].trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('HanbaitenEdit');
  });

  it('should pass the hanbaiten_id as :id route param when 販売店コード is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const links = wrapper
      .findAll('a, button')
      .filter((el) => el.text().includes('H001'));
    await links[0].trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    // hanbaiten_id = 1 for H001 per the default fixture.
    expect(pushed).toContain('"id":1');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. 新規登録 (機能定義 4.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — create navigation (機能定義 4.x)', () => {
  it('should navigate to HanbaitenCreate when 販売店情報登録 is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('販売店情報登録'));
    expect(createBtn).toBeDefined();
    await createBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('HanbaitenCreate');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. ページネーション (機能定義 6.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — pagination (機能定義 6.x)', () => {
  it('should request 20 rows per page by default when mounted', async () => {
    await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.per_page).toBe(20);
  });

  it('should reset to page 1 when search filters change after pagination', async () => {
    // COVERS: 機能定義 6 — フィルタ変更時、ページは1にリセット
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    const codeInput = wrapper.findAll('input[type="text"]')[0];
    await codeInput.setValue('NEW');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.page).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. ソート (機能定義 8.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — sort (機能定義 8.x)', () => {
  it('should default to sort_by=updated_at sort_order=desc (most-recently-touched first) when mounted', async () => {
    // Default landing order is most-recently-touched first so a freshly
    // created, imported OR updated 販売店 appears at the top. hanbaiten_code /
    // hanbaiten_name remain clickable column sorts (画面設計書 §8.1).
    await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg?.sort_by).toBe('updated_at');
    expect(callArg?.sort_order).toBe('desc');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. 販売店削除 (機能定義 7.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — delete (機能定義 7.x)', () => {
  it('should render a 削除 link in the 操作 column for each row when mounted', async () => {
    const { wrapper } = await renderView();
    const deleteLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    // 2 rows in default fixture → at least 2 削除 links.
    expect(deleteLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('should open the ACSMS-MSG-018-005 confirmation dialog when 削除 is clicked', async () => {
    // COVERS: 機能定義 7.3 確認ダイアログ表示
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
    // ACSMS-MSG-018-005: 「この販売店を削除してもよろしいですか？」
    expect(flat).toContain('この販売店を削除してもよろしいですか');
  });

  it('should call removeHanbaiten with the row hanbaiten_id when delete is confirmed', async () => {
    // COVERS: 機能定義 7.3 「はい」→ DELETE call
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(removeHanbaiten).mockClear();

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(removeHanbaiten).toHaveBeenCalled();
    expect(vi.mocked(removeHanbaiten).mock.calls[0]?.[0]).toBe(1); // first row hanbaiten_id
  });

  it('should display ACSMS-MSG-018-006 「削除しました。」 toast when delete succeeds', async () => {
    // COVERS: 機能定義 7.3 成功メッセージ — verb-only useNotify convention.
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

    // useNotify().deleted() emits '削除しました。' — verb-only,
    // matches ACSMS-MSG-018-006.
    expect(successSpy).toHaveBeenCalledWith('削除しました。');
  });

  it('should reload the hanbaiten list when delete succeeds', async () => {
    // COVERS: 機能定義 7.3 検索結果一覧を再読込
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    const initialCalls = vi.mocked(listHanbaiten).mock.calls.length;

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(vi.mocked(listHanbaiten).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should NOT call removeHanbaiten when the user cancels the confirm dialog', async () => {
    // COVERS: 機能定義 7.4 「いいえ」→ 何もしない
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(removeHanbaiten).mockClear();

    const deleteBtn = wrapper
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteBtn!.trigger('click');
    await flushPromises();

    expect(removeHanbaiten).not.toHaveBeenCalled();
  });

  it('should NOT show success toast when removeHanbaiten rejects with 409 CONFLICT (ACSMS-MSG-018-004)', async () => {
    // COVERS: 機能定義 7.2 紐づいている場合 → ACSMS-MSG-018-004 via interceptor.
    // The global axios interceptor surfaces the BE message; the view
    // therefore MUST NOT also call message.success.
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(removeHanbaiten).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error_code: 'CONFLICT',
          message: 'この販売店は関連オブジェクトに紐づいているため削除できません。',
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

  it('should NOT show success toast when removeHanbaiten rejects with 500', async () => {
    // COVERS: 機能定義 7.5 システムエラー → ACSMS-MSG-018-003 via interceptor.
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(removeHanbaiten).mockRejectedValueOnce({
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
// 9. 権限ベースのボタン表示 (seeder.md §3 hanbaiten matrix)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — permission gating (seeder.md §3)', () => {
  // NICHINO_STAFF holds hanbaiten.view but NOT hanbaiten.create/delete
  // (delegated to the 販売店代行入力 flow). Buttons stay visible-but-disabled
  // per project convention (`.claude/rules/vue.md §Permission-aware list buttons`).

  it('should keep 販売店情報登録 visible but disabled when user lacks hanbaiten.create', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'NICHINO_STAFF',
        role_id: 2,
        ja_id: null,
        permissions: ['hanbaiten.view', 'hanbaiten.update'],
      }),
    });
    expect(wrapper.text()).toContain('販売店情報登録');
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('販売店情報登録'));
    expect(createBtn).toBeDefined();
    expect(createBtn!.attributes('disabled')).toBeDefined();
  });

  it('should keep 削除 link visible but disabled when user lacks hanbaiten.delete', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'NICHINO_STAFF',
        role_id: 2,
        ja_id: null,
        permissions: ['hanbaiten.view', 'hanbaiten.update'],
      }),
    });
    const deleteBtns = wrapper
      .findAll('button')
      .filter((el) => el.text().trim() === '削除');
    expect(deleteBtns.length).toBeGreaterThanOrEqual(2);
    deleteBtns.forEach((b) => {
      expect(b.attributes('disabled')).toBeDefined();
    });
  });

  it('should leave 販売店情報登録 + 削除 enabled (no disabled attr) when JA_HONTEN has full perms', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        permissions: [
          'hanbaiten.view',
          'hanbaiten.create',
          'hanbaiten.update',
          'hanbaiten.delete',
        ],
      }),
    });
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('販売店情報登録'));
    expect(createBtn!.attributes('disabled')).toBeUndefined();
    const firstDeleteBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === '削除');
    expect(firstDeleteBtn).toBeDefined();
    expect(firstDeleteBtn!.attributes('disabled')).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────
// [staff-ja-filter] NICHINO_STAFF 代行入力 path
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — NICHINO_STAFF 代行入力 path', () => {
  const staffUser = () =>
    buildAuthUser({
      role_code: 'NICHINO_STAFF',
      role_id: 2,
      ja_id: null,
      permissions: ['hanbaiten.daiko_input'],
    });

  it('should render the JA filter card above the search form for staff', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    expect(
      wrapper.find('[data-test="hanbaiten-staff-ja-filter"]').exists(),
    ).toBe(true);
  });

  it('should NOT render the JA filter card for JA-scoped roles', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        role_code: 'JA_HONTEN',
        ja_id: 1,
        permissions: ['hanbaiten.view'],
      }),
    });
    expect(
      wrapper.find('[data-test="hanbaiten-staff-ja-filter"]').exists(),
    ).toBe(false);
  });

  it('should NOT fetch on mount for staff — JA is required, list starts empty', async () => {
    await renderView({ user: staffUser() });
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    // 機能: 代行検索は JA選択が前提 — no auto-load of every tenant.
    expect(listHanbaiten).not.toHaveBeenCalled();
  });

  it('should mark the staff JA filter as required and show no message initially', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    const jaCell = wrapper.find('[data-test="hanbaiten-staff-ja-filter"]');
    expect(jaCell.exists()).toBe(true);
    // Required marker present on the JA field.
    expect(jaCell.text()).toContain('*');
    // Initial state: empty list, no required error and no "no results"
    // message (no search has run yet — the * marker is the only hint).
    expect(wrapper.find('[data-test="hanbaiten-staff-ja-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="hanbaiten-empty-message"]').exists()).toBe(false);
  });

  it('should flag the JA field as required (必須項目です。) when staff runs 検索 without a JA', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();
    // Trigger the search form submit directly (jsdom doesn't auto-submit).
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(listHanbaiten).not.toHaveBeenCalled();
    const fieldError = wrapper.find('[data-test="hanbaiten-staff-ja-error"]');
    expect(fieldError.exists()).toBe(true);
    expect(fieldError.text()).toContain('必須項目です。');
  });

  it('should clear the JA required error once staff picks a JA', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('[data-test="hanbaiten-staff-ja-error"]').exists()).toBe(true);

    const dropdown = wrapper.findComponent({ name: 'BaseJaDropdown' });
    dropdown.vm.$emit('update:value', 7);
    await flushPromises();
    expect(wrapper.find('[data-test="hanbaiten-staff-ja-error"]').exists()).toBe(false);
  });

  it('should leave 販売店情報登録 button enabled for staff (JA is picked inside the form)', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('販売店情報登録'));
    expect(createBtn).toBeDefined();
    expect(createBtn!.attributes('disabled')).toBeUndefined();
  });

  it('should fetch list with ja_id once staff picks a JA from the dropdown', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear();

    // Drive the BaseJaDropdown's `update:value` event directly — the
    // view's onJaFilterChange handler doesn't depend on antd's internal
    // popup state, only on the emitted value.
    const dropdown = wrapper.findComponent({ name: 'BaseJaDropdown' });
    expect(dropdown.exists()).toBe(true);
    dropdown.vm.$emit('update:value', 7);
    await flushPromises();

    expect(listHanbaiten).toHaveBeenCalled();
    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(callArg?.ja_id).toBe(7);
  });

  it('should NOT send ja_id from JA-scoped roles (anti-spoof, BE binds session.ja_id)', async () => {
    await renderView({
      user: buildAuthUser({
        role_code: 'JA_HONTEN',
        ja_id: 1,
        permissions: ['hanbaiten.view'],
      }),
    });
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    const callArg = vi.mocked(listHanbaiten).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(callArg?.ja_id).toBeUndefined();
  });

  it('should forward the staff-selected ja_id to the create form via router history state', async () => {
    const { wrapper, router } = await renderView({ user: staffUser() });
    const pushSpy = vi.spyOn(router, 'push');

    // Staff picks a JA in the search filter → 販売店情報登録 carries it to
    // the create form via history state (no ?ja_id in the URL).
    const dropdown = wrapper.findComponent({ name: 'BaseJaDropdown' });
    dropdown.vm.$emit('update:value', 42);
    await flushPromises();

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('販売店情報登録'));
    await createBtn!.trigger('click');

    expect(pushSpy).toHaveBeenCalledWith({
      name: 'HanbaitenCreate',
      state: { jaId: 42 },
    });
  });

  it('should navigate without history state when staff opens create without a JA picked', async () => {
    const { wrapper, router } = await renderView({ user: staffUser() });
    const pushSpy = vi.spyOn(router, 'push');
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('販売店情報登録'));
    await createBtn!.trigger('click');
    expect(pushSpy).toHaveBeenCalledWith({ name: 'HanbaitenCreate' });
  });
});

// ───────────────────────────────────────────────────────────────────────
// Empty-search guard — clicking 検索 with all filters blank must NOT call
// the list API (the initial load already showed the default list).
// 検索クリア remains the reset path. See useTableQuery.hasActiveFilters.
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — empty 検索 is a no-op', () => {
  it('should NOT call listHanbaiten when 検索 is submitted with all filters empty', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear(); // drop the onMounted fetch
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(listHanbaiten).not.toHaveBeenCalled();
  });

  it('should NOT call listHanbaiten when 検索クリア is clicked on a pristine screen', async () => {
    const { wrapper } = await renderView();
    const { listHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(listHanbaiten).mockClear(); // drop the onMounted fetch
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();
    expect(listHanbaiten).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// Excel出力（顧客CR 2026-08-24）
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenListView — Excel出力', () => {
  it('should render the Excel出力 button when mounted', async () => {
    const { wrapper } = await renderView();
    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    expect(exportBtn).toBeDefined();
  });

  it('should call exportHanbaitenExcel with the current filter state (no page/sort) when Excel出力 is clicked', async () => {
    const { wrapper } = await renderView();
    const { exportHanbaitenExcel } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(exportHanbaitenExcel).mockClear();
    vi.mocked(exportHanbaitenExcel).mockResolvedValue(new Blob(['x']));

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.hanbaiten_code = 'H001';
      vm.state.filters.haiten_flg = true;
    }
    await flushPromises();

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    await exportBtn!.trigger('click');
    await flushPromises();

    expect(exportHanbaitenExcel).toHaveBeenCalled();
    const arg = vi.mocked(exportHanbaitenExcel).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ hanbaiten_code: 'H001', haiten_flg: true });
    expect(arg?.page).toBeUndefined();
    expect(arg?.per_page).toBeUndefined();
    expect(arg?.sort_by).toBeUndefined();
    expect(arg?.sort_order).toBeUndefined();
  });

  it('should show 「ダウンロードを開始しました。」 toast when export succeeds', async () => {
    const { exportHanbaitenExcel } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(exportHanbaitenExcel).mockResolvedValue(new Blob(['x']));
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    await exportBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('ダウンロードを開始しました。');
  });

  it('should show 「出力データがありません。」 toast when export rejects with 404 EXPORT_NO_DATA', async () => {
    const { exportHanbaitenExcel } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(exportHanbaitenExcel).mockRejectedValueOnce({
      response: {
        status: 404,
        data: { error_code: 'EXPORT_NO_DATA', message: '出力データがありません。' },
      },
    });
    const errorSpy = vi.spyOn(message, 'error');
    errorSpy.mockClear();

    const { wrapper } = await renderView();
    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    await exportBtn!.trigger('click');
    await flushPromises();

    const calls = errorSpy.mock.calls.map((c) => String(c[0])).join(' ');
    expect(calls).toContain('出力データがありません。');
  });

  it('should show 「出力データ件数が5000件を超えています。」 toast when export rejects with 409 EXPORT_LIMIT_EXCEEDED', async () => {
    const { exportHanbaitenExcel } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(exportHanbaitenExcel).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error_code: 'EXPORT_LIMIT_EXCEEDED',
          message: '出力データ件数が5000件を超えています。',
        },
      },
    });
    const errorSpy = vi.spyOn(message, 'error');
    errorSpy.mockClear();

    const { wrapper } = await renderView();
    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    await exportBtn!.trigger('click');
    await flushPromises();

    const calls = errorSpy.mock.calls.map((c) => String(c[0])).join(' ');
    expect(calls).toContain('出力データ件数が5000件を超えています。');
  });
});

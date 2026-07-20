// Screen: ACSMS-SCR-014 — 購読者明細検索画面
//
// Drives src/views/dokusya/DokusyaListView.vue. Every it() maps to a
// clause in docs/design/ACSMS-SCR-014/screen-design.md (機能定義 +
// メッセージ情報) + docs/design/ACSMS-SCR-014/index.html (UI structure)
// + docs/design/ACSMS-SCR-014/ACSMS-SCR-014-api.md (API contracts).
//
// Three BE endpoints, all mocked here:
//   listDokusya         → ACSMS-API-014-001 (検索 + ページネーション)
//   removeDokusya       → ACSMS-API-014-002 (論理削除)
//   exportDokusyaExcel  → ACSMS-API-014-003 (Excel 出力)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { Modal, message } from 'ant-design-vue';

import DokusyaListView from '@/views/dokusya/DokusyaListView.vue';
import {
  buildDokusyaListRow,
  buildDokusyaListResponse,
  buildDokusyaDetail,
  buildCodesSeed,
  buildAuthUser,
} from '@test/fixtures/dokusya.fixture';

// ─── API wrapper for SCR-014 endpoints ─────────────────────────────
//
// /gen-code-frontend will add these 3 wrapper functions to
// `src/api/dokusya/dokusya.ts` alongside the existing SCR-011 set
// (getDokusya / createDokusya / updateDokusya / approveDokusya /
// rejectDokusya / getDokusyaHistory). The mock re-stubs all 9 so the
// view's other imports continue to resolve.
vi.mock('@/api/dokusya/dokusya', () => ({
  getDokusya: vi.fn(),
  createDokusya: vi.fn(),
  updateDokusya: vi.fn(),
  approveDokusya: vi.fn(),
  rejectDokusya: vi.fn(),
  getDokusyaHistory: vi.fn(),
  listDokusya: vi.fn(),
  removeDokusya: vi.fn(),
  exportDokusyaExcel: vi.fn(),
  // ACSMS-API-014-004 — 購読停止（解約予約）ポップアップから呼ぶ専用 API。
  stopDokusya: vi.fn(),
}));

// Dropdown lookups — kanri_shiten / shiten / hanbaiten use the shared
// ACSMS-API-COMMON endpoints; stub each so onMounted does not 404.
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
}));
vi.mock('@/api/shiten/shiten', () => ({
  getShitenDropdown: vi.fn(),
}));
vi.mock('@/api/hanbaiten/hanbaiten', () => ({
  getHanbaitenDropdown: vi.fn(),
  // listHanbaiten / removeHanbaiten / etc. are referenced by other
  // dokusya views; keep them stubbed so the test suite can share the
  // module mock when it loads tangentially.
  listHanbaiten: vi.fn(),
  removeHanbaiten: vi.fn(),
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
  /** Override default CHUOKAI session (for permission-gating paths). */
  user?: ReturnType<typeof buildAuthUser>;
  /** Initial URL query (e.g. dashboard deep-link ?denshi_shonin_status=0). */
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
      { path: '/dokusya', name: 'DokusyaList', component: { template: '<div />' } },
      {
        path: '/dokusya/create',
        name: 'DokusyaCreate',
        component: { template: '<div />' },
      },
      {
        // Mirror the real router (router/index.ts): the edit route param is
        // `:id` (project convention), and goEdit pushes `params: { id }`.
        // Using `:dokusya_id` here made router.push throw "Missing required
        // param dokusya_id" — an unhandled rejection that failed the run.
        path: '/dokusya/:id/edit',
        name: 'DokusyaEdit',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'DokusyaList', query: opts.query });
  await router.isReady();

  const wrapper = mount(DokusyaListView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAuthUser() },
            codes: { all: buildCodesSeed() },
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

  const { listDokusya, removeDokusya, exportDokusyaExcel } = await import(
    '@/api/dokusya/dokusya'
  );
  vi.mocked(listDokusya).mockResolvedValue(buildDokusyaListResponse());
  vi.mocked(removeDokusya).mockResolvedValue({ message: '削除しました。' });
  // Default: a tiny binary blob so download-flow assertions don't NPE.
  vi.mocked(exportDokusyaExcel).mockResolvedValue(
    new Blob(['dummy'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }) as unknown as never,
  );

  const { getKanriShitenDropdown } = await import(
    '@/api/kanri-shiten/kanri-shiten'
  );
  vi.mocked(getKanriShitenDropdown).mockResolvedValue({
    data: [
      { kanri_shiten_id: 10, kanri_shiten_code: 'KS001', kanri_shiten_name: '中央管理支店' },
    ],
    meta: { total: 1, page: 1, per_page: 50, has_more: false },
  } as never);

  const { getShitenDropdown } = await import('@/api/shiten/shiten');
  vi.mocked(getShitenDropdown).mockResolvedValue({
    data: [
      {
        shiten_id: 21,
        shiten_code: 'SH001',
        shiten_name: '渋谷支店',
        kanri_shiten_id: 10,
        kinyu_shiten_flg: false,
      },
    ],
    meta: { total: 1, page: 1, per_page: 50, has_more: false },
  } as never);

  const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
  vi.mocked(getHanbaitenDropdown).mockResolvedValue({
    data: [
      { hanbaiten_id: 501, hanbaiten_code: 'HB001', hanbaiten_name: '渋谷販売店' },
      { hanbaiten_id: 502, hanbaiten_code: 'HB002', hanbaiten_name: '原宿販売店' },
    ],
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  } as never);
});

// ═══════════════════════════════════════════════════════════════════════
// 1. 初期表示 (機能定義 1.x + 画面項目定義)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaListView — initial render (機能定義 1.x)', () => {
  it('should mount without error when user has dokusya.view permission', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.exists()).toBe(true);
  });

  it('should call listDokusya once on mount with default pagination + sort params', async () => {
    await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    expect(listDokusya).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      page: 1,
      per_page: 20,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  });

  it('should render all 12 search input labels (常時表示エリア) when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('div.text-text-main.font-medium').map((l) => l.text());
    // 12 search labels per index.html — 常時表示 area only.
    // Detailed-search fields (詳細検索) live under a toggle and are
    // covered by the toggle-button tests below.
    expect(labels.some((t) => t.includes('管理支店'))).toBe(true);
    expect(labels.some((t) => t.includes('支店'))).toBe(true);
    expect(labels.some((t) => t.includes('組合員コード'))).toBe(true);
    expect(labels.some((t) => t.includes('氏名'))).toBe(true);
    expect(labels.some((t) => t.includes('かな氏名'))).toBe(true);
    expect(labels.some((t) => t.includes('配達先住所'))).toBe(true);
    expect(labels.some((t) => t.includes('配達販売店'))).toBe(true);
    expect(labels.some((t) => t.includes('手続種類'))).toBe(true);
    expect(labels.some((t) => t.includes('購読開始日'))).toBe(true);
    expect(labels.some((t) => t.includes('購読中止日'))).toBe(true);
    expect(labels.some((t) => t.includes('購読種別'))).toBe(true);
    expect(labels.some((t) => t.includes('電子版承認ステータス'))).toBe(true);
  });

  it('should render the 15 result table column headers when mounted', async () => {
    const { wrapper } = await renderView();
    const headerText = wrapper.findAll('th').map((th) => th.text());
    // 顧客要件 2026-06 検索結果テーブル — ID + 14 列 + 操作
    // (ID added first; 支店 / 連絡先２ removed; 手続種類 / 購読種別 / 配達先氏名 / 支払方法 added).
    expect(headerText).toContain('ID');
    expect(headerText).toContain('管理支店');
    expect(headerText).toContain('組合員コード');
    expect(headerText).toContain('購読者名');
    expect(headerText).toContain('手続種類');
    expect(headerText).toContain('購読種別');
    expect(headerText).toContain('連絡先1');
    expect(headerText).toContain('配達先氏名');
    expect(headerText).toContain('配達先郵便');
    expect(headerText).toContain('配達先住所');
    expect(headerText).toContain('販売店コード');
    expect(headerText).toContain('販売店名');
    expect(headerText).toContain('支払方法');
    expect(headerText).toContain('購読開始日');
    expect(headerText).toContain('購読中止日');
    expect(headerText).toContain('操作');
    // Removed columns must NOT appear as standalone table headers.
    expect(headerText).not.toContain('支店');
    expect(headerText).not.toContain('連絡先2');
  });

  it('should render the 購読者一覧 section title when mounted (index.html row 690)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('購読者一覧');
  });

  it('should render the 購読者情報登録 create button when mounted (index.html row 696)', async () => {
    const { wrapper } = await renderView();
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('購読者情報登録'));
    expect(createBtn).toBeDefined();
  });

  it('should render the 検索 submit button when mounted', async () => {
    const { wrapper } = await renderView();
    // BaseSearchForm renders one submit button.
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

  it('should render the Excel出力 button when mounted', async () => {
    const { wrapper } = await renderView();
    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    expect(exportBtn).toBeDefined();
  });

  it('should render ACSMS-MSG-014-002 「検索結果が見つかりませんでした。」 when results.length === 0', async () => {
    // COVERS: 機能定義 2.2 — 検索結果なし時のメッセージ（プロジェクト共通文言）。
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    } as never);

    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should render rows from the API response when listDokusya resolves', async () => {
    const { wrapper } = await renderView();
    // Default 2-row fixture: 山田 太郎 + 佐藤 花子.
    expect(wrapper.text()).toContain('山田 太郎');
    expect(wrapper.text()).toContain('佐藤 花子');
    expect(wrapper.text()).toContain('K000001');
    expect(wrapper.text()).toContain('K000002');
  });

  it('should render the 詳細検索を表示 toggle button initially when mounted', async () => {
    const { wrapper } = await renderView();
    const toggleBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('詳細検索を表示'));
    expect(toggleBtn).toBeDefined();
  });

  it('should toggle the advanced-search panel + flip the label to 詳細検索を非表示 when clicked', async () => {
    const { wrapper } = await renderView();
    const toggleBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('詳細検索を表示'));
    await toggleBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('詳細検索を非表示');
    // After expansion, advanced-search fields should be reachable.
    const labels = wrapper.findAll('div.text-text-main.font-medium').map((l) => l.text());
    expect(labels.some((t) => t.includes('引落元口座支店コード'))).toBe(true);
    expect(labels.some((t) => t.includes('引落元口座支店名'))).toBe(true);
    expect(labels.some((t) => t.includes('連絡先1'))).toBe(true);
    expect(labels.some((t) => t.includes('メールアドレス'))).toBe(true);
    expect(labels.some((t) => t.includes('請求開始月'))).toBe(true);
    expect(labels.some((t) => t.includes('適用日'))).toBe(true);
    expect(labels.some((t) => t.includes('支払方法'))).toBe(true);
  });

  it('should populate 購読種別 radio options from useCodesStore().options("DOKUSYA_SHUBETSU")', async () => {
    const { wrapper } = await renderView();
    // m_code seed exposes 紙版 / 電子版 / 併読 (values 1, 2, 3).
    expect(wrapper.text()).toContain('紙版');
    expect(wrapper.text()).toContain('電子版');
    expect(wrapper.text()).toContain('併読');
  });

  it('should populate 手続種類 radio options from useCodesStore().options("TETSUZUKI_SHURUI")', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('解約');
    expect(wrapper.text()).toContain('新規');
  });

  it('should render the Web申込以外 / 未承認 / 承認済み / 否認 options for 電子版承認ステータス (index.html row 559-562)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('Web申込以外');
    expect(wrapper.text()).toContain('未承認');
    expect(wrapper.text()).toContain('承認済み');
    expect(wrapper.text()).toContain('否認');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. 検索 (機能定義 2.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaListView — search submission (機能定義 2.x)', () => {
  it('should seed denshi_shonin_status=0 filter on mount when the dashboard deep-link query is present', async () => {
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();
    await renderView({ query: { denshi_shonin_status: '0' } });
    expect(listDokusya).toHaveBeenCalled();
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ denshi_shonin_status: 0 });
  });

  it('should seed 有効単価フラグ=無効 (active_tanka_flg=false) on mount when the SCR-020 deep-link ?inactive_tanka=1 is present', async () => {
    // COVERS: SCR-020 error gate → 購読者明細検索 deep-link（顧客要件2026-07 改訂）
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();
    await renderView({ query: { inactive_tanka: '1' } });
    expect(listDokusya).toHaveBeenCalled();
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ active_tanka_flg: false });
  });

  it('should send active_tanka_flg=false when 有効単価フラグ=無効 is selected and submitted (失効単価参照)', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.active_tanka_flg = '0';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listDokusya).toHaveBeenCalled();
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ active_tanka_flg: false });
  });

  it('should send active_tanka_flg=true when 有効単価フラグ=有効 is selected and submitted (有効単価参照)', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.active_tanka_flg = '1';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ active_tanka_flg: true });
  });

  it('should NOT send active_tanka_flg when 有効単価フラグ is unselected (default mount call → 両方)', async () => {
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();
    await renderView(); // default filters → radio unselected
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toBeDefined();
    expect('active_tanka_flg' in (arg ?? {})).toBe(false);
  });

  it('should call listDokusya with kumiaiin_code filter when the form is submitted', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    // Drive via state mutation — text-input order varies based on
    // detailed-search expansion + label placement.
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kumiaiin_code = 'K000001';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listDokusya).toHaveBeenCalled();
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ kumiaiin_code: 'K000001' });
  });

  it('should call listDokusya with full_name partial-match filter when the form is submitted', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.full_name = '山田';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ full_name: '山田' });
  });

  it('should trim leading/trailing whitespace on every text filter before submit', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.kumiaiin_code = '  K000001  ';
      vm.state.filters.full_name = '  山田  ';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      kumiaiin_code: 'K000001',
      full_name: '山田',
    });
  });

  it('should run the search (not throw) when 請求開始月 was typed then cleared and 検索 is clicked', async () => {
    // Regression: seikyu_kaishi_month is bound to <a-date-picker>. Clearing
    // it makes antd set the v-model to undefined; the old trimTextFilters()
    // called .trim() on it → TypeError → generic error toast on 検索 instead
    // of running the search. listDokusya being called proves onSearch ran to
    // completion past the (now removed) trim.
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    // Simulate antd's clear icon: month value becomes undefined (not '').
    // Pair with a real text filter so the search actually fires (a no-change
    // submit is skipped) — the trim step still runs first, which is where the
    // old code threw on the undefined month.
    vm.state.filters.seikyu_kaishi_month = undefined;
    vm.state.filters.kumiaiin_code = 'K000001';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listDokusya).toHaveBeenCalled();
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    // Cleared month → omitted from the request params.
    expect(arg?.seikyu_kaishi_month).toBeUndefined();
    expect(arg?.kumiaiin_code).toBe('K000001');
  });

  it('should omit empty text filters (send undefined, not empty string) so BE does not see falsy values', async () => {
    await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg?.kumiaiin_code).toBeUndefined();
    expect(arg?.full_name).toBeUndefined();
    expect(arg?.full_name_kana).toBeUndefined();
    expect(arg?.haitatsu).toBeUndefined();
    expect(arg?.email).toBeUndefined();
  });

  it('should re-render the table with new rows when listDokusya returns a different response', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('山田 太郎');

    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockResolvedValueOnce(
      buildDokusyaListResponse({
        data: [
          buildDokusyaListRow({
            dokusya_id: 9999,
            kumiaiin_code: 'K999999',
            full_name: '田中 一郎',
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }),
    );

    // Set a filter so 検索 actually fires — an all-empty search is now a
    // no-op (the initial load already showed the default list).
    (wrapper.vm as unknown as { state: { filters: { full_name: string } } })
      .state.filters.full_name = '田中';
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('田中 一郎');
    expect(wrapper.text()).toContain('K999999');
  });

  it('should reset to page 1 when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    // Make the screen non-pristine so 検索クリア resets+refetches (a pristine
    // screen is now a no-op — see useTableQuery.isPristine).
    (wrapper.vm as unknown as { state: { filters: { full_name: string } } })
      .state.filters.full_name = 'x';

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(listDokusya).toHaveBeenCalled();
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg?.page).toBe(1);
  });

  it('should clear all filters when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.kumiaiin_code = 'K000001';
      vm.state.filters.full_name = '山田';
    }
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    if (vm.state?.filters) {
      expect(vm.state.filters.kumiaiin_code).toBe('');
      expect(vm.state.filters.full_name).toBe('');
    }
  });

  it('should send shoki_dokusya_kaishi_date_from / _to when the 購読開始日 range is populated', async () => {
    // COVERS: api.md §13/14 + screen-design 機能定義 2.2 — date range params.
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.shoki_dokusya_kaishi_date_from = '2024/01/01';
      vm.state.filters.shoki_dokusya_kaishi_date_to = '2024/12/31';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      shoki_dokusya_kaishi_date_from: '2024/01/01',
      shoki_dokusya_kaishi_date_to: '2024/12/31',
    });
  });

  it('should send dokusya_chushi_date_from / _to when the 購読中止日 range is populated', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.dokusya_chushi_date_from = '2025/01/01';
      vm.state.filters.dokusya_chushi_date_to = '2025/06/30';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      dokusya_chushi_date_from: '2025/01/01',
      dokusya_chushi_date_to: '2025/06/30',
    });
  });

  it('should send joho_henko_tekiyo_date_from / _to when the 適用日 range is populated (詳細検索)', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.joho_henko_tekiyo_date_from = '2026/01/01';
      vm.state.filters.joho_henko_tekiyo_date_to = '2026/12/31';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      joho_henko_tekiyo_date_from: '2026/01/01',
      joho_henko_tekiyo_date_to: '2026/12/31',
    });
  });

  it('should send sort_by=kanri_shiten_id sort_order=asc when 管理支店 column header is clicked (1st click → ASC)', async () => {
    // COVERS: 機能定義 10.2 / 10.3 — sortable column 管理支店.
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const aTable = wrapper.findComponent({ name: 'ATable' });
    expect(aTable.exists()).toBe(true);
    aTable.vm.$emit(
      'change',
      { current: 1, pageSize: 20 },
      {},
      { field: 'kanri_shiten_id', columnKey: 'kanri_shiten_id', order: 'ascend' },
    );
    await flushPromises();

    expect(listDokusya).toHaveBeenCalled();
    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      sort_by: 'kanri_shiten_id',
      sort_order: 'asc',
    });
  });

  it('should send sort_by=hanbaiten_id when the 販売店コード column header is clicked', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const aTable = wrapper.findComponent({ name: 'ATable' });
    aTable.vm.$emit(
      'change',
      { current: 1, pageSize: 20 },
      {},
      { field: 'hanbaiten_id', columnKey: 'hanbaiten_id', order: 'descend' },
    );
    await flushPromises();

    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      sort_by: 'hanbaiten_id',
      sort_order: 'desc',
    });
  });

  it('should send sort_by=shoki_dokusya_kaishi_date when the 購読開始日 column header is clicked', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const aTable = wrapper.findComponent({ name: 'ATable' });
    aTable.vm.$emit(
      'change',
      { current: 1, pageSize: 20 },
      {},
      {
        field: 'shoki_dokusya_kaishi_date',
        columnKey: 'shoki_dokusya_kaishi_date',
        order: 'ascend',
      },
    );
    await flushPromises();

    const arg = vi.mocked(listDokusya).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      sort_by: 'shoki_dokusya_kaishi_date',
      sort_order: 'asc',
    });
  });

  it('should show ACSMS-MSG-014-008 「正しいメール形式を入力してください。」 + NOT call listDokusya for malformed email', async () => {
    // COVERS: 機能定義 2.2 + ACSMS-MSG-014-008.
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.email = 'not-an-email';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('正しいメール形式を入力してください。');
    expect(listDokusya).not.toHaveBeenCalled();
  });

  it('should NOT call listDokusya when 購読開始日 from > to (相関チェック violation)', async () => {
    // COVERS: api.md §13/14 相関チェック — from ≦ to required.
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.shoki_dokusya_kaishi_date_from = '2024/12/31';
      vm.state.filters.shoki_dokusya_kaishi_date_to = '2024/01/01';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listDokusya).not.toHaveBeenCalled();
  });

  it('should NOT call listDokusya when 購読中止日 from > to (相関チェック violation)', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.dokusya_chushi_date_from = '2025/06/30';
      vm.state.filters.dokusya_chushi_date_to = '2025/01/01';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listDokusya).not.toHaveBeenCalled();
  });

  it('should NOT call listDokusya when 適用日 from > to (相関チェック violation)', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.joho_henko_tekiyo_date_from = '2026/12/31';
      vm.state.filters.joho_henko_tekiyo_date_to = '2026/01/01';
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(listDokusya).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. 編集ナビゲーション (機能定義 5.x)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaListView — row navigation (機能定義 5.x)', () => {
  it('should navigate to DokusyaEdit with the row dokusya_id when 購読者名 anchor is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const link = wrapper
      .findAll('a, button')
      .find((el) => el.text().includes('山田 太郎'));
    expect(link).toBeDefined();
    await link!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('DokusyaEdit');
    expect(pushed).toContain('1001');
  });

  it('should keep 購読者名 anchor clickable on read-only rows (VIEW path stays open)', async () => {
    // COVERS: api.md §is_read_only — flag disables 削除 ONLY.
    // 編集ナビゲーション stays available so users can inspect the record.
    const { wrapper } = await renderView();
    const link = wrapper
      .findAll('a, button')
      .find((el) => el.text().includes('佐藤 花子'));
    expect(link).toBeDefined();
  });

  it('should render the 削除 link disabled (visible-but-disabled) for read-only rows (is_read_only=true)', async () => {
    // COVERS: api.md §is_read_only + 機能定義 6.2 — read-only rows
    // disable the 削除 affordance. Project convention: visible-but-disabled
    // (see .claude/rules/vue.md §Permission-aware list buttons).
    const { wrapper } = await renderView();
    // Default fixture: row 2 (佐藤 花子) has is_read_only=true.
    // Find the matching row by full-name text, then inspect its 削除 link.
    const rowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('佐藤 花子'));
    expect(rowEl).toBeDefined();
    const deleteEl = rowEl!
      .findAll('a, button')
      .find(
        (el) =>
          el.text().trim() === '削除' || el.text().includes('削除'),
      );
    expect(deleteEl).toBeDefined();
    // Accept either an HTML disabled attribute, an antd is-disabled
    // class, or aria-disabled — all three satisfy the visible-but-
    // disabled UX rule.
    const html = deleteEl!.html();
    const hasDisabledSignal =
      /disabled(?:=|>|\s)/.test(html) ||
      html.includes('is-disabled') ||
      html.includes('ant-btn-disabled') ||
      deleteEl!.attributes('aria-disabled') === 'true';
    expect(hasDisabledSignal).toBe(true);
  });

  it('should navigate to DokusyaCreate when 購読者情報登録 button is clicked', async () => {
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('購読者情報登録'));
    await createBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('DokusyaCreate');
  });

  it('should keep 購読者情報登録 visible but disabled when user lacks dokusya.create', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        permissions: ['dokusya.view', 'dokusya.update', 'dokusya.delete'],
      }),
    });
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('購読者情報登録'));
    expect(createBtn).toBeDefined();
    expect(createBtn!.attributes('disabled')).toBeDefined();
  });

  it('should disable 購読者情報登録 when the account has dokusya.create but neither 購読種別 flag', async () => {
    // account_concept.md §139-145 — no paper_flg/denshi_flg → cannot create.
    const { wrapper } = await renderView({
      user: buildAuthUser({ paper_flg: false, denshi_flg: false }),
    });
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('購読者情報登録'));
    expect(createBtn).toBeDefined();
    expect(createBtn!.attributes('disabled')).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. 削除フロー (機能定義 6.x + ACSMS-MSG-014-010 / 011)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaListView — delete flow (機能定義 6.x)', () => {
  it('should render a 削除 link in the 操作 column for each row when mounted', async () => {
    const { wrapper } = await renderView();
    const deleteLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    expect(deleteLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('should open Modal.confirm with title 削除確認 and ACSMS-MSG-014-010 content when 削除 is clicked', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
      destroy: () => undefined,
      update: () => undefined,
    }));
    const { wrapper } = await renderView();

    // Find a 削除 link belonging to the FIRST row (is_read_only=false).
    const firstRowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('山田 太郎'));
    const deleteLink = firstRowEl!
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    const args = confirmSpy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    const flat = JSON.stringify(args);
    expect(flat).toContain('削除確認');
    expect(flat).toContain('この購読者を削除してもよろしいですか');
  });

  it('should call removeDokusya with the row dokusya_id when 「はい」 is clicked', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(removeDokusya).mockClear();

    const firstRowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('山田 太郎'));
    const deleteLink = firstRowEl!
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(removeDokusya).toHaveBeenCalled();
    expect(vi.mocked(removeDokusya).mock.calls[0]?.[0]).toBe(1001);
  });

  it('should display 「削除しました。」 toast (verb-only useNotify convention) when delete succeeds', async () => {
    // COVERS: useNotify().deleted() — verb-only per project convention.
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    const firstRowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('山田 太郎'));
    const deleteLink = firstRowEl!
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('削除しました。');
  });

  it('should re-call listDokusya after a successful delete (refresh the table)', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    const initialCalls = vi.mocked(listDokusya).mock.calls.length;

    const firstRowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('山田 太郎'));
    const deleteLink = firstRowEl!
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(vi.mocked(listDokusya).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should NOT re-toast when removeDokusya rejects with 403 DOKUSYA_READ_ONLY (global interceptor handles it)', async () => {
    // COVERS: api.md §403 DOKUSYA_READ_ONLY — the global axios
    // interceptor toasts read-only errors; the view must NOT re-toast.
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { removeDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(removeDokusya).mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          error_code: 'DOKUSYA_READ_ONLY',
          message: 'この購読者は編集・削除できません。',
        },
      },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    const firstRowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('山田 太郎'));
    const deleteLink = firstRowEl!
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });

  it('should NOT re-toast when removeDokusya rejects with 409 CONFLICT (global interceptor handles it)', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { removeDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(removeDokusya).mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error_code: 'CONFLICT', message: '関連データが存在するため削除できません。' },
      },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    const firstRowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('山田 太郎'));
    const deleteLink = firstRowEl!
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });

  it('should NOT call removeDokusya when the confirm dialog is cancelled', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { removeDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(removeDokusya).mockClear();

    const firstRowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('山田 太郎'));
    const deleteLink = firstRowEl!
      .findAll('button, a')
      .find((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    await deleteLink!.trigger('click');
    await flushPromises();

    expect(removeDokusya).not.toHaveBeenCalled();
  });

  it('should keep 削除 link visible but disabled (visible-but-disabled) when user lacks dokusya.delete', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        permissions: ['dokusya.view', 'dokusya.create', 'dokusya.update'],
      }),
    });
    const deleteLinks = wrapper
      .findAll('button, a')
      .filter((el) => el.text().trim() === '削除' || el.text().includes('削除'));
    expect(deleteLinks.length).toBeGreaterThanOrEqual(2);
    deleteLinks.forEach((el) => {
      const html = el.html();
      const hasDisabledSignal =
        /disabled(?:=|>|\s)/.test(html) ||
        html.includes('is-disabled') ||
        html.includes('ant-btn-disabled') ||
        el.attributes('aria-disabled') === 'true';
      expect(hasDisabledSignal).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Excel 出力 (機能定義 8.x + ACSMS-MSG-014-005 / 006 / 012)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaListView — Excel export (機能定義 8.x)', () => {
  it('should call exportDokusyaExcel with the current filter state when Excel出力 is clicked', async () => {
    const { wrapper } = await renderView();
    const { exportDokusyaExcel } = await import('@/api/dokusya/dokusya');
    vi.mocked(exportDokusyaExcel).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.kumiaiin_code = 'K000001';
      vm.state.filters.dokusya_shubetsu = 1;
    }
    await flushPromises();

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    await exportBtn!.trigger('click');
    await flushPromises();

    expect(exportDokusyaExcel).toHaveBeenCalled();
    const arg = vi.mocked(exportDokusyaExcel).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({
      kumiaiin_code: 'K000001',
      dokusya_shubetsu: 1,
    });
  });

  it('should NOT send pagination/sort params in the Excel出力 call (api.md §014-003)', async () => {
    // COVERS: api.md §014-003 — page / per_page / sort_by / sort_order
    // are 無視 by the BE. Filter-only payload keeps the wire smaller.
    const { wrapper } = await renderView();
    const { exportDokusyaExcel } = await import('@/api/dokusya/dokusya');
    vi.mocked(exportDokusyaExcel).mockClear();

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    await exportBtn!.trigger('click');
    await flushPromises();

    const arg = vi.mocked(exportDokusyaExcel).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg?.page).toBeUndefined();
    expect(arg?.per_page).toBeUndefined();
    expect(arg?.sort_by).toBeUndefined();
    expect(arg?.sort_order).toBeUndefined();
  });

  it('should show ACSMS-MSG-014-005 「Excel出力が正常に完了しました。」 toast when export succeeds', async () => {
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    await exportBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('Excel出力が正常に完了しました。');
  });

  it('should show ACSMS-MSG-014-006 「出力データがありません。」 toast when export rejects with 404 EXPORT_NO_DATA', async () => {
    const { exportDokusyaExcel } = await import('@/api/dokusya/dokusya');
    vi.mocked(exportDokusyaExcel).mockRejectedValueOnce({
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

    // Toast literal from screen-design.md ACSMS-MSG-014-006.
    const calls = errorSpy.mock.calls.map((c) => String(c[0])).join(' ');
    expect(calls).toContain('出力データがありません。');
  });

  it('should show ACSMS-MSG-014-012 「出力データ件数が30000件を超えています。」 toast when export rejects with 409 EXPORT_LIMIT_EXCEEDED', async () => {
    const { exportDokusyaExcel } = await import('@/api/dokusya/dokusya');
    vi.mocked(exportDokusyaExcel).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error_code: 'EXPORT_LIMIT_EXCEEDED',
          message: '出力データ件数が30000件を超えています。',
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
    expect(calls).toContain('出力データ件数が30000件を超えています。');
  });

  it('should keep Excel出力 visible but disabled when user lacks dokusya.view permission', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        permissions: ['dokusya.create', 'dokusya.update', 'dokusya.delete'],
      }),
    });
    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Excel出力'));
    expect(exportBtn).toBeDefined();
    expect(exportBtn!.attributes('disabled')).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Initial fetch error path
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaListView — initial fetch error', () => {
  it('should still call listDokusya without surfacing an unhandled rejection when the initial fetch fails', async () => {
    // COVERS: .claude/rules/vue.md §List view rule 5 — onMounted's
    // fire-and-forget fetch must swallow rejections so the global
    // axios interceptor's toast is the only error surface.
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });

    const { wrapper } = await renderView();
    expect(vi.mocked(listDokusya)).toHaveBeenCalled();
    // View must remain mounted (no throw); empty-state message renders.
    expect(wrapper.exists()).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Empty-search guard — clicking 検索 with all filters blank must NOT call
// the list API (the initial load already showed the default list).
// 検索クリア remains the reset path. See useTableQuery.hasActiveFilters.
// ───────────────────────────────────────────────────────────────────────
describe('DokusyaListView — empty 検索 is a no-op', () => {
  it('should NOT call listDokusya when 検索 is submitted with all filters empty', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear(); // drop the onMounted fetch
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(listDokusya).not.toHaveBeenCalled();
  });

  it('should NOT call listDokusya when 検索クリア is clicked on a pristine screen', async () => {
    const { wrapper } = await renderView();
    const { listDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(listDokusya).mockClear(); // drop the onMounted fetch
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();
    expect(listDokusya).not.toHaveBeenCalled();
  });
});

// ─── 購読停止（解約予約）ポップアップ (顧客要件 2026-07・ACSMS-API-014-004) ──────
//
// 一覧の「購読停止」ボタン → 詳細取得 → ポップアップ → 専用 API。DOM の a-modal は
// teleport されるためポップアップ内の操作はコンポーネント内部状態(vm)経由で駆動する。
describe('DokusyaListView — 購読停止（解約予約）ポップアップ', () => {
  it('should render a 購読停止 button BEFORE 削除 in each row action cell', async () => {
    const { wrapper } = await renderView();
    const rowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('山田 太郎'));
    expect(rowEl).toBeDefined();
    const stopBtn = rowEl!.find('[data-test="stop-button"]');
    expect(stopBtn.exists()).toBe(true);
    // 順序: 購読停止 が 削除 より前に来る。
    const html = rowEl!.html();
    expect(html.indexOf('購読停止')).toBeLessThan(html.indexOf('削除'));
  });

  it('should disable 購読停止 for read-only rows (is_read_only=true)', async () => {
    const { wrapper } = await renderView();
    // 既定 fixture: row2 (佐藤 花子) は is_read_only=true。
    const rowEl = wrapper
      .findAll('tr')
      .find((tr) => tr.text().includes('佐藤 花子'));
    const stopBtn = rowEl!.find('[data-test="stop-button"]');
    expect(stopBtn.exists()).toBe(true);
    expect((stopBtn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should disable 購読停止 when the user lacks dokusya.update', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({
        permissions: ['dokusya.view', 'dokusya.create', 'dokusya.delete'],
      }),
    });
    const stopBtn = wrapper.find('[data-test="stop-button"]');
    expect(stopBtn.exists()).toBe(true);
    expect((stopBtn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should fetch detail and OPEN the popup for a 紙版 row', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValue({
      data: buildDokusyaDetail({
        dokusya_id: 100,
        dokusya_shubetsu: 1,
        dokusya_kaishi_date: '2026-04-01',
        max_joho_date: null,
        has_active_kaiyaku: false,
      }),
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as unknown as {
      openStopModal: (row: { dokusya_id: number }) => Promise<void>;
      stopModalOpen: boolean;
      isStopDigital: boolean;
    };
    await vm.openStopModal(buildDokusyaListRow({ dokusya_id: 100 }));
    await flushPromises();
    expect(getDokusya).toHaveBeenCalledWith(100);
    expect(vm.stopModalOpen).toBe(true);
    expect(vm.isStopDigital).toBe(false);
  });

  it('should WARN and NOT open the popup for a 電子版 row with empty 請求開始月', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValue({
      data: buildDokusyaDetail({
        dokusya_id: 101,
        dokusya_shubetsu: 2,
        seikyu_kaishi_month: '', // 料金徴収未開始
        has_active_kaiyaku: false,
      }),
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as unknown as {
      openStopModal: (row: { dokusya_id: number }) => Promise<void>;
      stopModalOpen: boolean;
    };
    await vm.openStopModal(buildDokusyaListRow({ dokusya_id: 101 }));
    await flushPromises();
    expect(message.warning).toHaveBeenCalledWith(
      'この読者料金の徴収はまだ開始されていません。',
    );
    expect(vm.stopModalOpen).toBe(false);
  });

  it('should WARN and NOT open the popup when 解約予約 already exists (has_active_kaiyaku)', async () => {
    const { getDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValue({
      data: buildDokusyaDetail({
        dokusya_id: 102,
        dokusya_shubetsu: 1,
        has_active_kaiyaku: true,
      }),
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as unknown as {
      openStopModal: (row: { dokusya_id: number }) => Promise<void>;
      stopModalOpen: boolean;
    };
    await vm.openStopModal(buildDokusyaListRow({ dokusya_id: 102 }));
    await flushPromises();
    expect(message.warning).toHaveBeenCalledWith(
      '既に解約予約されています。変更する場合は履歴画面で解約を取消してください。',
    );
    expect(vm.stopModalOpen).toBe(false);
  });

  it('should call stopDokusya with the picked date for a 紙版 row, then refetch', async () => {
    const { getDokusya, stopDokusya, listDokusya } = await import(
      '@/api/dokusya/dokusya'
    );
    vi.mocked(getDokusya).mockResolvedValue({
      data: buildDokusyaDetail({ dokusya_id: 100, dokusya_shubetsu: 1 }),
    });
    vi.mocked(stopDokusya).mockResolvedValue({
      data: buildDokusyaDetail({ dokusya_id: 100 }),
      message: '購読停止を予約しました。',
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as unknown as {
      openStopModal: (row: { dokusya_id: number }) => Promise<void>;
      confirmStop: () => Promise<void>;
      stopDate: unknown;
      stopModalOpen: boolean;
    };
    await vm.openStopModal(buildDokusyaListRow({ dokusya_id: 100 }));
    await flushPromises();
    // 紙版カレンダーで日付を選択（Dayjs）。
    vm.stopDate = dayjs('2030-09-15');
    vi.mocked(listDokusya).mockClear();
    await vm.confirmStop();
    await flushPromises();
    expect(stopDokusya).toHaveBeenCalledWith(100, {
      dokusya_chushi_date: '2030-09-15',
    });
    expect(vm.stopModalOpen).toBe(false); // 成功で閉じる
    expect(listDokusya).toHaveBeenCalled(); // 再取得
  });

  it('should call stopDokusya with the END-of-month date for a 電子版 row', async () => {
    const { getDokusya, stopDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValue({
      data: buildDokusyaDetail({
        dokusya_id: 101,
        dokusya_shubetsu: 2,
        seikyu_kaishi_month: '202604',
      }),
    });
    vi.mocked(stopDokusya).mockResolvedValue({
      data: buildDokusyaDetail({ dokusya_id: 101, dokusya_shubetsu: 2 }),
      message: '購読停止を予約しました。',
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as unknown as {
      openStopModal: (row: { dokusya_id: number }) => Promise<void>;
      confirmStop: () => Promise<void>;
      stopMonth: unknown;
    };
    await vm.openStopModal(buildDokusyaListRow({ dokusya_id: 101 }));
    await flushPromises();
    // 終了月に 2030/07 を選択 → 月末 2030-07-31 で停止する。
    vm.stopMonth = dayjs('2030-07-10');
    await vm.confirmStop();
    await flushPromises();
    expect(stopDokusya).toHaveBeenCalledWith(101, {
      dokusya_chushi_date: '2030-07-31',
    });
  });

  it('should surface a VALIDATION_ERROR message inside the popup (no re-toast)', async () => {
    const { getDokusya, stopDokusya } = await import('@/api/dokusya/dokusya');
    vi.mocked(getDokusya).mockResolvedValue({
      data: buildDokusyaDetail({ dokusya_id: 100, dokusya_shubetsu: 1 }),
    });
    vi.mocked(stopDokusya).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          errors: [
            {
              field: 'dokusya_chushi_date',
              message: '購読中止日は本日より後の日付を指定してください。',
            },
          ],
        },
      },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as unknown as {
      openStopModal: (row: { dokusya_id: number }) => Promise<void>;
      confirmStop: () => Promise<void>;
      stopDate: unknown;
      stopFieldError: string | null;
      stopModalOpen: boolean;
    };
    await vm.openStopModal(buildDokusyaListRow({ dokusya_id: 100 }));
    await flushPromises();
    vm.stopDate = dayjs('2030-09-15');
    await vm.confirmStop();
    await flushPromises();
    expect(vm.stopFieldError).toBe(
      '購読中止日は本日より後の日付を指定してください。',
    );
    expect(vm.stopModalOpen).toBe(true); // エラーでは閉じない
  });
});

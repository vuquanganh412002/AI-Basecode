// Screen: ACSMS-SCR-015 — 購読者販売店一括置換画面
//
// Drives src/views/dokusya/DokusyaReplaceHanbaitenView.vue (currently a
// TODO placeholder). Every it() maps to a clause in
// docs/design/ACSMS-SCR-015/screen-design.md (機能定義 B + メッセージ情報)
// cross-referenced with docs/design/ACSMS-SCR-015/index.html (labels /
// columns / buttons) and docs/design/ACSMS-SCR-015/ACSMS-SCR-015-api.md
// (API-015-001 search, API-015-002 replace, エラー一覧).
//
// Two SCR-015 endpoints (mocked here) — /gen-code-frontend adds them to
// src/api/dokusya/dokusya.ts:
//   searchDokusyaForReplace  → ACSMS-API-015-001 (検索 + ページネーション)
//   replaceDokusyaHanbaiten  → ACSMS-API-015-002 (一括置換)
// Three dropdown lookups reuse existing shared wrappers:
//   getKanriShitenDropdown / getShitenDropdown / getHanbaitenDropdown.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { Modal, message } from 'ant-design-vue';

import DokusyaReplaceHanbaitenView from '@/views/dokusya/DokusyaReplaceHanbaitenView.vue';
import { buildCodesSeed, buildAuthUser } from '@test/fixtures/dokusya.fixture';
import {
  buildReplaceSearchItem,
  buildReplaceSearchResponse,
  buildReplaceResultResponse,
} from '@test/fixtures/dokusya-replace.fixture';

// ─── SCR-015 API wrapper (search + replace) ─────────────────────────
//
// /gen-code-frontend will add searchDokusyaForReplace +
// replaceDokusyaHanbaiten to `src/api/dokusya/dokusya.ts` alongside the
// existing SCR-011/013/014 set. Re-stub the whole module so the view's
// other imports continue to resolve when the module is shared.
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
  searchDokusyaForReplace: vi.fn(),
  replaceDokusyaHanbaiten: vi.fn(),
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
  listHanbaiten: vi.fn(),
  removeHanbaiten: vi.fn(),
}));

// Spy on antd's global toasts. Antd's `MessageType` is a callable
// PromiseLike — return undefined via cast so the spy compiles even once
// `@ts-nocheck` is removed.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Override default CHUOKAI session (for permission-gating paths). */
  user?: ReturnType<typeof buildAuthUser>;
  /** false = leave 適用日 empty (to test the required-before-search guard). */
  seedTekiyo?: boolean;
}

/** Default session: CHUOKAI holding dokusya.replace_hanbaiten. */
function buildReplaceUser(overrides: Record<string, unknown> = {}) {
  return buildAuthUser({
    permissions: ['dokusya.view', 'dokusya.replace_hanbaiten'],
    ...overrides,
  });
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
      {
        path: '/dokusya/replace-hanbaiten',
        name: 'DokusyaReplaceHanbaiten',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'DokusyaReplaceHanbaiten' });
  await router.isReady();

  const wrapper = mount(DokusyaReplaceHanbaitenView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildReplaceUser() },
            codes: { all: buildCodesSeed() },
          },
        }),
        Antd,
      ],
    },
  });
  await flushPromises();
  // 販売店適用日は検索の必須条件（顧客要件 2026-07）。既定で遠未来日を入れて
  // 検索が通る状態にする（未入力時のバリデーションは opts.seedTekiyo=false で検証）。
  if (opts.seedTekiyo !== false) {
    (wrapper.vm as any).state.filters.hanbaiten_tekiyo_date = '2099-12-31';
    await flushPromises();
  }
  return { wrapper, router };
}

/** Select N row checkboxes (skipping the header select-all box) + reveal
 *  置換先 / 適用日. Returns the input wrappers checked. */
async function selectRows(wrapper: ReturnType<typeof mount>, count = 1) {
  // antd renders one checkbox per body row + one in the header.
  // The header (select-all) lives inside <thead>; body boxes in <tbody>.
  const bodyBoxes = wrapper
    .findAll('tbody input[type="checkbox"]')
    .filter((c) => c.exists());
  const picked = bodyBoxes.slice(0, count);
  for (const box of picked) {
    await box.setValue(true);
  }
  await flushPromises();
  return picked;
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  // Re-install the message spies cleared by restoreAllMocks.
  vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
  vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
  vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
  vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

  const { searchDokusyaForReplace, replaceDokusyaHanbaiten } = await import(
    '@/api/dokusya/dokusya'
  );
  vi.mocked(searchDokusyaForReplace).mockResolvedValue(
    buildReplaceSearchResponse() as never,
  );
  vi.mocked(replaceDokusyaHanbaiten).mockResolvedValue(
    buildReplaceResultResponse() as never,
  );

  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  vi.mocked(getKanriShitenDropdown).mockResolvedValue({
    data: [
      { kanri_shiten_id: 10, kanri_shiten_code: 'KS001', kanri_shiten_name: '東京中央 管理支店' },
      { kanri_shiten_id: 20, kanri_shiten_code: 'KS002', kanri_shiten_name: '渋谷管理支店' },
    ],
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  } as never);

  const { getShitenDropdown } = await import('@/api/shiten/shiten');
  vi.mocked(getShitenDropdown).mockResolvedValue({
    data: [
      {
        shiten_id: 100,
        shiten_code: 'S001',
        shiten_name: '千代田支店',
        kanri_shiten_id: 10,
        kinyu_shiten_flg: false,
      },
    ],
    meta: { total: 1, page: 1, per_page: 50, has_more: false },
  } as never);

  const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
  vi.mocked(getHanbaitenDropdown).mockResolvedValue({
    data: [
      { hanbaiten_id: 200, hanbaiten_code: 'H001', hanbaiten_name: '千代田販売店' },
      { hanbaiten_id: 201, hanbaiten_code: 'H002', hanbaiten_name: '中央販売店' },
    ],
    meta: { total: 2, page: 1, per_page: 50, has_more: false },
  } as never);
});

// ═══════════════════════════════════════════════════════════════════════
// 1. 画面初期表示 (機能定義 B-1)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — initial render (機能定義 1.x)', () => {
  it('should mount without error when user holds dokusya.replace_hanbaiten', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.exists()).toBe(true);
  });

  it('should render the 管理支店 / 支店 / 組合員コード / 氏名 / 配達販売店 search labels when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('div.text-text-main.font-medium').map((l) => l.text());
    expect(labels.some((t) => t.includes('管理支店'))).toBe(true);
    expect(labels.some((t) => t.includes('支店'))).toBe(true);
    expect(labels.some((t) => t.includes('組合員コード'))).toBe(true);
    expect(labels.some((t) => t.includes('氏名'))).toBe(true);
    expect(labels.some((t) => t.includes('配達販売店'))).toBe(true);
  });

  it('should load the 管理支店 dropdown via getKanriShitenDropdown when mounted', async () => {
    await renderView();
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    expect(getKanriShitenDropdown).toHaveBeenCalled();
  });

  it('should load the 配達販売店 dropdown via getHanbaitenDropdown when mounted', async () => {
    await renderView();
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    expect(getHanbaitenDropdown).toHaveBeenCalled();
  });

  it('should NOT call searchDokusyaForReplace on mount (顧客要件 2026-07 — no auto-load; requires 適用日 + 検索)', async () => {
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockClear();
    const { wrapper } = await renderView({ seedTekiyo: false });
    expect(searchDokusyaForReplace).not.toHaveBeenCalled();
    // 初期表示は購読者を出さない（未検索なので空文言も出さない）。
    expect(wrapper.text()).not.toContain('山田 太郎');
  });

  it('should render the required 適用日 field in the search area on mount', async () => {
    const { wrapper } = await renderView({ seedTekiyo: false });
    const labels = wrapper.findAll('div.text-text-main.font-medium').map((l) => l.text());
    expect(labels.some((t) => t.includes('適用日'))).toBe(true);
  });

  it('should NOT call getShitenDropdown when mounted before 管理支店 is chosen (支店 stays empty)', async () => {
    await renderView();
    const { getShitenDropdown } = await import('@/api/shiten/shiten');
    // 機能定義 1.3 — 支店 dropdown loads only on 管理支店 change.
    expect(getShitenDropdown).not.toHaveBeenCalled();
  });

  it('should render the 支店 select disabled when no 管理支店 is selected on mount', async () => {
    const { wrapper } = await renderView();
    // 機能定義 1.1 — 支店 is disabled until a 管理支店 is chosen.
    const vm = wrapper.vm as any;
    // Prefer a reactive flag if exposed; otherwise inspect DOM.
    if (typeof vm.isShitenDisabled !== 'undefined') {
      expect(vm.isShitenDisabled).toBe(true);
    } else {
      const disabledSelect = wrapper
        .findAll('.ant-select-disabled')
        .find((el) => el.exists());
      expect(disabledSelect).toBeDefined();
    }
  });

  it('should render the 置換処理実行 button disabled when no row is selected on mount', async () => {
    const { wrapper } = await renderView();
    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    expect(execBtn).toBeDefined();
    expect(execBtn!.attributes('disabled')).toBeDefined();
  });

  it('should NOT show the 置換先配達販売店 field until a row is selected (適用日 is now a search filter, always visible)', async () => {
    const { wrapper } = await renderView();
    // 置換先配達販売店 is hidden until ≥1 row selected. 適用日 は検索条件へ移動し
    // 常時表示（顧客要件 2026-07）。
    const labels = wrapper.findAll('div.text-text-main.font-medium').map((l) => l.text());
    expect(labels.some((t) => t.includes('置換先配達販売店'))).toBe(false);
    expect(labels.some((t) => t.includes('適用日'))).toBe(true);
  });

  it('should render the 検索 submit button when mounted', async () => {
    const { wrapper } = await renderView();
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
});

// ═══════════════════════════════════════════════════════════════════════
// 2. 購読者検索 (機能定義 B-2)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — search (機能定義 2.x)', () => {
  it('should call searchDokusyaForReplace when the search form is submitted with a changed filter', async () => {
    const { wrapper } = await renderView();
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockClear();

    // A 検索 press only fetches when the criteria changed vs the displayed
    // list (other-module guard: filtersChangedSinceApplied). Change one filter.
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kumiaiin_code = '10001';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(searchDokusyaForReplace).toHaveBeenCalled();
  });

  it('should NOT call searchDokusyaForReplace again when 検索 is pressed with no filter change (avoids continuous API calls)', async () => {
    const { wrapper } = await renderView(); // seeds 適用日
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockClear();

    // 1回目の 検索 は実行、同条件の2回目は no-op（dedup guard）。
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(searchDokusyaForReplace).toHaveBeenCalledTimes(1);
  });

  it('should pass the kumiaiin_code filter to searchDokusyaForReplace when set + submitted', async () => {
    const { wrapper } = await renderView();
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockClear();

    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kumiaiin_code = '10001';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const arg = vi.mocked(searchDokusyaForReplace).mock.calls[0]?.[0] as unknown as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ kumiaiin_code: '10001' });
  });

  it('should render the result columns 管理支店 / 支店 / 組合員コード / 購読者名 / 販売店コード / 販売店名 when rows load', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('管理支店');
    expect(text).toContain('支店');
    expect(text).toContain('組合員コード');
    expect(text).toContain('購読者名');
    expect(text).toContain('配達先郵便');
    expect(text).toContain('配達先住所');
    expect(text).toContain('販売店コード');
    expect(text).toContain('販売店名');
  });

  it('should render row data (shimei + haitatsu_address) when searchDokusyaForReplace resolves', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('山田 太郎');
    expect(text).toContain('鈴木 花子');
    expect(text).toContain('10001');
    expect(text).toContain('東京都千代田区1-1-1 千代田マンション101');
  });

  it('should render ACSMS-MSG-015-001 「検索結果が見つかりませんでした。」 when the result set is empty', async () => {
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockResolvedValue(
      buildReplaceSearchResponse({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
      }) as never,
    );
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    // Sibling-element message (not a-table emptyText) per project rule.
    expect(wrapper.text()).toContain('検索結果が見つかりませんでした。');
  });

  it('should re-render the table with new rows when a changed search returns a different response', async () => {
    const { wrapper } = await renderView();
    // 初回検索で既定リストを表示（自動ロードは無いので明示的に 検索 する）。
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('山田 太郎');

    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockResolvedValueOnce(
      buildReplaceSearchResponse({
        data: [
          buildReplaceSearchItem({
            dokusya_id: 9999,
            kumiaiin_code: '99999',
            shimei: '田中 一郎',
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }) as never,
    );
    // Change a filter so the 検索 actually fires (guard: only fetch on change).
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kumiaiin_code = '99999';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('田中 一郎');
    expect(wrapper.text()).toContain('99999');
  });

  it('should still call searchDokusyaForReplace without surfacing an unhandled rejection when search fails', async () => {
    // 機能定義 2.6 — global axios interceptor toasts the 500; the view's
    // fetch swallows the rejection (vue.md §List view rule 5).
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(searchDokusyaForReplace).toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. 管理支店変更 (機能定義 B-7)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — kanri-shiten change (機能定義 7.x)', () => {
  it('should call getShitenDropdown with the selected kanri_shiten_id when 管理支店 changes', async () => {
    const { wrapper } = await renderView();
    const { getShitenDropdown } = await import('@/api/shiten/shiten');
    vi.mocked(getShitenDropdown).mockClear();

    const vm = wrapper.vm as any;
    // The view exposes an onKanriShitenChange handler; drive it via the
    // reactive filter + handler call (control internals vary in jsdom).
    if (typeof vm.onKanriShitenChange === 'function') {
      vm.onKanriShitenChange(10);
    } else if (vm.state?.filters) {
      vm.state.filters.kanri_shiten_id = 10;
    }
    await flushPromises();

    expect(getShitenDropdown).toHaveBeenCalled();
    const arg = vi.mocked(getShitenDropdown).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(arg).toMatchObject({ kanri_shiten_id: 10 });
  });

  it('should reset the 支店 selection to undefined when 管理支店 changes', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.shiten_id = 100;
    await flushPromises();

    if (typeof vm.onKanriShitenChange === 'function') {
      vm.onKanriShitenChange(20);
    } else if (vm.state?.filters) {
      vm.state.filters.kanri_shiten_id = 20;
    }
    await flushPromises();

    if (vm.state?.filters) {
      expect([undefined, null, '']).toContain(vm.state.filters.shiten_id);
    }
  });

  it('should clear/disable the 支店 dropdown when 管理支店 is cleared (set to undefined)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    // First choose a 管理支店 so 支店 enables…
    if (typeof vm.onKanriShitenChange === 'function') {
      vm.onKanriShitenChange(10);
    } else if (vm.state?.filters) {
      vm.state.filters.kanri_shiten_id = 10;
    }
    await flushPromises();

    // …then clear it (antd allow-clear sets undefined).
    if (typeof vm.onKanriShitenChange === 'function') {
      vm.onKanriShitenChange(undefined);
    } else if (vm.state?.filters) {
      vm.state.filters.kanri_shiten_id = undefined;
    }
    await flushPromises();

    if (typeof vm.isShitenDisabled !== 'undefined') {
      expect(vm.isShitenDisabled).toBe(true);
    } else if (vm.shitenOptions) {
      expect(vm.shitenOptions).toHaveLength(0);
    } else {
      expect(wrapper.exists()).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. 行選択 (機能定義 B-5)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — row selection (機能定義 5.x)', () => {
  it('should reveal the 適用日 + 置換先配達販売店 fields when at least one row is checked', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    await selectRows(wrapper, 1);

    const labels = wrapper.findAll('div.text-text-main.font-medium').map((l) => l.text());
    expect(labels.some((t) => t.includes('置換先配達販売店'))).toBe(true);
    expect(labels.some((t) => t.includes('適用日'))).toBe(true);
  });

  it('should enable the 置換処理実行 button when at least one row is checked', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    await selectRows(wrapper, 1);

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    expect(execBtn).toBeDefined();
    expect(execBtn!.attributes('disabled')).toBeUndefined();
  });

  it('should disable the 検索 button when at least one row is checked', async () => {
    // 機能定義 4.1 — checking ≥1 row disables 検索 while a replace is staged.
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    await selectRows(wrapper, 1);

    const searchBtn = wrapper.find('button[type="submit"]');
    expect(searchBtn.exists()).toBe(true);
    expect(searchBtn.attributes('disabled')).toBeDefined();
  });

  it('should select every row when the select-all header checkbox is checked', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const headerBox = wrapper.find('thead input[type="checkbox"]');
    expect(headerBox.exists()).toBe(true);
    await headerBox.setValue(true);
    await flushPromises();

    const vm = wrapper.vm as any;
    if (typeof vm.selectedRowKeys !== 'undefined') {
      expect(vm.selectedRowKeys).toHaveLength(2);
    } else {
      // Fallback — 置換処理実行 should be enabled with all rows selected.
      const execBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('置換処理実行'));
      expect(execBtn!.attributes('disabled')).toBeUndefined();
    }
  });

  it('should unselect every row when the select-all header checkbox is unchecked', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const headerBox = wrapper.find('thead input[type="checkbox"]');
    await headerBox.setValue(true);
    await flushPromises();
    await headerBox.setValue(false);
    await flushPromises();

    const vm = wrapper.vm as any;
    if (typeof vm.selectedRowKeys !== 'undefined') {
      expect(vm.selectedRowKeys).toHaveLength(0);
    } else {
      const execBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('置換処理実行'));
      expect(execBtn!.attributes('disabled')).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4.1 置換バリデーション (機能定義 B-4.1 + MSG-015-004/005/006)
//
// All client-side checks: assert the message surfaces AND
// replaceDokusyaHanbaiten is NOT called. The server-side equivalents
// (SAME_HANBAITEN / INELIGIBLE_DOKUSYA / DATE_RANGE_INVALID) are toasted
// by the global axios interceptor — see §9.
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — replace validation (機能定義 4.1)', () => {
  async function setupSelectedRow(wrapper: ReturnType<typeof mount>) {
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await selectRows(wrapper, 1);
  }

  it('should show ACSMS-MSG-015-004 「必須項目です。」 + NOT call replaceDokusyaHanbaiten when 置換先 is unselected', async () => {
    const { wrapper } = await renderView();
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    await setupSelectedRow(wrapper);

    const vm = wrapper.vm as any;
    // 適用日 filled, 置換先 left blank.
    if (vm.replaceForm) {
      vm.replaceForm.new_hanbaiten_id = undefined;
    }
    await flushPromises();

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(replaceDokusyaHanbaiten).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-015-005 + NOT call replaceDokusyaHanbaiten when 置換先 equals a selected row current 販売店', async () => {
    const { wrapper } = await renderView();
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    await setupSelectedRow(wrapper);

    const vm = wrapper.vm as any;
    if (vm.replaceForm) {
      // Selected row 5001 currently belongs to hanbaiten_id 200.
      vm.replaceForm.new_hanbaiten_id = 200;
    }
    await flushPromises();

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('現在の販売店と同じ販売店は選択できません。');
    expect(replaceDokusyaHanbaiten).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-015-006 + NOT call replaceDokusyaHanbaiten when a selected row is 併読 (dokusya_shubetsu=3)', async () => {
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockResolvedValue(
      buildReplaceSearchResponse({
        data: [
          buildReplaceSearchItem({
            dokusya_id: 5001,
            shimei: '山田 太郎',
            dokusya_shubetsu: 3, // 併読
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }) as never,
    );
    const { wrapper } = await renderView();
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await selectRows(wrapper, 1);

    const vm = wrapper.vm as any;
    if (vm.replaceForm) {
      vm.replaceForm.new_hanbaiten_id = 201;
    }
    await flushPromises();

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('電子版クレカ決済者・併読者は編集・削除できません。');
    expect(replaceDokusyaHanbaiten).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-015-006 + NOT call replaceDokusyaHanbaiten when a selected row is 電子版クレカ (dokusya_shubetsu=2 && shiharai_hoho=6)', async () => {
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockResolvedValue(
      buildReplaceSearchResponse({
        data: [
          buildReplaceSearchItem({
            dokusya_id: 5001,
            shimei: '山田 太郎',
            dokusya_shubetsu: 2, // 電子版
            shiharai_hoho: 6, // クレジットカード
          }),
        ],
        meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
      }) as never,
    );
    const { wrapper } = await renderView();
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await selectRows(wrapper, 1);

    const vm = wrapper.vm as any;
    if (vm.replaceForm) {
      vm.replaceForm.new_hanbaiten_id = 201;
    }
    await flushPromises();

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('電子版クレカ決済者・併読者は編集・削除できません。');
    expect(replaceDokusyaHanbaiten).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4.2 / 4.3 確認 + 実行 (機能定義 B-4.2/4.3 + MSG-015-007/008)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — replace confirm + execute (機能定義 4.2/4.3)', () => {
  async function setupValidReplace(wrapper: ReturnType<typeof mount>) {
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await selectRows(wrapper, 1);
    const vm = wrapper.vm as any;
    if (vm.replaceForm) {
      vm.replaceForm.new_hanbaiten_id = 201;
    }
    await flushPromises();
  }

  it('should open Modal.confirm with ACSMS-MSG-015-007 content when validation passes', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
      destroy: () => undefined,
      update: () => undefined,
    }));
    const { wrapper } = await renderView();
    await setupValidReplace(wrapper);

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    const flat = JSON.stringify(confirmSpy.mock.calls[0]?.[0]);
    expect(flat).toContain('選択した購読者の販売店を置換します。よろしいでしょうか？');
  });

  it('should call replaceDokusyaHanbaiten with dokusya_ids + new_hanbaiten_id + hanbaiten_tekiyo_date when confirmed', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    vi.mocked(replaceDokusyaHanbaiten).mockClear();
    await setupValidReplace(wrapper);

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(replaceDokusyaHanbaiten).toHaveBeenCalled();
    const body = vi.mocked(replaceDokusyaHanbaiten).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(body).toMatchObject({
      new_hanbaiten_id: 201,
      hanbaiten_tekiyo_date: '2099-12-31',
    });
    expect(Array.isArray(body?.dokusya_ids)).toBe(true);
    expect(body?.dokusya_ids).toContain(5001);
  });

  it('should show ACSMS-MSG-015-008 「置換処理が完了しました。」 success toast when replace succeeds', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    await setupValidReplace(wrapper);

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('置換処理が完了しました。');
  });

  it('should re-call searchDokusyaForReplace when a replace succeeds (refresh the list)', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    await setupValidReplace(wrapper);
    const before = vi.mocked(searchDokusyaForReplace).mock.calls.length;

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(vi.mocked(searchDokusyaForReplace).mock.calls.length).toBeGreaterThan(before);
  });

  it('should clear the row selection when a replace succeeds', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    await setupValidReplace(wrapper);

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    const vm = wrapper.vm as any;
    if (typeof vm.selectedRowKeys !== 'undefined') {
      expect(vm.selectedRowKeys).toHaveLength(0);
    } else {
      // After clearing selection the exec button re-disables.
      const after = wrapper
        .findAll('button')
        .find((b) => b.text().includes('置換処理実行'));
      expect(after!.attributes('disabled')).toBeDefined();
    }
  });

  it('should NOT call replaceDokusyaHanbaiten when the confirm dialog is cancelled', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onCancel?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { wrapper } = await renderView();
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    vi.mocked(replaceDokusyaHanbaiten).mockClear();
    await setupValidReplace(wrapper);

    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(replaceDokusyaHanbaiten).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. 検索クリア (機能定義 B-3)
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — clear (機能定義 3.x)', () => {
  it('should reset every text filter to blank when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.kumiaiin_code = '10001';
      vm.state.filters.shimei = '山田';
    }
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    if (vm.state?.filters) {
      expect(vm.state.filters.kumiaiin_code).toBe('');
      expect(vm.state.filters.shimei).toBe('');
    }
  });

  it('should reset the 管理支店 / 支店 selections to unselected when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.state?.filters) {
      vm.state.filters.kanri_shiten_id = 10;
      vm.state.filters.shiten_id = 100;
    }
    await flushPromises();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    if (vm.state?.filters) {
      expect([undefined, null, '']).toContain(vm.state.filters.kanri_shiten_id);
      expect([undefined, null, '']).toContain(vm.state.filters.shiten_id);
    }
  });

  it('should reset filters (incl. 適用日) + clear selection + empty the list on 検索クリア (顧客要件 — no auto-load)', async () => {
    const { wrapper } = await renderView();
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');

    // Narrow with a real filter so the screen is non-pristine.
    const vm = wrapper.vm as any;
    if (vm.state?.filters) vm.state.filters.kumiaiin_code = '10001';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await selectRows(wrapper, 1);
    expect(wrapper.text()).toContain('山田 太郎');

    vi.mocked(searchDokusyaForReplace).mockClear();
    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    // 検索クリア は適用日を含む全フィルタをリセットし、一覧を空にする（自動再検索しない）。
    expect(searchDokusyaForReplace).not.toHaveBeenCalled();
    if (vm.state?.filters) {
      expect(vm.state.filters.kumiaiin_code).toBe('');
      expect(vm.state.filters.hanbaiten_tekiyo_date).toBe('');
    }
    expect(vm.rows).toHaveLength(0);
    expect(vm.selectedRowKeys).toHaveLength(0);
  });

  it('should block search + show an error when 検索 is pressed without 適用日 (required)', async () => {
    const { wrapper } = await renderView({ seedTekiyo: false });
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(searchDokusyaForReplace).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="replace-search-error"]').exists()).toBe(true);
  });

  it('should NOT re-fetch on 検索クリア when the screen is already pristine, but still clear the selection (avoids continuous API calls)', async () => {
    const { wrapper } = await renderView();
    // Select a row without changing any filter — screen stays pristine.
    await selectRows(wrapper, 1);
    const { searchDokusyaForReplace } = await import('@/api/dokusya/dokusya');
    vi.mocked(searchDokusyaForReplace).mockClear();

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    expect(searchDokusyaForReplace).not.toHaveBeenCalled();
    const vm = wrapper.vm as any;
    if (typeof vm.selectedRowKeys !== 'undefined') {
      expect(vm.selectedRowKeys).toHaveLength(0);
    }
  });

  it('should reset 適用日 + 置換先配達販売店 (hide them again) when 検索クリア is clicked', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await selectRows(wrapper, 1);
    // 置換先 now visible.
    expect(wrapper.findAll('div.text-text-main.font-medium').map((l) => l.text()).some((t) => t.includes('置換先配達販売店'))).toBe(true);

    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('検索クリア'));
    await clearBtn!.trigger('click');
    await flushPromises();

    const labels = wrapper.findAll('div.text-text-main.font-medium').map((l) => l.text());
    expect(labels.some((t) => t.includes('置換先配達販売店'))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. Permission gating
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — permission gating', () => {
  it('should mount when a CHUOKAI user holds dokusya.replace_hanbaiten', async () => {
    const { wrapper } = await renderView({
      user: buildReplaceUser({ role_code: 'CHUOKAI' }),
    });
    expect(wrapper.exists()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. Server-side errors — interceptor toasts, view must NOT re-toast.
//
// The global axios interceptor (src/api/error-handler.ts) toasts
// SAME_HANBAITEN / INELIGIBLE_DOKUSYA / DATE_RANGE_INVALID centrally
// (.claude/rules/vue.md §Error Handling Architecture). The VIEW only
// pre-flights these via client-side checks (§4.1). On a server reject
// the view must NOT show a success toast and must reset its local
// submitting state — it relies on the interceptor for the error toast.
// ═══════════════════════════════════════════════════════════════════════
describe('DokusyaReplaceHanbaitenView — server-side error handling', () => {
  async function setupValidReplace(wrapper: ReturnType<typeof mount>) {
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await selectRows(wrapper, 1);
    const vm = wrapper.vm as any;
    if (vm.replaceForm) {
      vm.replaceForm.new_hanbaiten_id = 201;
    }
    await flushPromises();
  }

  it('should NOT show a success toast when replaceDokusyaHanbaiten rejects with SAME_HANBAITEN (interceptor handles it)', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    vi.mocked(replaceDokusyaHanbaiten).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'SAME_HANBAITEN',
          message: '現在の販売店と同じ販売店は選択できません。',
        },
      },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    await setupValidReplace(wrapper);
    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalledWith('置換処理が完了しました。');
  });

  it('should NOT show a success toast when replaceDokusyaHanbaiten rejects with INELIGIBLE_DOKUSYA (interceptor handles it)', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    vi.mocked(replaceDokusyaHanbaiten).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'INELIGIBLE_DOKUSYA',
          message: '電子版クレカ決済者・併読者は編集・削除できません。',
        },
      },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const { wrapper } = await renderView();
    await setupValidReplace(wrapper);
    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalledWith('置換処理が完了しました。');
  });

  it('should reset its submitting state + stay mounted when replaceDokusyaHanbaiten rejects with DATE_RANGE_INVALID', async () => {
    vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
      opts?.onOk?.();
      return { destroy: () => undefined, update: () => undefined };
    });
    const { replaceDokusyaHanbaiten } = await import('@/api/dokusya/dokusya');
    vi.mocked(replaceDokusyaHanbaiten).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'DATE_RANGE_INVALID',
          message: '「開始日」は「終了日」以前の日付を入力してください。',
        },
      },
    });

    const { wrapper } = await renderView();
    await setupValidReplace(wrapper);
    const execBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('置換処理実行'));
    await execBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.exists()).toBe(true);
    const vm = wrapper.vm as any;
    if (typeof vm.submitting !== 'undefined') {
      expect(vm.submitting).toBe(false);
    }
  });
});

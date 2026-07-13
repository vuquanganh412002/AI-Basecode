// Screen: ACSMS-SCR-021 — 配達手数料支払情報出力画面
//
// Drives src/views/haitatsuryo/HaitatsuryoExportView.vue. Each it() maps to a
// clause in:
//   docs/design/ACSMS-SCR-021/screen-design.md (機能定義 + メッセージ情報)
//   docs/design/ACSMS-SCR-021/index.html (UI labels: 年月日 / 検索 / Excel出力 / table cols)
//   docs/design/ACSMS-SCR-021/ACSMS-SCR-021-api.md (API-021-001 preview / 002 Excel)
//
// The view defineExposes `{ formState, page, perPage, onPageChange }` so setup
// can seed 年月日 / サイクル and drive pagination (antd controls aren't drivable
// via jsdom DOM events). Buttons are clicked through `[data-test]` markers.
// 対象0件は 200 + data:[] で返るため、no-data は画面内テキスト表示で表現される
// （SCR-026/028 と同じ 200+empty 方針）。

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { endOfMonthIsoTokyo } from '@/utils/datetime';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import HaitatsuryoExportView from '@/views/haitatsuryo/HaitatsuryoExportView.vue';
import {
  buildHaitatsuryoUser,
  buildHaitatsuryoPreviewResponse,
  buildEmptyHaitatsuryoPreviewResponse,
} from '@test/fixtures/haitatsuryo.fixture';

// API wrapper — /gen-code-frontend emits @/api/haitatsuryo/haitatsuryo with the
// two SCR-021 functions.
vi.mock('@/api/haitatsuryo/haitatsuryo', () => ({
  previewHaitatsuryo: vi.fn(),
  exportHaitatsuryo: vi.fn(),
}));

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Blob → file download helpers the Excel export uses.
const createObjectURL = vi.fn(() => 'blob:mock-url');
const revokeObjectURL = vi.fn();
beforeEach(() => {
  Object.defineProperty(window.URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  });
});

interface RenderOptions {
  user?: ReturnType<typeof buildHaitatsuryoUser>;
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
        path: '/haitatsuryo',
        name: 'HaitatsuryoExport',
        component: { template: '<div />' },
      },
      {
        path: '/hanbaiten/:id/edit',
        name: 'HanbaitenEdit',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'HaitatsuryoExport' });
  await router.isReady();

  const wrapper = mount(HaitatsuryoExportView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildHaitatsuryoUser() },
            codes: {
              all: {
                TESURYO_KUBUN: [
                  { value: 1, label: 'JA', label_short: 'JA' },
                  { value: 2, label: '販売店', label_short: '販売店' },
                ],
              },
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

const previewBtn = () => '[data-test="preview-btn"]';
const exportBtn = () => '[data-test="export-btn"]';

beforeEach(async () => {
  vi.clearAllMocks();
  const { previewHaitatsuryo, exportHaitatsuryo } = await import(
    '@/api/haitatsuryo/haitatsuryo'
  );
  vi.mocked(previewHaitatsuryo).mockResolvedValue(buildHaitatsuryoPreviewResponse());
  vi.mocked(exportHaitatsuryo).mockResolvedValue(
    new Blob(['PK-xlsx'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1)
// ───────────────────────────────────────────────────────────────────────
describe('HaitatsuryoExportView — 画面初期表示', () => {
  it('should render the 年月日 / サイクル labels when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('年月日');
    expect(text).toContain('サイクル');
  });

  it('should render the 検索 and Excel出力 buttons when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find(previewBtn()).exists()).toBe(true);
    expect(wrapper.find(exportBtn()).exists()).toBe(true);
  });

  it('should default 年月日 (target_month) to the last day of the current month (JST)', async () => {
    const { wrapper } = await renderView();
    expect((wrapper.vm as any).formState.target_month).toBe(endOfMonthIsoTokyo());
  });

  it('should NOT render any aggregation rows when first mounted (empty grid)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).not.toContain('東京中央販売店');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 検索・集計 (機能定義 2 — レポートプレビュー)
// ───────────────────────────────────────────────────────────────────────
describe('HaitatsuryoExportView — 検索・集計', () => {
  it('should show 必須項目です。 and NOT call previewHaitatsuryo when 年月日 is empty', async () => {
    const { wrapper } = await renderView();
    const { previewHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    (wrapper.vm as any).formState.target_month = '';

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(previewHaitatsuryo).not.toHaveBeenCalled();
  });

  it('should NOT show エラーが発生しました when 年月日 is cleared to undefined (optional-chaining guard)', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.target_month = undefined;

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should call previewHaitatsuryo with target_month + cycle when 年月日 is valid', async () => {
    const { wrapper } = await renderView();
    const { previewHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    (wrapper.vm as any).formState.target_month = '2026-04-01';
    (wrapper.vm as any).formState.haitatsuryo_shiharai_cycle = 3;

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(previewHaitatsuryo).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(previewHaitatsuryo).mock.calls[0]?.[0];
    expect(arg.target_month).toBe('2026-04-01');
    expect(arg.haitatsuryo_shiharai_cycle).toBe(3);
  });

  it('should call previewHaitatsuryo even when no サイクル is selected (optional filter)', async () => {
    const { wrapper } = await renderView();
    const { previewHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    (wrapper.vm as any).formState.target_month = '2026-04-01';
    (wrapper.vm as any).formState.haitatsuryo_shiharai_cycle = undefined;

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(previewHaitatsuryo).toHaveBeenCalledTimes(1);
  });

  it('should render the 対象月 / 販売店コード / 当月部数 / 当月金額 column titles when previewHaitatsuryo resolves data', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.target_month = '2026-04-01';

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('対象月');
    expect(text).toContain('販売店コード');
    expect(text).toContain('当月部数');
    expect(text).toContain('当月金額');
    // 手数料 (配達手数料単価) column header — 画面イメージ §出力項目。
    // Asserted via <th> (not wrapper.text()) because 手数料 also appears
    // in the 配達手数料支払サイクル form label.
    const headers = wrapper.findAll('thead th').map((th) => th.text());
    expect(headers).toContain('手数料');
  });

  it('should render the 販売店 aggregation row (code + name + busu) when previewHaitatsuryo resolves data', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.target_month = '2026-04-01';

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('H001');
    expect(text).toContain('東京中央販売店');
    expect(text).toContain('120');
    // 手数料 cell — 振込手数料負担区分（m_code TESURYO_KUBUN）のラベル。
    // 先頭行 furikomi_tesuryo_futan_kubun=1 → 'JA'。
    expect(text).toContain('JA');
  });

  it('should render the 合計 total row when previewHaitatsuryo resolves data', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.target_month = '2026-04-01';

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('合計');
  });

  it('should show 該当する支払い情報が存在しません。 when previewHaitatsuryo resolves an empty data array', async () => {
    const { wrapper } = await renderView();
    const { previewHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    vi.mocked(previewHaitatsuryo).mockResolvedValueOnce(
      buildEmptyHaitatsuryoPreviewResponse(),
    );
    (wrapper.vm as any).formState.target_month = '2026-04-01';

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('該当する支払い情報が存在しません。');
  });

  it('should always render 販売店コード as plain text (no link), even with hanbaiten.update', async () => {
    // 権限有無に関わらずリンク化せずプレーンテキストで表示する（画面遷移なし）。
    const { wrapper } = await renderView({
      user: buildHaitatsuryoUser({ permissions: ['haitatsuryo.export', 'hanbaiten.update'] }),
    });
    (wrapper.vm as any).formState.target_month = '2026-04-01';

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const codeLink = wrapper.findAll('tbody a').find((a) => a.text().includes('H001'));
    expect(codeLink).toBeUndefined();
    expect(wrapper.text()).toContain('H001');
  });

  it('should render the pagination control with 全N件 after previewHaitatsuryo resolves data', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.target_month = '2026-04-01';

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    // BaseDataTable のページネーション（antd 内蔵）。
    expect(wrapper.find('.ant-pagination').exists()).toBe(true);
    expect(wrapper.text()).toContain('全 2 件');
  });

  it('should re-fetch previewHaitatsuryo with the new page / per_page when the page changes', async () => {
    const { wrapper } = await renderView();
    const { previewHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    (wrapper.vm as any).formState.target_month = '2026-04-01';

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();
    vi.mocked(previewHaitatsuryo).mockClear();

    // a-pagination の @change(page, pageSize) を直接呼ぶ（exposed handler）。
    (wrapper.vm as any).onPageChange(2, 10);
    await flushPromises();

    expect(previewHaitatsuryo).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(previewHaitatsuryo).mock.calls[0]?.[0];
    expect(arg.page).toBe(2);
    expect(arg.per_page).toBe(10);
    expect(arg.target_month).toBe('2026-04-01');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. Excel出力 (機能定義 3)
// ───────────────────────────────────────────────────────────────────────
describe('HaitatsuryoExportView — Excel出力', () => {
  /** 検索でデータを取得して Excel出力 ボタンを活性化する。 */
  async function searchWithData(wrapper: any): Promise<void> {
    wrapper.vm.formState.target_month = '2026-04-01';
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();
  }

  it('should disable Excel出力 on initial mount (no preview data yet) and NOT call exportHaitatsuryo on click', async () => {
    const { wrapper } = await renderView();
    const { exportHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');

    const btn = wrapper.find(exportBtn());
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);

    await btn.trigger('click');
    await flushPromises();
    expect(exportHaitatsuryo).not.toHaveBeenCalled();
  });

  it('should keep Excel出力 disabled when 検索 returns no data', async () => {
    const { wrapper } = await renderView();
    const { previewHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    vi.mocked(previewHaitatsuryo).mockResolvedValueOnce(
      buildEmptyHaitatsuryoPreviewResponse(),
    );
    await searchWithData(wrapper);

    expect((wrapper.find(exportBtn()).element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should call exportHaitatsuryo and create a Blob object URL when Excel出力 is clicked after 検索 returns data', async () => {
    const { wrapper } = await renderView();
    const { exportHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    await searchWithData(wrapper);

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportHaitatsuryo).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('should show 該当する支払い情報が存在しません。 and NOT download when Excel出力 returns an application/json (no-data) blob', async () => {
    const { wrapper } = await renderView();
    const { exportHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    await searchWithData(wrapper);
    // 対象0件 → BE は xlsx ではなく application/json の Blob を返す。
    vi.mocked(exportHaitatsuryo).mockResolvedValueOnce(
      new Blob([JSON.stringify({ data: [] })], { type: 'application/json' }),
    );

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('該当する支払い情報が存在しません。');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('should still call exportHaitatsuryo when it rejects with 500 (interceptor handles the toast)', async () => {
    const { wrapper } = await renderView();
    const { exportHaitatsuryo } = await import('@/api/haitatsuryo/haitatsuryo');
    await searchWithData(wrapper);
    vi.mocked(exportHaitatsuryo).mockRejectedValueOnce({
      error_code: 'INTERNAL_SERVER_ERROR',
    });

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportHaitatsuryo).toHaveBeenCalled();
  });
});

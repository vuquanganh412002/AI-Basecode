// Screen: ACSMS-SCR-026 — 購読者名簿出力画面
//
// Drives src/views/report/MeiboReportView.vue. Each it() maps to a clause in
//   docs/design/ACSMS-SCR-026/screen-design.md (機能定義 + メッセージ情報)
//   docs/design/ACSMS-SCR-026/index.html (UI labels)
//   docs/design/ACSMS-SCR-026/ACSMS-SCR-026-api.md (API-026-001 / 002)
//
// The view defineExposes `{ formState }` so setup can seed the 適用日 /
// 販売店 / 管理支店 selections (antd multi-selects aren't drivable via
// jsdom DOM events). Buttons are clicked through `[data-test]` markers.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import MeiboReportView from '@/views/report/MeiboReportView.vue';
import {
  buildReportUser,
  buildNichinoUser,
  buildHanbaitenPreviewResponse,
  buildEmptyPreviewResponse,
  buildHanbaitenDropdownResponse,
  buildKanriShitenDropdownResponse,
} from '@test/fixtures/report.fixture';

// API wrappers — /gen-code-frontend creates these.
vi.mock('@/api/report/report', () => ({
  previewMeibo: vi.fn(),
  exportMeibo: vi.fn(),
}));
vi.mock('@/api/hanbaiten/hanbaiten', () => ({
  getHanbaitenDropdown: vi.fn(),
}));
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
}));

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Blob → file download helpers the export uses.
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
  user?: ReturnType<typeof buildReportUser>;
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
      { path: '/report/meibo', name: 'MeiboReport', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'MeiboReport' });
  await router.isReady();

  const wrapper = mount(MeiboReportView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildReportUser() },
            codes: {
              all: {
                // 紙版/電子版 のみ選択可（併読(3)は本帳票では除外）。
                DOKUSYA_SHUBETSU: [
                  { value: 1, label: '紙版', label_short: '紙版' },
                  { value: 2, label: '電子版', label_short: '電子版' },
                  { value: 3, label: '併読', label_short: '併読' },
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

const preview = () => '[data-test="preview-btn"]';
const exportBtn = () => '[data-test="export-btn"]';

beforeEach(async () => {
  vi.clearAllMocks();
  const { previewMeibo, exportMeibo } = await import('@/api/report/report');
  vi.mocked(previewMeibo).mockResolvedValue(buildHanbaitenPreviewResponse());
  vi.mocked(exportMeibo).mockResolvedValue(
    new Blob(['xlsx'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
  vi.mocked(getHanbaitenDropdown).mockResolvedValue(buildHanbaitenDropdownResponse());
  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  vi.mocked(getKanriShitenDropdown).mockResolvedValue(buildKanriShitenDropdownResponse());
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1)
// ───────────────────────────────────────────────────────────────────────
describe('MeiboReportView — 画面初期表示', () => {
  it('should render the 適用日 / 帳票種別 / 購読種別 labels when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('適用日');
    expect(text).toContain('帳票種別');
    expect(text).toContain('購読種別');
  });

  it('should default report_type to hanbaiten (販売店別) when first mounted', async () => {
    const { wrapper } = await renderView();
    expect((wrapper.vm as any).formState.report_type).toBe('hanbaiten');
  });

  it('should render the レポートプレビュー and Excel出力 buttons when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find(preview()).exists()).toBe(true);
    expect(wrapper.find(exportBtn()).exists()).toBe(true);
  });

  it('should NOT render any preview rows when first mounted (empty preview area)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).not.toContain('農業 太郎');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 帳票種別切替 (機能定義 2)
// ───────────────────────────────────────────────────────────────────────
describe('MeiboReportView — 帳票種別切替', () => {
  it('should always render the 支払区分 condition when report_type is hanbaiten or kanri_shiten', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('支払区分');

    (wrapper.vm as any).formState.report_type = 'kanri_shiten';
    await flushPromises();

    expect(wrapper.text()).toContain('支払区分');
  });

  it('should clear the previously loaded preview when report_type is switched', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];
    await wrapper.find(preview()).trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('農業 太郎');

    (wrapper.vm as any).formState.report_type = 'kanri_shiten';
    await flushPromises();

    expect(wrapper.text()).not.toContain('農業 太郎');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. レポートプレビュー (機能定義 3 + メッセージ)
// ───────────────────────────────────────────────────────────────────────
describe('MeiboReportView — レポートプレビュー', () => {
  it('should show 必須項目です。 and NOT call previewMeibo when 適用日 is empty', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];

    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(previewMeibo).not.toHaveBeenCalled();
  });

  it('should show 販売店を1件以上選択してください。 and NOT call previewMeibo when hanbaiten and no 販売店 selected', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.report_type = 'hanbaiten';
    (wrapper.vm as any).formState.hanbaiten_ids = [];

    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('販売店を1件以上選択してください。');
    expect(previewMeibo).not.toHaveBeenCalled();
  });

  it('should show 管理支店を1件以上選択してください。 and NOT call previewMeibo when kanri_shiten and no 管理支店 selected', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.report_type = 'kanri_shiten';
    (wrapper.vm as any).formState.kanri_shiten_ids = [];
    await flushPromises();

    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('管理支店を1件以上選択してください。');
    expect(previewMeibo).not.toHaveBeenCalled();
  });

  it('should call previewMeibo with the output conditions when 適用日 + 販売店 are valid', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.report_type = 'hanbaiten';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];

    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    expect(previewMeibo).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(previewMeibo).mock.calls[0]?.[0];
    expect(arg.tekiyo_date).toBe('2026-04-01');
    expect(arg.report_type).toBe('hanbaiten');
    expect(arg.hanbaiten_ids).toEqual([1]);
  });

  it('should render the preview rows (販売店名 + 購読者名) when previewMeibo resolves data', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];

    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('東京中央販売店');
    expect(wrapper.text()).toContain('農業 太郎');
  });

  it('should show 対象のデータが存在しません。 when previewMeibo resolves an empty result', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    vi.mocked(previewMeibo).mockResolvedValueOnce(buildEmptyPreviewResponse());
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];

    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('対象のデータが存在しません。');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. Excel出力 (機能定義 4)
// ───────────────────────────────────────────────────────────────────────
describe('MeiboReportView — Excel出力', () => {
  it('should call exportMeibo and create a Blob object URL when Excel出力 is clicked with valid conditions', async () => {
    const { wrapper } = await renderView();
    const { exportMeibo } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportMeibo).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('should NOT call exportMeibo when 適用日 is empty on Excel出力 click', async () => {
    const { wrapper } = await renderView();
    const { exportMeibo } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(exportMeibo).not.toHaveBeenCalled();
  });

  it('should still call exportMeibo when it rejects with 500 (interceptor handles the toast)', async () => {
    const { wrapper } = await renderView();
    const { exportMeibo } = await import('@/api/report/report');
    vi.mocked(exportMeibo).mockRejectedValueOnce({
      error_code: 'INTERNAL_SERVER_ERROR',
    });
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportMeibo).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. 権限チェック (機能定義 1.2 — ACSMS-MSG-026-001)
// ───────────────────────────────────────────────────────────────────────
describe('MeiboReportView — 権限', () => {
  it('should show この機能はJAアカウントのみ使用できます。 when the user is a 日農 account (no report.export_meibo)', async () => {
    const { wrapper } = await renderView({ user: buildNichinoUser() });
    expect(wrapper.text()).toContain('この機能はJAアカウントのみ使用できます。');
  });

  it('should disable the レポートプレビュー button when the user lacks report.export_meibo', async () => {
    const { wrapper } = await renderView({ user: buildNichinoUser() });
    const btn = wrapper.find(preview());
    expect(btn.exists()).toBe(true);
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });
});

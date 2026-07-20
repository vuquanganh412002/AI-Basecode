// Screen: ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
//
// Drives src/views/report/ZougenHanbaitenReportView.vue. Each it() maps to a
// clause in:
//   docs/design/ACSMS-SCR-028/screen-design.md (機能定義 + メッセージ情報)
//   docs/design/ACSMS-SCR-028/index.html (UI labels: 増部 / 減部 / 住所変更)
//   docs/design/ACSMS-SCR-028/ACSMS-SCR-028-api.md (API-028-001 preview / 002 PDF)
//
// The view defineExposes `{ formState }` so setup can seed 適用日 / 販売店 /
// 管理支店 (antd controls aren't drivable via jsdom DOM events). Buttons are
// clicked through `[data-test]` markers.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import ZougenHanbaitenReportView from '@/views/report/ZougenHanbaitenReportView.vue';
import {
  buildZougenReportUser,
  buildZougenNichinoUser,
  buildZougenPreviewResponse,
  buildEmptyZougenPreviewResponse,
} from '@test/fixtures/report-zougen.fixture';
import {
  buildHanbaitenDropdownResponse,
  buildKanriShitenDropdownResponse,
} from '@test/fixtures/report.fixture';

// API wrappers — /gen-code-frontend extends @/api/report/report with the
// two SCR-028 functions.
vi.mock('@/api/report/report', () => ({
  previewZougenHanbaiten: vi.fn(),
  exportZougenHanbaiten: vi.fn(),
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

// Blob → file download helpers the PDF export uses.
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
  user?: ReturnType<typeof buildZougenReportUser>;
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
        path: '/report/zougen-hanbaiten',
        name: 'ZougenHanbaitenReport',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'ZougenHanbaitenReport' });
  await router.isReady();

  const wrapper = mount(ZougenHanbaitenReportView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildZougenReportUser() },
            codes: { all: {} },
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
  const { previewZougenHanbaiten, exportZougenHanbaiten } = await import(
    '@/api/report/report'
  );
  vi.mocked(previewZougenHanbaiten).mockResolvedValue(buildZougenPreviewResponse());
  vi.mocked(exportZougenHanbaiten).mockResolvedValue({
    blob: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    filename: '増減連絡票_JA001_2026年05月01日.pdf',
  });
  const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
  vi.mocked(getHanbaitenDropdown).mockResolvedValue(buildHanbaitenDropdownResponse());
  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  vi.mocked(getKanriShitenDropdown).mockResolvedValue(buildKanriShitenDropdownResponse());
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1)
// ───────────────────────────────────────────────────────────────────────
describe('ZougenHanbaitenReportView — 画面初期表示', () => {
  it('should render the 適用日 / 販売店 / 管理支店 labels when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('適用日');
    expect(text).toContain('販売店');
    expect(text).toContain('管理支店');
  });

  it('should render the レポートプレビュー and 電子帳票作成 buttons when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find(previewBtn()).exists()).toBe(true);
    expect(wrapper.find(exportBtn()).exists()).toBe(true);
  });

  it('should default 適用日 to empty when first mounted', async () => {
    const { wrapper } = await renderView();
    expect((wrapper.vm as any).formState.tekiyo_date).toBe('');
  });

  it('should NOT render any preview rows when first mounted (empty preview area)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).not.toContain('農業 太郎');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 権限チェック (機能定義 1.2 — ACSMS-MSG-028-001)
// ───────────────────────────────────────────────────────────────────────
describe('ZougenHanbaitenReportView — 権限', () => {
  it('should show この機能はJAアカウントのみ使用できます。 when the user is a 日農 account (no report.export_zougen_hanbaiten)', async () => {
    const { wrapper } = await renderView({ user: buildZougenNichinoUser() });
    expect(wrapper.text()).toContain('この機能はJAアカウントのみ使用できます。');
  });

  it('should disable the レポートプレビュー button when the user lacks report.export_zougen_hanbaiten', async () => {
    const { wrapper } = await renderView({ user: buildZougenNichinoUser() });
    const btn = wrapper.find(previewBtn());
    expect(btn.exists()).toBe(true);
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should disable the 電子帳票作成 button when the user lacks report.export_zougen_hanbaiten', async () => {
    const { wrapper } = await renderView({ user: buildZougenNichinoUser() });
    const btn = wrapper.find(exportBtn());
    expect(btn.exists()).toBe(true);
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. レポートプレビュー (機能定義 2 + メッセージ)
// ───────────────────────────────────────────────────────────────────────
describe('ZougenHanbaitenReportView — レポートプレビュー', () => {
  it('should show 必須項目です。 and NOT call previewZougenHanbaiten when 適用日 is empty', async () => {
    const { wrapper } = await renderView();
    const { previewZougenHanbaiten } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '';
    (wrapper.vm as any).formState.hanbaiten_id = [200];
    (wrapper.vm as any).formState.kanri_shiten_id = [30];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(previewZougenHanbaiten).not.toHaveBeenCalled();
  });

  it('should NOT show エラーが発生しました when 適用日 is cleared to undefined (optional-chaining guard)', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = undefined;

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should call previewZougenHanbaiten with tekiyo_date + hanbaiten_id when 適用日 is valid', async () => {
    const { wrapper } = await renderView();
    const { previewZougenHanbaiten } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-05-01';
    (wrapper.vm as any).formState.hanbaiten_id = [200];
    (wrapper.vm as any).formState.kanri_shiten_id = [30];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(previewZougenHanbaiten).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(previewZougenHanbaiten).mock.calls[0]?.[0];
    expect(arg.tekiyo_date).toBe('2026-05-01');
    expect(arg.hanbaiten_id).toEqual([200]);
  });

  it('should show 販売店/管理支店を1件以上選択してください。 and NOT call previewZougenHanbaiten when either is empty (必須・顧客要件 2026-07)', async () => {
    const { wrapper } = await renderView();
    const { previewZougenHanbaiten } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-05-01';
    (wrapper.vm as any).formState.hanbaiten_id = [];
    (wrapper.vm as any).formState.kanri_shiten_id = [];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('販売店を1件以上選択してください。');
    expect(wrapper.text()).toContain('管理支店を1件以上選択してください。');
    expect(previewZougenHanbaiten).not.toHaveBeenCalled();
  });

  it.each([
    [
      'render the 増部 / 減部 / 住所変更 section titles when previewZougenHanbaiten resolves data',
      ['増部', '減部', '住所変更'],
    ],
    [
      'render the 販売店名 + 増部 row (氏名 + 部数遷移) when previewZougenHanbaiten resolves data',
      ['千代田販売店', '農業 太郎', '1 → 2'],
    ],
    [
      'render the 変更前 / 変更後 rows when the report has 住所変更 records',
      ['変更前', '変更後', '銀座3-3-3'],
    ],
  ])('should %s', async (_desc, expectedTexts) => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = '2026-05-01';
    (wrapper.vm as any).formState.hanbaiten_id = [200];
    (wrapper.vm as any).formState.kanri_shiten_id = [30];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const text = wrapper.text();
    for (const expected of expectedTexts) {
      expect(text).toContain(expected);
    }
  });

  it('should show 対象のデータが存在しません。 when previewZougenHanbaiten resolves an empty reports array', async () => {
    const { wrapper } = await renderView();
    const { previewZougenHanbaiten } = await import('@/api/report/report');
    vi.mocked(previewZougenHanbaiten).mockResolvedValueOnce(
      buildEmptyZougenPreviewResponse(),
    );
    (wrapper.vm as any).formState.tekiyo_date = '2026-05-01';
    (wrapper.vm as any).formState.hanbaiten_id = [200];
    (wrapper.vm as any).formState.kanri_shiten_id = [30];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('対象のデータが存在しません。');
  });

  it('should show 対象のデータが存在しません。 and NOT download when 電子帳票作成 returns an application/json (no-data) blob', async () => {
    const { wrapper } = await renderView();
    const { exportZougenHanbaiten } = await import('@/api/report/report');
    // プレビューでデータを取得して 電子帳票作成 を活性化する。
    (wrapper.vm as any).formState.tekiyo_date = '2026-05-01';
    (wrapper.vm as any).formState.hanbaiten_id = [200];
    (wrapper.vm as any).formState.kanri_shiten_id = [30];
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();
    // 対象0件 → BE は PDF ではなく application/json の Blob を返す
    // （Content-Disposition なし → filename は null）。
    vi.mocked(exportZougenHanbaiten).mockResolvedValueOnce({
      blob: new Blob([JSON.stringify({ data: { reports: [] } })], {
        type: 'application/json',
      }),
      filename: null,
    });

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('対象のデータが存在しません。');
    // ダウンロードは発生しない（object URL を作らない）。
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. 電子帳票作成 — PDF (機能定義 3)
// ───────────────────────────────────────────────────────────────────────
describe('ZougenHanbaitenReportView — 電子帳票作成', () => {
  /** プレビューでデータを取得して 電子帳票作成 を活性化する。 */
  async function previewWithData(wrapper: any): Promise<void> {
    wrapper.vm.formState.tekiyo_date = '2026-05-01';
    wrapper.vm.formState.hanbaiten_id = [200];
    wrapper.vm.formState.kanri_shiten_id = [30];
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();
  }

  it('should disable 電子帳票作成 on initial mount (no preview data yet) and NOT call exportZougenHanbaiten on click', async () => {
    const { wrapper } = await renderView();
    const { exportZougenHanbaiten } = await import('@/api/report/report');

    const btn = wrapper.find(exportBtn());
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);

    await btn.trigger('click');
    await flushPromises();
    expect(exportZougenHanbaiten).not.toHaveBeenCalled();
  });

  it('should call exportZougenHanbaiten and create a Blob object URL when 電子帳票作成 is clicked after preview returns data', async () => {
    const { wrapper } = await renderView();
    const { exportZougenHanbaiten } = await import('@/api/report/report');
    await previewWithData(wrapper);

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportZougenHanbaiten).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('should still call exportZougenHanbaiten when it rejects with 500 (interceptor handles the toast)', async () => {
    const { wrapper } = await renderView();
    const { exportZougenHanbaiten } = await import('@/api/report/report');
    await previewWithData(wrapper);
    vi.mocked(exportZougenHanbaiten).mockRejectedValueOnce({
      error_code: 'INTERNAL_SERVER_ERROR',
    });

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportZougenHanbaiten).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4b. 発行日時（プレビュー押下時刻・JST。条件ラベル＋帳票フッタ）
// ───────────────────────────────────────────────────────────────────────
describe('ZougenHanbaitenReportView — 発行日時', () => {
  it('should NOT show the 発行日時 label before preview is clicked', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find('[data-test="issued-at"]').exists()).toBe(false);
  });

  it('should set 発行日時 (JST) on preview and print it in the report footer (right)', async () => {
    vi.useFakeTimers();
    // UTC 01:58 = JST 10:58 — JST固定で表示されること（TZずれ防止）。
    vi.setSystemTime(new Date('2026-06-25T01:58:00Z'));
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = '2026-05-01';
    (wrapper.vm as any).formState.hanbaiten_id = [200];
    (wrapper.vm as any).formState.kanri_shiten_id = [30];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="issued-at"]').text()).toBe('2026/06/25 10:58');
    expect(wrapper.find('[data-test="issued-at-footer"]').text()).toContain(
      '発行日時：2026/06/25 10:58',
    );
    vi.useRealTimers();
  });

  it('should pass issued_at to exportZougenHanbaiten', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T01:58:00Z'));
    const { wrapper } = await renderView();
    const { exportZougenHanbaiten } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-05-01';
    (wrapper.vm as any).formState.hanbaiten_id = [200];
    (wrapper.vm as any).formState.kanri_shiten_id = [30];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();
    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    const arg = vi.mocked(exportZougenHanbaiten).mock.calls.at(-1)?.[0];
    expect(arg?.issued_at).toBe('2026/06/25 10:58');
    vi.useRealTimers();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. ページ送り（文書ページ / 15レコード・名簿と同方針）
// ───────────────────────────────────────────────────────────────────────
describe('ZougenHanbaitenReportView — ページ送り', () => {
  it('sends page/per_page on preview and re-fetches the chosen page', async () => {
    const { wrapper } = await renderView();
    const { previewZougenHanbaiten } = await import('@/api/report/report');
    vi.mocked(previewZougenHanbaiten).mockResolvedValueOnce(
      buildZougenPreviewResponse({
        page_no: 1, per_page: 15, total_pages: 2, total_rows: 20, is_last_page: false,
      }),
    );

    (wrapper.vm as any).formState.tekiyo_date = '2026-05-01';
    (wrapper.vm as any).formState.hanbaiten_id = [200];
    (wrapper.vm as any).formState.kanri_shiten_id = [30];
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(vi.mocked(previewZougenHanbaiten).mock.calls[0]?.[0]).toMatchObject({
      page: 1,
      per_page: 15,
    });
    expect(wrapper.find('[data-test="zougen-pager"]').exists()).toBe(true);

    vi.mocked(previewZougenHanbaiten).mockResolvedValueOnce(
      buildZougenPreviewResponse({
        page_no: 2, per_page: 15, total_pages: 2, total_rows: 20, is_last_page: true,
      }),
    );
    await wrapper.find('.ant-pagination-item-2').trigger('click');
    await flushPromises();

    const lastArg = vi.mocked(previewZougenHanbaiten).mock.calls.at(-1)?.[0];
    expect(lastArg).toMatchObject({ page: 2, per_page: 15 });
  });
});

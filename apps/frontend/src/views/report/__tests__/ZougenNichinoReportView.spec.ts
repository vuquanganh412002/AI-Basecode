// Screen: ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面
//
// Drives src/views/report/ZougenNichinoReportView.vue. Each it() maps to a
// clause in:
//   docs/design/ACSMS-SCR-029/screen-design.md (機能定義 + メッセージ情報)
//   docs/design/ACSMS-SCR-029/index.html (UI labels: 委託 / 販売店コード / 部数 / 合計)
//   docs/design/ACSMS-SCR-029/ACSMS-SCR-029-api.md (ACSMS-API-029-001 preview / 002 PDF/ZIP)
//
// The view defineExposes `{ formState }` so setup can seed 適用日 / 管理支店
// (antd controls aren't drivable via jsdom DOM events). Buttons are clicked
// through `[data-test]` markers. 電子帳票作成 opens an ACSMS-MSG-029-005 confirm
// dialog (Modal.confirm) — mocked to fire onOk synchronously.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message, Modal } from 'ant-design-vue';

import ZougenNichinoReportView from '@/views/report/ZougenNichinoReportView.vue';
import {
  buildNichinoReportUser,
  buildNichinoBlockedUser,
  buildNichinoPreviewResponse,
  buildEmptyNichinoPreviewResponse,
} from '@test/fixtures/report-zougen-nichino.fixture';
import { buildKanriShitenDropdownResponse } from '@test/fixtures/report.fixture';

// API wrappers — /gen-code-frontend extends @/api/report/report with the two
// ACSMS-SCR-029 functions.
vi.mock('@/api/report/report', () => ({
  previewZougenNichino: vi.fn(),
  exportZougenNichino: vi.fn(),
  exportZougenNichinoExcel: vi.fn(),
}));
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
}));

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Modal.confirm — fire onOk synchronously so the export flow runs in-test.
vi.spyOn(Modal, 'confirm').mockImplementation((opts: any) => {
  opts?.onOk?.();
  return { destroy: () => undefined, update: () => undefined } as any;
});

// Blob → file download helpers the PDF/ZIP export uses.
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
  user?: ReturnType<typeof buildNichinoReportUser>;
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
        path: '/report/zougen-nichino',
        name: 'ZougenNichinoReport',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'ZougenNichinoReport' });
  await router.isReady();

  const wrapper = mount(ZougenNichinoReportView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildNichinoReportUser() },
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
const exportExcelBtn = () => '[data-test="export-excel-btn"]';

beforeEach(async () => {
  vi.clearAllMocks();
  const { previewZougenNichino, exportZougenNichino, exportZougenNichinoExcel } =
    await import('@/api/report/report');
  vi.mocked(previewZougenNichino).mockResolvedValue(buildNichinoPreviewResponse());
  // 出力成功 → JSON（PDFはブラウザへ返さず S3 保存 + メール通知）。
  vi.mocked(exportZougenNichino).mockResolvedValue({
    file_name: '増減通知_2026年03月01日_20260301120000.pdf',
    recipient_count: 3,
  });
  vi.mocked(exportZougenNichinoExcel).mockResolvedValue({
    file_name: '増減通知_2026年03月01日_20260301120000.xlsx',
    recipient_count: 3,
  });
  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  vi.mocked(getKanriShitenDropdown).mockResolvedValue(buildKanriShitenDropdownResponse());
  // Re-arm the Modal.confirm spy (cleared by vi.clearAllMocks()).
  vi.mocked(Modal.confirm).mockImplementation((opts: any) => {
    opts?.onOk?.();
    return { destroy: () => undefined, update: () => undefined } as any;
  });
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1)
// ───────────────────────────────────────────────────────────────────────
describe('ZougenNichinoReportView — 画面初期表示', () => {
  it('should render the 適用日 / 管理支店 labels when mounted', async () => {
    const { wrapper } = await renderView();
    const text = wrapper.text();
    expect(text).toContain('適用日');
    expect(text).toContain('管理支店');
  });

  it('should render the レポートプレビュー and 電子帳票作成 buttons when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find(previewBtn()).exists()).toBe(true);
    expect(wrapper.find(exportBtn()).exists()).toBe(true);
  });

  it('should render the 管理支店 multi-select dropdown (not checkbox)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find('[data-test="kanri-shiten-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="kanri-shiten-checkbox"]').exists()).toBe(false);
  });

  it('should default 適用日 to empty when first mounted', async () => {
    const { wrapper } = await renderView();
    expect((wrapper.vm as any).formState.tekiyo_date).toBe('');
  });

  it('should NOT render any preview rows when first mounted (empty preview area)', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).not.toContain('（免）A販売店');
  });

  it('should associate the 管理支店 title with its select via <label for> (regression: was a bare <div>)', async () => {
    const { wrapper } = await renderView();
    const label = wrapper.findAll('label').find((l) => l.text().includes('管理支店'));
    expect(label).toBeDefined();
    const forId = label!.attributes('for')!;
    expect(wrapper.find(`#${forId}`).exists()).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 権限チェック (機能定義 1.2 — ACSMS-MSG-029-001)
// ───────────────────────────────────────────────────────────────────────
describe('ZougenNichinoReportView — 権限', () => {
  it('should show この機能はJAアカウントのみ使用できます。 when the user is a 日農 account (no report.export_zougen_nichino)', async () => {
    const { wrapper } = await renderView({ user: buildNichinoBlockedUser() });
    expect(wrapper.text()).toContain('この機能はJAアカウントのみ使用できます。');
  });

  it('should disable the レポートプレビュー button when the user lacks report.export_zougen_nichino', async () => {
    const { wrapper } = await renderView({ user: buildNichinoBlockedUser() });
    const btn = wrapper.find(previewBtn());
    expect(btn.exists()).toBe(true);
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should disable the 電子帳票作成 button when the user lacks report.export_zougen_nichino', async () => {
    const { wrapper } = await renderView({ user: buildNichinoBlockedUser() });
    const btn = wrapper.find(exportBtn());
    expect(btn.exists()).toBe(true);
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. レポートプレビュー (機能定義 2 + メッセージ)
// ───────────────────────────────────────────────────────────────────────
describe('ZougenNichinoReportView — レポートプレビュー', () => {
  it('should show 必須項目です。 and NOT call previewZougenNichino when 適用日 is empty', async () => {
    const { wrapper } = await renderView();
    const { previewZougenNichino } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(previewZougenNichino).not.toHaveBeenCalled();
  });

  it('should NOT show エラーが発生しました when 適用日 is cleared to undefined (optional-chaining guard)', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = undefined;

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should call previewZougenNichino with tekiyo_date + kanri_shiten_id when 適用日 is valid', async () => {
    const { wrapper } = await renderView();
    const { previewZougenNichino } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];
    (wrapper.vm as any).formState.kanri_shiten_id = [20];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(previewZougenNichino).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(previewZougenNichino).mock.calls[0]?.[0];
    expect(arg.tekiyo_date).toBe('2026-03-01');
    expect(arg.kanri_shiten_id).toEqual([20]);
  });

  it('should show 管理支店を1件以上選択してください。 and NOT call previewZougenNichino when 管理支店 is empty (必須・顧客要件 2026-07)', async () => {
    const { wrapper } = await renderView();
    const { previewZougenNichino } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('管理支店を1件以上選択してください。');
    expect(previewZougenNichino).not.toHaveBeenCalled();
  });

  it('should render the 委託 / 販売店コード / 現在部数 / 増部数 / 減部数 / 新部数 column titles when previewZougenNichino resolves data', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('委託');
    expect(text).toContain('販売店コード');
    expect(text).toContain('現在部数');
    expect(text).toContain('増部数');
    expect(text).toContain('減部数');
    expect(text).toContain('新部数');
  });

  it.each([
    // fixture: 明細の gen_busu=1 / 合計 gen_busu=1 → 「▲1」で表示する。
    ['render 減部数 with the ▲ minus sign in the preview (顧客要件2026-07)', '▲1'],
    ['render the 合計 row when previewZougenNichino resolves data', '合計'],
    [
      'render the 管理支店コード as 3-4-3 (1AA-3300-001) in the 帳票ヘッダ when previewZougenNichino resolves data',
      '1AA-3300-001',
    ],
  ])('should %s', async (_desc, expected) => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain(expected);
  });

  it('should render the 販売店コード + 販売店名 detail row when previewZougenNichino resolves data', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('12345678');
    expect(text).toContain('（免）A販売店'); // 免税販売店 prefix
  });

  it('should clear a previously-entered 備考 when レポートプレビュー is re-run (regression: stale remark leaking into a new period)', async () => {
    // A remark typed for kanri_shiten_id=20 in a prior preview must NOT
    // survive into a fresh preview run for a different 適用日 — otherwise it
    // silently attaches to the wrong period's report on 電子帳票作成.
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const remarksInput = wrapper.find('[id="zn-remarks-20"]');
    expect(remarksInput.exists()).toBe(true);
    await remarksInput.setValue('前回期間向けの備考');
    await flushPromises();
    expect((remarksInput.element as HTMLTextAreaElement).value).toBe('前回期間向けの備考');

    // Re-run the preview with a different 適用日 but the same 管理支店.
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect((wrapper.find('[id="zn-remarks-20"]').element as HTMLTextAreaElement).value).toBe('');
  });

  it('should show 対象のデータが存在しません。 when previewZougenNichino resolves an empty reports array', async () => {
    const { wrapper } = await renderView();
    const { previewZougenNichino } = await import('@/api/report/report');
    vi.mocked(previewZougenNichino).mockResolvedValueOnce(
      buildEmptyNichinoPreviewResponse(),
    );
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('対象のデータが存在しません。');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3b. ページ送り（1管理支店=1ページ・別API再取得。顧客要件 2026-07）
// ───────────────────────────────────────────────────────────────────────
describe('ZougenNichinoReportView — ページ送り', () => {
  const pagedResponse = (pageNo: number) => ({
    data: {
      ...buildNichinoPreviewResponse().data,
      page_no: pageNo,
      per_page: 15,
      total_pages: 2,
      total_rows: 20,
      is_last_page: pageNo >= 2,
    },
  });

  it('should send page=1 + per_page=28 on レポートプレビュー', async () => {
    const { wrapper } = await renderView();
    const { previewZougenNichino } = await import('@/api/report/report');
    vi.mocked(previewZougenNichino).mockResolvedValue(pagedResponse(1) as any);
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const arg = vi.mocked(previewZougenNichino).mock.calls.at(-1)?.[0];
    expect(arg?.page).toBe(1);
    expect(arg?.per_page).toBe(28);
    expect(wrapper.find('[data-test="zougen-nichino-pager"]').exists()).toBe(true);
  });

  it('should re-fetch page 2 when the pager 2nd page is clicked', async () => {
    const { wrapper } = await renderView();
    const { previewZougenNichino } = await import('@/api/report/report');
    vi.mocked(previewZougenNichino).mockResolvedValue(pagedResponse(1) as any);
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    vi.mocked(previewZougenNichino).mockResolvedValue(pagedResponse(2) as any);
    const page2 = wrapper.find('.ant-pagination-item-2');
    expect(page2.exists()).toBe(true);
    await page2.trigger('click');
    await flushPromises();

    const arg = vi.mocked(previewZougenNichino).mock.calls.at(-1)?.[0];
    expect(arg?.page).toBe(2);
  });

  it('should place the pager OUTSIDE the horizontally-scrollable report area, matching the sibling report screens (regression)', async () => {
    // Bug: BaseReportPager was nested inside the `overflow-x-auto` wrapper
    // here, unlike ZougenHanbaitenReportView / MeiboReportView which place
    // it as a sibling after that wrapper closes — on a narrow viewport
    // where the wide table triggers horizontal scroll, the pager scrolled
    // out of view along with the table on this screen only.
    const { wrapper } = await renderView();
    const { previewZougenNichino } = await import('@/api/report/report');
    // BaseReportPager renders nothing when totalPages <= 1 — use the
    // multi-page fixture so the pager actually mounts.
    vi.mocked(previewZougenNichino).mockResolvedValue(pagedResponse(1) as any);
    (wrapper.vm as any).formState.tekiyo_date = '2026-03-01';
    (wrapper.vm as any).formState.kanri_shiten_id = [20];
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    const pager = wrapper.find('[data-test="zougen-nichino-pager"]');
    expect(pager.exists()).toBe(true);
    expect(pager.element.closest('.overflow-x-auto')).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. 電子帳票作成 — PDF + 確認ダイアログ (機能定義 3 — ACSMS-MSG-029-005)
// ───────────────────────────────────────────────────────────────────────
describe('ZougenNichinoReportView — 電子帳票作成', () => {
  /** プレビューでデータを取得して 電子帳票作成 を活性化する。 */
  async function previewWithData(wrapper: any): Promise<void> {
    wrapper.vm.formState.tekiyo_date = '2026-03-01';
    wrapper.vm.formState.kanri_shiten_id = [20];
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();
  }

  it('should disable 電子帳票作成 on initial mount (no preview data yet) and NOT open the confirm dialog on click', async () => {
    const { wrapper } = await renderView();
    const { exportZougenNichino } = await import('@/api/report/report');

    const btn = wrapper.find(exportBtn());
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);

    await btn.trigger('click');
    await flushPromises();
    expect(Modal.confirm).not.toHaveBeenCalled();
    expect(exportZougenNichino).not.toHaveBeenCalled();
  });

  it('should open the ACSMS-MSG-029-005 confirm dialog when 電子帳票作成 is clicked after preview returns data', async () => {
    const { wrapper } = await renderView();
    await previewWithData(wrapper);

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(Modal.confirm).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as any;
    const dialogText = `${opts?.title ?? ''}${opts?.content ?? ''}`;
    expect(dialogText).toContain(
      '増減通知を作成して日農担当者へメール送信を実行します。よろしいですか？',
    );
  });

  it('should call exportZougenNichino and show a success toast (NO download) when the confirm dialog is accepted (onOk)', async () => {
    const { wrapper } = await renderView();
    const { exportZougenNichino } = await import('@/api/report/report');
    await previewWithData(wrapper);

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportZougenNichino).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(exportZougenNichino).mock.calls[0]?.[0];
    expect(arg.tekiyo_date).toBe('2026-03-01');
    // PDFはブラウザへダウンロードしない（S3 保存 + メール通知のみ）。
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(message.success).toHaveBeenCalledWith('出力しました。メールを送信しました。');
  });

  it('should show 対象のデータが存在しません。 and NOT toast/download when 電子帳票作成 returns reports:[] (no data)', async () => {
    const { wrapper } = await renderView();
    const { exportZougenNichino } = await import('@/api/report/report');
    await previewWithData(wrapper);
    // 対象0件 → BE は { reports: [] } を返す（JSON）。
    vi.mocked(exportZougenNichino).mockResolvedValueOnce({ reports: [] });

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('対象のデータが存在しません。');
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should still call exportZougenNichino when it rejects with 500 (interceptor handles the toast)', async () => {
    const { wrapper } = await renderView();
    const { exportZougenNichino } = await import('@/api/report/report');
    await previewWithData(wrapper);
    vi.mocked(exportZougenNichino).mockRejectedValueOnce({
      error_code: 'INTERNAL_SERVER_ERROR',
    });

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportZougenNichino).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. Excel出力（顧客要件 2026-08-26 — レポートプレビュー内容をExcelで出力）
// ───────────────────────────────────────────────────────────────────────
describe('ZougenNichinoReportView — Excel出力', () => {
  /** プレビューでデータを取得して Excel出力 を活性化する。 */
  async function previewWithData(wrapper: any): Promise<void> {
    wrapper.vm.formState.tekiyo_date = '2026-03-01';
    wrapper.vm.formState.kanri_shiten_id = [20];
    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();
  }

  it('should render the Excel出力 button, disabled before preview', async () => {
    const { wrapper } = await renderView();
    const btn = wrapper.find(exportExcelBtn());
    expect(btn.exists()).toBe(true);
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should NOT open the confirm dialog nor call exportZougenNichinoExcel when clicked with no preview data', async () => {
    const { wrapper } = await renderView();
    const { exportZougenNichinoExcel } = await import('@/api/report/report');

    await wrapper.find(exportExcelBtn()).trigger('click');
    await flushPromises();
    expect(Modal.confirm).not.toHaveBeenCalled();
    expect(exportZougenNichinoExcel).not.toHaveBeenCalled();
  });

  it('should open the same ACSMS-MSG-029-005 confirm dialog when Excel出力 is clicked after preview returns data', async () => {
    const { wrapper } = await renderView();
    await previewWithData(wrapper);

    await wrapper.find(exportExcelBtn()).trigger('click');
    await flushPromises();

    expect(Modal.confirm).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as any;
    const dialogText = `${opts?.title ?? ''}${opts?.content ?? ''}`;
    expect(dialogText).toContain(
      '増減通知を作成して日農担当者へメール送信を実行します。よろしいですか？',
    );
  });

  it('should call exportZougenNichinoExcel (NOT exportZougenNichino) and show a success toast (NO download) when the confirm dialog is accepted', async () => {
    const { wrapper } = await renderView();
    const { exportZougenNichinoExcel, exportZougenNichino } = await import(
      '@/api/report/report'
    );
    await previewWithData(wrapper);

    await wrapper.find(exportExcelBtn()).trigger('click');
    await flushPromises();

    expect(exportZougenNichinoExcel).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(exportZougenNichinoExcel).mock.calls[0]?.[0];
    expect(arg.tekiyo_date).toBe('2026-03-01');
    // PDF出力（電子帳票作成）は呼ばれない — 別の読み取り専用出力。
    expect(exportZougenNichino).not.toHaveBeenCalled();
    // Excelはブラウザへダウンロードしない（S3 保存 + メール通知のみ）。
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(message.success).toHaveBeenCalledWith('出力しました。メールを送信しました。');
  });

  it('should show 対象のデータが存在しません。 and NOT toast when Excel出力 returns reports:[] (no data)', async () => {
    const { wrapper } = await renderView();
    const { exportZougenNichinoExcel } = await import('@/api/report/report');
    await previewWithData(wrapper);
    vi.mocked(exportZougenNichinoExcel).mockResolvedValueOnce({ reports: [] });

    await wrapper.find(exportExcelBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('対象のデータが存在しません。');
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should still call exportZougenNichinoExcel when it rejects with 500 (interceptor handles the toast)', async () => {
    const { wrapper } = await renderView();
    const { exportZougenNichinoExcel } = await import('@/api/report/report');
    await previewWithData(wrapper);
    vi.mocked(exportZougenNichinoExcel).mockRejectedValueOnce({
      error_code: 'INTERNAL_SERVER_ERROR',
    });

    await wrapper.find(exportExcelBtn()).trigger('click');
    await flushPromises();

    expect(exportZougenNichinoExcel).toHaveBeenCalled();
  });
});

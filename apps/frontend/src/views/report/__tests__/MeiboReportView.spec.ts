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
  buildShitenDropdownResponse,
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
vi.mock('@/api/shiten/shiten', () => ({
  getShitenDropdown: vi.fn(),
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
                // 支払い方法（m_code SHIHARAI_HOHO）— 支払区分(固定UI)から変更。
                SHIHARAI_HOHO: [
                  { value: 1, label: '口座引落', label_short: '口座引落' },
                  { value: 2, label: '現金集金', label_short: '現金集金' },
                  { value: 3, label: '振込集金', label_short: '振込集金' },
                  { value: 4, label: 'JA施設等', label_short: 'JA施設等' },
                  { value: 5, label: '給与天引き', label_short: '給与天引き' },
                  { value: 6, label: 'クレジットカード', label_short: 'クレカ' },
                  { value: 9, label: 'その他', label_short: 'その他' },
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
  const { getShitenDropdown } = await import('@/api/shiten/shiten');
  vi.mocked(getShitenDropdown).mockResolvedValue(buildShitenDropdownResponse());
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1)
// ───────────────────────────────────────────────────────────────────────
describe('MeiboReportView — 画面初期表示', () => {

  it('should exclude the 電子版ダミー販売店 from the 販売店 dropdown (顧客要件 2026-08)', async () => {
    // ダミーは電子版読者の受け皿であって実在の販売店ではない。本帳票の集計対象
    // （紙版のみ）にも入らないので、選ばせると必ず0件になる。
    const { wrapper } = await renderView();
    const select = wrapper.findComponent({ name: 'BaseHanbaitenSelect' });
    expect(select.exists()).toBe(true);
    expect(select.props('dummy')).toBe('exclude');
  });

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
  it('should render the 販売店 multi-select dropdown (not checkbox) for hanbaiten report', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find('[data-test="hanbaiten-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="hanbaiten-checkbox"]').exists()).toBe(false);
  });

  it('should render the 管理支店 multi-select dropdown for kanri_shiten report', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.report_type = 'kanri_shiten';
    await flushPromises();
    expect(wrapper.find('[data-test="kanri-shiten-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="kanri-shiten-checkbox"]').exists()).toBe(false);
  });

  // ─── 支店フィルタ（顧客要件2026-08）────────────────────────────────────
  it('should render the 支店 multi-select only for the kanri_shiten report', async () => {
    // 販売店別に出さないのは、帳票に支店列が無く「絞ったのに理由が紙面から
    // 読めない」状態になるため。
    const { wrapper } = await renderView();
    const shitenBox = () => wrapper.find('[data-test="shiten-select"]');
    expect(shitenBox().exists()).toBe(true); // v-show なので DOM には存在
    expect(shitenBox().element.closest('[style*="display: none"]')).not.toBeNull();

    (wrapper.vm as any).formState.report_type = 'kanri_shiten';
    await flushPromises();
    expect(shitenBox().element.closest('[style*="display: none"]')).toBeNull();
  });

  it('should send shiten_ids to previewMeibo for the kanri_shiten report', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    const vm = wrapper.vm as any;
    vm.formState.report_type = 'kanri_shiten';
    vm.formState.tekiyo_date = '2026-04-01';
    vm.formState.kanri_shiten_ids = [10];
    // 管理支店を確定させてから支店を選ぶ（実際の操作順）。同一 tick で両方
    // 入れると、管理支店変更に反応する支店クリアが後から走って消える。
    await flushPromises();
    vm.formState.shiten_ids = [21, 22];
    await flushPromises();

    await wrapper.find('[data-test="preview-btn"]').trigger('click');
    await flushPromises();

    expect(vi.mocked(previewMeibo).mock.calls.at(-1)?.[0]).toMatchObject({
      report_type: 'kanri_shiten',
      shiten_ids: [21, 22],
    });
  });

  /**
   * 支店は任意（顧客要件 2026-08 改訂）。必須にしていた時期があるが、それだと
   * shiten_id が NULL の購読者（電子版連携は常に NULL・紙版も登録時は任意）が
   * どう操作しても名簿に出せなくなるため戻した。未選択なら shiten_ids を送らず
   * BE 側で絞り込みしない ＝ 支店未設定も含めて出力される。
   */
  it('should preview without shiten_ids when 支店 is not selected', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    vi.mocked(previewMeibo).mockClear();
    const vm = wrapper.vm as any;
    vm.formState.report_type = 'kanri_shiten';
    vm.formState.tekiyo_date = '2026-04-01';
    vm.formState.kanri_shiten_ids = [10];
    await flushPromises();

    await wrapper.find('[data-test="preview-btn"]').trigger('click');
    await flushPromises();

    expect(previewMeibo).toHaveBeenCalledTimes(1);
    expect(vm.fieldErrors.shiten_ids).toBe('');
    expect(vi.mocked(previewMeibo).mock.calls[0]?.[0]).not.toHaveProperty(
      'shiten_ids',
    );
  });

  it('should send shiten_ids when 支店 is selected', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    vi.mocked(previewMeibo).mockClear();
    const vm = wrapper.vm as any;
    vm.formState.report_type = 'kanri_shiten';
    vm.formState.tekiyo_date = '2026-04-01';
    vm.formState.kanri_shiten_ids = [10];
    // 管理支店を変えると支店の選択は解除される（watcher）。解除が走ってから
    // 支店を入れないと、この後の送信で消えてしまう。
    await flushPromises();
    vm.formState.shiten_ids = [21, 22];
    await flushPromises();

    await wrapper.find('[data-test="preview-btn"]').trigger('click');
    await flushPromises();

    expect(vi.mocked(previewMeibo).mock.calls[0]?.[0]).toMatchObject({
      shiten_ids: [21, 22],
    });
  });

  /**
   * 管理支店が未選択のうちは支店セレクトが非活性。支店は任意になったので、
   * ここで出るエラーは管理支店の1件だけであることを固定する。
   */
  it('should show only the 管理支店 error while 管理支店 is still unselected', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.report_type = 'kanri_shiten';
    vm.formState.tekiyo_date = '2026-04-01';
    await flushPromises();

    await wrapper.find('[data-test="preview-btn"]').trigger('click');
    await flushPromises();

    expect(vm.fieldErrors.kanri_shiten_ids).toBe(
      '管理支店を1件以上選択してください。',
    );
    expect(vm.fieldErrors.shiten_ids).toBe('');
  });

  /**
   * ここの支店は配達担当支店（t_dokusya_rireki.shiten_id）。金融機関支店は
   * 引落口座の紐付け先で購読者の配達先にはならないので候補から外す
   * （顧客要件 2026-08）。BE は `kinyu_shiten_flg` が undefined のときだけ
   * 条件を付けないため、`false` を明示的に渡す必要がある。
   */
  it('should ask the dropdown for non-financial branches only', async () => {
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.report_type = 'kanri_shiten';
    await flushPromises();

    const select = wrapper.findComponent({ name: 'BaseShitenSelect' });
    expect(select.exists()).toBe(true);
    expect(select.props('kinyuShitenFlg')).toBe(false);
  });

  it('should never send shiten_ids on the hanbaiten report even if the state holds some', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    const vm = wrapper.vm as any;
    vm.formState.tekiyo_date = '2026-04-01';
    vm.formState.hanbaiten_ids = [1];
    vm.formState.shiten_ids = [21]; // 管理支店別から戻ってきた残り値を想定
    await flushPromises();

    await wrapper.find('[data-test="preview-btn"]').trigger('click');
    await flushPromises();

    expect(vi.mocked(previewMeibo).mock.calls.at(-1)?.[0]).not.toHaveProperty('shiten_ids');
  });

  it('should fetch 支店 candidates scoped to the selected 管理支店', async () => {
    const { wrapper } = await renderView();
    const { getShitenDropdown } = await import('@/api/shiten/shiten');
    const vm = wrapper.vm as any;
    vm.formState.report_type = 'kanri_shiten';
    vm.formState.kanri_shiten_ids = [10, 11];
    await flushPromises();

    expect(vi.mocked(getShitenDropdown).mock.calls.at(-1)?.[0]).toMatchObject({
      kanri_shiten_ids: [10, 11],
    });
  });

  it('should drop the 支店 selection when the 管理支店 selection changes', async () => {
    // 残すと配下に無い支店で絞ることになり、0 件の理由が画面から読めない。
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    vm.formState.report_type = 'kanri_shiten';
    vm.formState.kanri_shiten_ids = [10];
    await flushPromises();
    vm.formState.shiten_ids = [21];
    await flushPromises();

    vm.formState.kanri_shiten_ids = [11];
    await flushPromises();

    expect(vm.formState.shiten_ids).toEqual([]);
  });

  it('should always render the 支払い方法 condition when report_type is hanbaiten or kanri_shiten', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('支払い方法');

    (wrapper.vm as any).formState.report_type = 'kanri_shiten';
    await flushPromises();

    expect(wrapper.text()).toContain('支払い方法');
  });

  it('should populate the 支払い方法 dropdown from m_code SHIHARAI_HOHO (not hardcoded cycle values)', async () => {
    const { wrapper } = await renderView();
    const hohoSel = wrapper.findAllComponents({ name: 'ASelect' }).find((s) => {
      const o = (s.props('options') ?? []) as Array<{ label: string }>;
      return o.some((x) => x.label === '口座引落');
    });
    expect(hohoSel).toBeDefined();
    const opts = hohoSel!.props('options') as Array<{ value: number; label: string }>;
    expect(opts.map((o) => o.label)).toEqual([
      '口座引落',
      '現金集金',
      '振込集金',
      'JA施設等',
      '給与天引き',
      'クレジットカード',
      'その他',
    ]);
    // 旧・固定UIの支払サイクル値は出ないこと。
    expect(wrapper.text()).not.toContain('年払い');
  });

  it('should send shiharai_hoho (not shiharai_cycle) to previewMeibo', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];
    (wrapper.vm as any).formState.shiharai_hoho = 1;

    await wrapper.find('[data-test="preview-btn"]').trigger('click');
    await flushPromises();

    const arg = vi.mocked(previewMeibo).mock.calls.at(-1)?.[0] as any;
    expect(arg?.shiharai_hoho).toBe(1);
    expect(arg).not.toHaveProperty('shiharai_cycle');
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
  /** プレビューでデータを取得して Excel出力 を活性化する。 */
  async function previewWithData(wrapper: any): Promise<void> {
    wrapper.vm.formState.tekiyo_date = '2026-04-01';
    wrapper.vm.formState.report_type = 'hanbaiten';
    wrapper.vm.formState.hanbaiten_ids = [1];
    await wrapper.find(preview()).trigger('click');
    await flushPromises();
  }

  it('should disable Excel出力 on initial mount (no preview data yet) and NOT call exportMeibo on click', async () => {
    const { wrapper } = await renderView();
    const { exportMeibo } = await import('@/api/report/report');

    const btn = wrapper.find(exportBtn());
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);

    await btn.trigger('click');
    await flushPromises();
    expect(exportMeibo).not.toHaveBeenCalled();
  });

  it('should call exportMeibo and create a Blob object URL when Excel出力 is clicked after preview returns data', async () => {
    const { wrapper } = await renderView();
    const { exportMeibo } = await import('@/api/report/report');
    await previewWithData(wrapper);

    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();

    expect(exportMeibo).toHaveBeenCalledTimes(1);
    // 日農DL許可フラグは FE から送らない（BE が未指定→false に既定化する）。
    const sentQuery = vi.mocked(exportMeibo).mock.calls[0]?.[0];
    expect(sentQuery?.nichino_download_allowed_flg).toBeUndefined();
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('should NEVER render the 日農DL許可 radio + NOT send the flag (BE defaults false)', async () => {
    // 顧客要件: 日農DL許可 は画面から選択させない。プレビュー後もラジオは表示せず、
    // export クエリにもフラグを含めない（BE が未指定→false 化）。
    const { wrapper } = await renderView();
    expect(wrapper.find('[data-test="nichino-flg-row"]').exists()).toBe(false);

    await previewWithData(wrapper);
    expect(wrapper.find('[data-test="nichino-flg-row"]').exists()).toBe(false);

    const { exportMeibo } = await import('@/api/report/report');
    await wrapper.find(exportBtn()).trigger('click');
    await flushPromises();
    const sentQuery = vi.mocked(exportMeibo).mock.calls[0]?.[0];
    expect(sentQuery?.nichino_download_allowed_flg).toBeUndefined();
  });

  it('should still call exportMeibo when it rejects with 500 (interceptor handles the toast)', async () => {
    const { wrapper } = await renderView();
    const { exportMeibo } = await import('@/api/report/report');
    await previewWithData(wrapper);
    vi.mocked(exportMeibo).mockRejectedValueOnce({
      error_code: 'INTERNAL_SERVER_ERROR',
    });

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

// ───────────────────────────────────────────────────────────────────────
// 6. ページ送り（文書ページ / SCR-026）
// ───────────────────────────────────────────────────────────────────────
describe('MeiboReportView — ページ送り', () => {
  // per_page の名目値（15）。BE は動的高さで分割するがページャ表示に使う。
  const HB_PER = 15;
  const paged = (page_no: number) =>
    buildHanbaitenPreviewResponse({
      page_no,
      per_page: HB_PER,
      total_pages: 3,
      total_rows: HB_PER * 3,
      is_last_page: page_no >= 3,
      group_count: 1,
      // 単一販売店が3ページに跨る → ヘッダのページ数は 1..3（グループ内採番）。
      group_page_no: page_no,
      group_total_pages: 3,
    });

  it('sends page (not per_page) on preview and renders the pager + ページ数', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    vi.mocked(previewMeibo).mockResolvedValueOnce(paged(1));

    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];
    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    // per_page は送らない（BE は動的高さで分割・DTO 非対象で送ると 400）。
    const firstArg = vi.mocked(previewMeibo).mock.calls[0]?.[0];
    expect(firstArg).toMatchObject({ page: 1 });
    expect(firstArg).not.toHaveProperty('per_page');
    expect(wrapper.find('[data-test="meibo-pager"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('1/3');
  });

  it('re-fetches the chosen page when the pager is clicked', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    vi.mocked(previewMeibo).mockResolvedValueOnce(paged(1));

    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];
    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    vi.mocked(previewMeibo).mockResolvedValueOnce(paged(2));
    await wrapper.find('.ant-pagination-item-2').trigger('click');
    await flushPromises();

    const lastArg = vi.mocked(previewMeibo).mock.calls.at(-1)?.[0];
    expect(lastArg).toMatchObject({ page: 2 });
    expect(lastArg).not.toHaveProperty('per_page');
    expect(wrapper.text()).toContain('2/3');
  });

  it('renders total_pages pages even when total_rows < total_pages*per_page (group-based) — 顧客要件 2026-07', async () => {
    // グループ単位ページング: 4販売店が各1件でも各独立ページ → total_pages=4 /
    // total_rows=4。ページャは行数ベース(ceil(4/15)=1)ではなく total_pages=4 を出す。
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    vi.mocked(previewMeibo).mockResolvedValueOnce(
      buildHanbaitenPreviewResponse({
        page_no: 1,
        per_page: HB_PER,
        total_pages: 4,
        total_rows: 4,
        is_last_page: false,
        group_count: 4,
      }),
    );

    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1, 2, 3, 4];
    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="meibo-pager"]').exists()).toBe(true);
    expect(wrapper.find('.ant-pagination-item-4').exists()).toBe(true);
    expect(wrapper.text()).toContain('1/4');
  });

  it('shows per-group page number in the header and NO 合計 row (顧客要件 2026-07)', async () => {
    // 2販売店・各1件 → 全体2ページ。ページ1=販売店Aの 1/1（グループ内採番）。
    // 各販売店が独立ページのため全体合計(合計)行は表示しない。
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    vi.mocked(previewMeibo).mockResolvedValueOnce(
      buildHanbaitenPreviewResponse({
        page_no: 1,
        per_page: HB_PER,
        total_pages: 2,
        total_rows: 2,
        is_last_page: false,
        group_count: 2,
        group_page_no: 1,
        group_total_pages: 1,
      }),
    );

    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1, 2];
    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    // ヘッダのページ数はグループ内採番（1/1）。ページャは全体2ページ。
    expect(wrapper.text()).toContain('1/1');
    // 全体合計(合計)行は廃止。
    expect(wrapper.text()).not.toContain('合計');
  });

  it('does NOT render the pager when there is a single page', async () => {
    const { wrapper } = await renderView();
    const { previewMeibo } = await import('@/api/report/report');
    vi.mocked(previewMeibo).mockResolvedValueOnce(
      buildHanbaitenPreviewResponse({
        page_no: 1,
        per_page: HB_PER,
        total_pages: 1,
        total_rows: 3,
        is_last_page: true,
        group_count: 1,
      }),
    );

    (wrapper.vm as any).formState.tekiyo_date = '2026-04-01';
    (wrapper.vm as any).formState.hanbaiten_ids = [1];
    await wrapper.find(preview()).trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="meibo-pager"]').exists()).toBe(false);
  });
});

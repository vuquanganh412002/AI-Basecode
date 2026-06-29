// Screen: ACSMS-SCR-020 — 口座振替データ出力画面
//
// Drives src/views/koza-furikae/KozaFurikaeExportView.vue. Each it() maps to a
// clause in:
//   docs/design/ACSMS-SCR-020/screen-design.md (機能定義 + メッセージ情報)
//   docs/design/ACSMS-SCR-020/index.html (UI labels: 年月日 / 引落日 / 委託者コード /
//     貯金種目 / 作成開始)
//   docs/design/ACSMS-SCR-020/ACSMS-SCR-020-api.md (API-020-001 initial / 002 export CSV)
//
// The view defineExposes `{ formState }` so setup can seed the JASTEM form
// (antd controls aren't drivable via jsdom DOM events). Buttons are clicked
// through `[data-test]` markers. 作成開始 → POST export → Blob ダウンロード or
// MSG-020-002 (対象データなし) / MSG-020-004 (必須項目).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import KozaFurikaeExportView from '@/views/koza-furikae/KozaFurikaeExportView.vue';
import {
  buildKozaFurikaeUser,
  buildKozaFurikaeInitial,
  buildKanriShitenDropdown,
  buildShitenDropdown,
  buildKozaShitenDropdown,
  buildKozaFurikaeForm,
} from '@test/fixtures/koza-furikae.fixture';

// API wrappers — /gen-code-frontend emits @/api/koza-furikae/koza-furikae and
// adds getKozaShitenDropdown to @/api/shiten/shiten.
vi.mock('@/api/koza-furikae/koza-furikae', () => ({
  getInitialKozaFurikae: vi.fn(),
  exportKozaFurikae: vi.fn(),
}));
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
}));
vi.mock('@/api/shiten/shiten', () => ({
  getShitenDropdown: vi.fn(),
  getKozaShitenDropdown: vi.fn(),
}));

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

// Blob → file download helpers the CSV export uses.
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
  user?: ReturnType<typeof buildKozaFurikaeUser>;
}

async function setApiMocks() {
  const { getInitialKozaFurikae, exportKozaFurikae } = await import(
    '@/api/koza-furikae/koza-furikae'
  );
  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  const { getShitenDropdown, getKozaShitenDropdown } = await import('@/api/shiten/shiten');
  vi.mocked(getInitialKozaFurikae).mockResolvedValue(buildKozaFurikaeInitial());
  vi.mocked(getKanriShitenDropdown).mockResolvedValue(buildKanriShitenDropdown());
  vi.mocked(getShitenDropdown).mockResolvedValue(buildShitenDropdown());
  vi.mocked(getKozaShitenDropdown).mockResolvedValue(buildKozaShitenDropdown());
  vi.mocked(exportKozaFurikae).mockResolvedValue({
    blob: new Blob(['1,21,0,...'], { type: 'text/csv' }),
    filename: '口座振替データ_JA001_2026年05月27日.csv',
  });
  return { getInitialKozaFurikae, exportKozaFurikae, getKanriShitenDropdown, getShitenDropdown, getKozaShitenDropdown };
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
      { path: '/koza-furikae', name: 'KozaFurikaeExport', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'KozaFurikaeExport' });
  await router.isReady();

  const wrapper = mount(KozaFurikaeExportView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildKozaFurikaeUser() },
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

const createBtn = () => '[data-test="create-btn"]';

/** Seed every required JASTEM field on formState so 作成開始 passes validation. */
function fillRequired(wrapper: any, overrides: Record<string, unknown> = {}): void {
  Object.assign((wrapper.vm as any).formState, buildKozaFurikaeForm(overrides));
}

/** Blank every required field on formState so 作成開始 fails validation. */
function blankRequired(wrapper: any): void {
  Object.assign((wrapper.vm as any).formState, {
    target_month: '',
    hikiotoshi_date: '',
    jastem_itakusha_code: '',
    jastem_itakusha_name: '',
    jastem_ja_code: '',
    jastem_ja_name: '',
    jastem_toriatsukai_tenpo_code: '',
    jastem_tenpo_name: '',
    jastem_tyokin_shubetsu: '',
    jastem_koza_no: '',
  });
}

// ───────────────────────────────────────────────────────────────────────
// 1. 画面表示 (機能定義 1)
// ───────────────────────────────────────────────────────────────────────
describe('KozaFurikaeExportView — 画面表示', () => {
  beforeEach(async () => {
    await setApiMocks();
  });

  it('should fetch the initial JASTEM data when the view is mounted', async () => {
    const { getInitialKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    await renderView();
    expect(getInitialKozaFurikae).toHaveBeenCalled();
  });

  it('should load 管理支店 / 支店 / 口座支店 dropdowns when the view is mounted', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    const { getShitenDropdown, getKozaShitenDropdown } = await import('@/api/shiten/shiten');
    await renderView();
    expect(getKanriShitenDropdown).toHaveBeenCalled();
    expect(getShitenDropdown).toHaveBeenCalled();
    expect(getKozaShitenDropdown).toHaveBeenCalled();
  });

  it('should populate the JASTEM 委託者コード field from initial data when mounted', async () => {
    const { wrapper } = await renderView();
    expect((wrapper.vm as any).formState.jastem_itakusha_code).toBe('1234567890');
  });

  it('should default 貯金種目 to 普通貯金 ("1") when the form is first displayed', async () => {
    const { getInitialKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    // Initial data with no shiten → 貯金種目 defaults to "1".
    vi.mocked(getInitialKozaFurikae).mockResolvedValue(
      buildKozaFurikaeInitial({ jastem_tyokin_shubetsu: '1' }),
    );
    const { wrapper } = await renderView();
    expect((wrapper.vm as any).formState.jastem_tyokin_shubetsu).toBe('1');
  });

  it('should render the 年月日 / 引落日 / 委託者コード labels when the form is displayed', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('年月日'))).toBe(true);
    expect(labels.some((t) => t.includes('引落日'))).toBe(true);
    expect(labels.some((t) => t.includes('委託者コード'))).toBe(true);
  });

  it('should render the 作成開始 button when the form is displayed', async () => {
    const { wrapper } = await renderView();
    const btn = wrapper.find(createBtn());
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('作成開始');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 作成開始 — バリデーション (機能定義 2.2 / MSG-020-004)
// ───────────────────────────────────────────────────────────────────────
describe('KozaFurikaeExportView — 作成開始 バリデーション', () => {
  beforeEach(async () => {
    await setApiMocks();
  });

  it('should show 必須項目です。 and NOT call exportKozaFurikae when required fields are blank', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const { wrapper } = await renderView();
    blankRequired(wrapper);
    await flushPromises();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(exportKozaFurikae).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 (not エラーが発生しました) when 年月日 is cleared to undefined', async () => {
    const { wrapper } = await renderView();
    fillRequired(wrapper);
    (wrapper.vm as any).formState.target_month = undefined;
    await flushPromises();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 作成開始 — エクスポート (機能定義 2.3 / 2.4 / MSG-020-001 / 002 / 003)
// ───────────────────────────────────────────────────────────────────────
describe('KozaFurikaeExportView — 作成開始 エクスポート', () => {
  beforeEach(async () => {
    await setApiMocks();
  });

  it('should call exportKozaFurikae with the form payload when 作成開始 is clicked with valid input', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const { wrapper } = await renderView();
    fillRequired(wrapper);
    await flushPromises();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(exportKozaFurikae).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(exportKozaFurikae).mock.calls[0]?.[0];
    expect(arg.target_month).toBe('2026-05-01');
    expect(arg.hikiotoshi_date).toBe('2026-05-27');
    expect(arg.jastem_itakusha_code).toBe('1234567890');
  });

  it('should trigger a file download and toast 口座振替データの作成が完了しました。 when the export succeeds', async () => {
    const { wrapper } = await renderView();
    fillRequired(wrapper);
    await flushPromises();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(createObjectURL).toHaveBeenCalled();
    expect(message.success).toHaveBeenCalledWith('口座振替データの作成が完了しました。');
  });

  it('should toast 対象データがありません。 (warning) when the export rejects with NO_TARGET_DATA', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    vi.mocked(exportKozaFurikae).mockRejectedValueOnce({ error_code: 'NO_TARGET_DATA' });
    const { wrapper } = await renderView();
    fillRequired(wrapper);
    await flushPromises();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(message.warning).toHaveBeenCalledWith('対象データがありません。');
  });

  it('should NOT trigger a download when the export rejects with NO_TARGET_DATA', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    vi.mocked(exportKozaFurikae).mockRejectedValueOnce({ error_code: 'NO_TARGET_DATA' });
    const { wrapper } = await renderView();
    fillRequired(wrapper);
    await flushPromises();
    createObjectURL.mockClear();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(createObjectURL).not.toHaveBeenCalled();
  });
});

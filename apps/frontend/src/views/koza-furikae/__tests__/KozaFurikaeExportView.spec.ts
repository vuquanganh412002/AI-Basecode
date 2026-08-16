// Screen: ACSMS-SCR-020 — 口座振替データ出力画面（v1.1: プレビュー→金額編集→ファイル作成）
//
// Drives src/views/koza-furikae/KozaFurikaeExportView.vue. v1.1 の2ステップ:
//   ① 作成開始 (preview-btn) → previewKozaFurikae → 編集テーブル表示
//   ② 金額編集 → ③ ファイル作成 (create-btn) → exportKozaFurikae(rows付き) → Blob DL
// 対象0件は preview 段で MSG-020-002 を画面内表示。
//
// The view defineExposes `{ formState, previewRows, previewed, ... }`.
// antd controls aren't drivable via jsdom, so form seeding goes through
// formState and buttons via `[data-test]`.

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
  buildKozaPreview,
} from '@test/fixtures/koza-furikae.fixture';

vi.mock('@/api/koza-furikae/koza-furikae', () => ({
  getInitialKozaFurikae: vi.fn(),
  previewKozaFurikae: vi.fn(),
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

const createObjectURL = vi.fn(() => 'blob:mock-url');
const revokeObjectURL = vi.fn();
beforeEach(() => {
  // 各テストで呼び出し履歴をリセット（describe 内の後続テストが前のテストの
  // export/preview 呼び出しを引き継がないように）。実装は setApiMocks が再設定する。
  vi.clearAllMocks();
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
  const { getInitialKozaFurikae, previewKozaFurikae, exportKozaFurikae } = await import(
    '@/api/koza-furikae/koza-furikae'
  );
  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  const { getShitenDropdown, getKozaShitenDropdown } = await import('@/api/shiten/shiten');
  vi.mocked(getInitialKozaFurikae).mockResolvedValue(buildKozaFurikaeInitial());
  vi.mocked(getKanriShitenDropdown).mockResolvedValue(buildKanriShitenDropdown());
  vi.mocked(getShitenDropdown).mockResolvedValue(buildShitenDropdown());
  vi.mocked(getKozaShitenDropdown).mockResolvedValue(buildKozaShitenDropdown());
  vi.mocked(previewKozaFurikae).mockResolvedValue(buildKozaPreview() as any);
  vi.mocked(exportKozaFurikae).mockResolvedValue({
    blob: new Blob(['ZENOUTFD'], { type: 'text/plain' }),
    filename: 'ZENOUTFD',
  });
  return { getInitialKozaFurikae, previewKozaFurikae, exportKozaFurikae };
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
      { path: '/dokusya', name: 'DokusyaList', component: { template: '<div />' } },
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

const previewBtn = () => '[data-test="preview-btn"]';
const createBtn = () => '[data-test="create-btn"]';

function fillRequired(wrapper: any, overrides: Record<string, unknown> = {}): void {
  Object.assign((wrapper.vm as any).formState, buildKozaFurikaeForm(overrides));
}

/** 作成開始（プレビュー）を実行して編集テーブルを表示させる。 */
async function doPreview(wrapper: any): Promise<void> {
  fillRequired(wrapper);
  await flushPromises();
  await wrapper.find(previewBtn()).trigger('click');
  await flushPromises();
}

// ───────────────────────────────────────────────────────────────────────
// 1. 画面表示
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
    expect(getShitenDropdown).toHaveBeenCalledWith({ kinyu_shiten_flg: false });
    expect(getKozaShitenDropdown).toHaveBeenCalled();
  });

  it('should populate the JASTEM 委託者コード field from initial data when mounted', async () => {
    const { wrapper } = await renderView();
    expect((wrapper.vm as any).formState.jastem_itakusha_code).toBe('1234567890');
  });

  // ボタン名は ACSMS-SCR-028/029 と統一（顧客要件2026-08、旧称: 作成開始）。
  it('should render the レポートプレビュー button and NOT the ファイル作成 button before previewing', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.find(previewBtn()).exists()).toBe(true);
    expect(wrapper.find(previewBtn()).text()).toContain('レポートプレビュー');
    // ファイル作成はプレビュー前は非表示。
    expect(wrapper.find(createBtn()).exists()).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 作成開始（プレビュー）— バリデーション (D8: 日付のみ必須) + 取得
// ───────────────────────────────────────────────────────────────────────
describe('KozaFurikaeExportView — 作成開始（プレビュー）', () => {
  beforeEach(async () => {
    await setApiMocks();
  });

  it('should show 必須項目です。 and NOT call previewKozaFurikae when 年月日 is blank', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const { wrapper } = await renderView();
    (wrapper.vm as any).formState.target_month = '';
    (wrapper.vm as any).formState.hikiotoshi_date = '';
    await flushPromises();

    await wrapper.find(previewBtn()).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(previewKozaFurikae).not.toHaveBeenCalled();
  });

  it('should call previewKozaFurikae with the filter payload and render the editable table', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const { wrapper } = await renderView();
    await doPreview(wrapper);

    expect(previewKozaFurikae).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(previewKozaFurikae).mock.calls[0]?.[0];
    expect(arg.target_month).toBe('2026-05-01');
    expect(arg.hikiotoshi_date).toBe('2026-05-27');
    // 編集テーブル + ファイル作成ボタンが出る。
    expect(wrapper.find('[data-test="preview-section"]').exists()).toBe(true);
    expect(wrapper.find(createBtn()).exists()).toBe(true);
    expect((wrapper.vm as any).previewRows).toHaveLength(2);
  });

  it('should give each row\'s 金額 input its own accessible name via aria-label (regression: no accessible name at all)', async () => {
    const { wrapper } = await renderView();
    await doPreview(wrapper);

    const amountInput = wrapper.find('[data-test="kingaku-1"]');
    expect(amountInput.exists()).toBe(true);
    const ariaLabel = amountInput.attributes('aria-label');
    expect(ariaLabel).toBeDefined();
    expect(ariaLabel).toContain('ﾔﾏﾀﾞ ﾀﾛｳ');

    const otherAmountInput = wrapper.find('[data-test="kingaku-2"]');
    const otherAriaLabel = otherAmountInput.attributes('aria-label');
    expect(otherAriaLabel).toContain('ｽｽﾞｷ ﾊﾅｺ');
    // Each row's amount field must be independently identifiable.
    expect(otherAriaLabel).not.toBe(ariaLabel);
  });

  it('should show 対象データがありません。 and NOT show ファイル作成 when preview returns NO_TARGET_DATA', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    vi.mocked(previewKozaFurikae).mockRejectedValueOnce({ error_code: 'NO_TARGET_DATA' });
    const { wrapper } = await renderView();
    await doPreview(wrapper);

    expect(wrapper.find('[data-test="koza-no-data"]').exists()).toBe(true);
    expect(wrapper.find(createBtn()).exists()).toBe(false);
    expect((wrapper.vm as any).previewed).toBe(false);
  });

  it('should render the 失効単価 error list (not a toast) when preview returns INACTIVE_TANKA_REFERENCED', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    vi.mocked(previewKozaFurikae).mockRejectedValueOnce({
      error_code: 'INACTIVE_TANKA_REFERENCED',
      message: '失効した単価を参照している購読者が存在するため、口座振替データを出力できません。該当購読者の単価を変更してから再度実行してください。',
      total: 2,
      errors: [
        { field: '1', message: 'ﾔﾏﾀﾞ ﾀﾛｳ（単価: T001 旧購読料）' },
        { field: '5', message: 'ｽｽﾞｷ ﾊﾅｺ（単価: T001 旧購読料）' },
      ],
    });
    const { wrapper } = await renderView();
    await doPreview(wrapper);

    // インラインエラー一覧が該当購読者を列挙する（トーストではない）。
    const panel = wrapper.find('[data-test="inactive-tanka-error-list"]');
    expect(panel.exists()).toBe(true);
    const rows = wrapper.findAll('[data-test="inactive-tanka-error-row"]');
    expect(rows).toHaveLength(2);
    expect(panel.text()).toContain('ﾔﾏﾀﾞ ﾀﾛｳ');
    // プレビューは表示せず、ファイル作成ボタンも出さない。
    expect(wrapper.find('[data-test="preview-section"]').exists()).toBe(false);
    expect(wrapper.find(createBtn()).exists()).toBe(false);
    expect((wrapper.vm as any).previewed).toBe(false);
  });

  it('should navigate to 購読者明細検索 with ?inactive_tanka=1 when the deep-link button is clicked', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    vi.mocked(previewKozaFurikae).mockRejectedValueOnce({
      error_code: 'INACTIVE_TANKA_REFERENCED',
      message: 'x',
      total: 2,
      errors: [{ field: '1', message: 'ﾔﾏﾀﾞ ﾀﾛｳ' }],
    });
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');
    await doPreview(wrapper);

    await wrapper.find('[data-test="goto-dokusya-search"]').trigger('click');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith({
      name: 'DokusyaList',
      query: { inactive_tanka: '1' },
    });
  });

  it('should show 該当 N 件中 15 件 summary when the error list is capped (total > shown)', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    // total=245 だが errors[] は先頭15件のみ（BE の LIMIT 15）。
    const errors = Array.from({ length: 15 }, (_, i) => ({
      field: String(i + 1),
      message: `購読者${i + 1}（単価: T001 旧購読料）`,
    }));
    vi.mocked(previewKozaFurikae).mockRejectedValueOnce({
      error_code: 'INACTIVE_TANKA_REFERENCED',
      message: 'x',
      total: 245,
      errors,
    });
    const { wrapper } = await renderView();
    await doPreview(wrapper);

    // 15件だけ描画（残りは購読者明細検索へ誘導）。
    expect(wrapper.findAll('[data-test="inactive-tanka-error-row"]')).toHaveLength(15);
    const summary = wrapper.find('[data-test="inactive-tanka-error-summary"]');
    expect(summary.text()).toContain('245');
    expect(summary.text()).toContain('15');
    expect(summary.text()).toContain('購読者明細検索');
    expect((wrapper.vm as any).inactiveTankaTotal).toBe(245);
  });

  it('should clear the 失効単価 error list when a filter changes after the error', async () => {
    const { previewKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    vi.mocked(previewKozaFurikae).mockRejectedValueOnce({
      error_code: 'INACTIVE_TANKA_REFERENCED',
      message: 'x',
      errors: [{ field: '1', message: 'ﾔﾏﾀﾞ ﾀﾛｳ' }],
    });
    const { wrapper } = await renderView();
    await doPreview(wrapper);
    expect(wrapper.find('[data-test="inactive-tanka-error-list"]').exists()).toBe(true);

    (wrapper.vm as any).formState.target_month = '2026-06-01';
    await flushPromises();

    expect(wrapper.find('[data-test="inactive-tanka-error-list"]').exists()).toBe(false);
  });

  it('should discard the preview (hide ファイル作成) when a filter changes after previewing (D1)', async () => {
    const { wrapper } = await renderView();
    await doPreview(wrapper);
    expect(wrapper.find(createBtn()).exists()).toBe(true);

    // フィルタ（年月日）を変更 → プレビュー破棄。
    (wrapper.vm as any).formState.target_month = '2026-06-01';
    await flushPromises();

    expect((wrapper.vm as any).previewed).toBe(false);
    expect(wrapper.find(createBtn()).exists()).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. ファイル作成 — 編集金額の送信 + ダウンロード
// ───────────────────────────────────────────────────────────────────────
describe('KozaFurikaeExportView — ファイル作成', () => {
  beforeEach(async () => {
    await setApiMocks();
  });

  it('should call exportKozaFurikae with the edited 金額 rows when ファイル作成 is clicked', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const { wrapper } = await renderView();
    await doPreview(wrapper);

    // ユーザーが1行目の金額を編集。
    (wrapper.vm as any).previewRows[0].furikae_kingaku = 8000;
    await flushPromises();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(exportKozaFurikae).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(exportKozaFurikae).mock.calls[0]?.[0];
    expect(arg.rows).toEqual([
      { dokusya_id: 1, furikae_kingaku: 8000 },
      { dokusya_id: 2, furikae_kingaku: 4900 },
    ]);
    expect(arg.jastem_itakusha_code).toBe('1234567890');
  });

  it('should trigger a file download and toast 口座振替データの作成が完了しました。 when the export succeeds', async () => {
    const { wrapper } = await renderView();
    await doPreview(wrapper);

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(createObjectURL).toHaveBeenCalled();
    expect(message.success).toHaveBeenCalledWith('口座振替データの作成が完了しました。');
  });

  it('should show the JASTEM error banner and NOT call exportKozaFurikae when a JASTEM field is blank', async () => {
    // JASTEM 項目は master 由来の readonly 表示のため、未設定時はセクションの
    // エラーバナー（jastem-error）でまとめて通知し、export をブロックする。
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const { wrapper } = await renderView();
    await doPreview(wrapper);
    (wrapper.vm as any).formState.jastem_koza_no = '';
    await flushPromises();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(exportKozaFurikae).not.toHaveBeenCalled();
    const banner = wrapper.find('[data-test="jastem-error"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('未設定のため出力できません');
  });

  it('should NOT call exportKozaFurikae when an edited 金額 is out of range', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    const { wrapper } = await renderView();
    await doPreview(wrapper);
    (wrapper.vm as any).previewRows[0].furikae_kingaku = -5;
    await flushPromises();

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(exportKozaFurikae).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="amount-error"]').exists()).toBe(true);
  });

  it('should toast 対象データがありません。 (warning) when export rejects with NO_TARGET_DATA', async () => {
    const { exportKozaFurikae } = await import('@/api/koza-furikae/koza-furikae');
    vi.mocked(exportKozaFurikae).mockRejectedValueOnce({ error_code: 'NO_TARGET_DATA' });
    const { wrapper } = await renderView();
    await doPreview(wrapper);

    await wrapper.find(createBtn()).trigger('click');
    await flushPromises();

    expect(message.warning).toHaveBeenCalledWith('対象データがありません。');
  });
});

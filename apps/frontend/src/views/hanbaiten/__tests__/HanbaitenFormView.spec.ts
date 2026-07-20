// Screen: ACSMS-SCR-017 — 販売店情報登録画面
// Screen: ACSMS-SCR-017 — 販売店情報登録画面
//
// Drives src/views/hanbaiten/HanbaitenFormView.vue (rewrites the SCR-018-era
// TODO placeholder). The single view covers both CREATE (route
// `HanbaitenCreate`) and EDIT (route `HanbaitenEdit`, same component with
// `:id` param). Every it() maps to a clause in
// docs/design/ACSMS-SCR-017/screen-design.md (機能定義 + メッセージ情報) +
// docs/design/ACSMS-SCR-017/index.html (UI structure) +
// docs/design/ACSMS-SCR-017/ACSMS-SCR-017-api.md (API-017-001..003).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import HanbaitenFormView from '@/views/hanbaiten/HanbaitenFormView.vue';
import {
  buildHanbaitenDetail,
  buildCreateHanbaitenForm,
  buildTodofukenList,
  buildCodesSeed,
} from '@test/fixtures/hanbaiten-form.fixture';
import { buildAuthUser } from '@test/fixtures/hanbaiten.fixture';

// API wrapper for SCR-017 endpoints. The existing
// `src/api/hanbaiten/hanbaiten.ts` (SCR-018) exports `listHanbaiten` +
// `removeHanbaiten`; /gen-code-frontend will EXTEND that file with
// `getHanbaiten`, `createHanbaiten`, `updateHanbaiten` per API-017-001..003.
vi.mock('@/api/hanbaiten/hanbaiten', () => ({
  listHanbaiten: vi.fn(),
  removeHanbaiten: vi.fn(),
  getHanbaiten: vi.fn(),
  createHanbaiten: vi.fn(),
  updateHanbaiten: vi.fn(),
}));

// Prefecture dropdown lookup (ACSMS-API-COMMON-001).
vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

// 配達手数料単価 dropdown (BaseTankaDropdown calls this on mount). Without
// this stub the component hits the real network in jsdom → ERR_NETWORK
// unhandled rejections pollute the suite output.
vi.mock('@/api/tanka/tanka', () => ({
  getTankaDropdown: vi.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, page: 1, per_page: 50, has_more: false },
  }),
}));

// BaseJaDropdown (only rendered for NICHINO_STAFF) calls /api/v1/ja/dropdown
// — same rationale as the tanka stub above.
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
  /** Edit mode: pass a number → router navigates to HanbaitenEdit/:id. */
  hanbaitenId?: number;
  /** Override default JA_HONTEN session (for access-denied path). */
  user?: ReturnType<typeof buildAuthUser>;
  /**
   * Optional route query (legacy — kept for any query-based tests).
   */
  query?: Record<string, string>;
  /**
   * Router history-state JA id — the staff-prefill flow reads
   * `globalThis.history.state.jaId` (set by HanbaitenListView.goCreate).
   */
  jaState?: number;
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
  if (opts.hanbaitenId !== undefined) {
    await router.push({
      name: 'HanbaitenEdit',
      params: { id: String(opts.hanbaitenId) },
    });
  } else {
    await router.push({ name: 'HanbaitenCreate', query: opts.query });
  }
  await router.isReady();

  // Memory-history router doesn't touch globalThis.history; the staff
  // prefill reads globalThis.history.state.jaId, so set it explicitly.
  if (opts.jaState !== undefined) {
    globalThis.history.replaceState({ jaId: opts.jaState }, '');
  }

  const wrapper = mount(HanbaitenFormView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAuthUser() },
            // Seed the m_code cache so any v-for over ITAKU_KUBUN /
            // YOKIN_SHUBETSU / TESURYO_KUBUN renders its option
            // template branches.
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

/**
 * Bulk-apply a form payload while respecting cascade watchers (if any).
 * Mirrors the pattern from AccountFormView spec — the view-side watchers
 * may wipe downstream fields when an upstream changes, so the helper
 * re-applies the target values after one flush tick.
 */
async function fillForm(
  vm: { formState: Record<string, unknown> },
  form: object,
): Promise<void> {
  Object.assign(vm.formState, form);
  await flushPromises();
  // Re-apply the conditional-required cluster so any itaku_kubun watcher
  // that wipes bank fields when itaku_kubun !== 1 doesn't silently clear
  // them mid-test.
  Object.assign(vm.formState, form);
  await flushPromises();
}

beforeEach(async () => {
  vi.clearAllMocks();
  // Clear any router history state set by a prior test so the staff
  // ?ja_id prefill (read from globalThis.history.state.jaId) doesn't leak.
  globalThis.history.replaceState(null, '');
  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue({ data: buildTodofukenList() });

  const { getHanbaiten, createHanbaiten, updateHanbaiten } = await import(
    '@/api/hanbaiten/hanbaiten'
  );
  vi.mocked(getHanbaiten).mockResolvedValue({ data: buildHanbaitenDetail() });
  vi.mocked(createHanbaiten).mockResolvedValue({
    data: buildHanbaitenDetail({ hanbaiten_id: 99 }),
    message: '登録しました。',
  });
  vi.mocked(updateHanbaiten).mockResolvedValue({
    data: buildHanbaitenDetail(),
    message: '更新しました。',
  });
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — initial render (機能定義 1.1 / 1.2)', () => {
  it.each([
    ['販売店コード', 'create mode'],
    ['販売店名称', 'create mode'],
    ['カナ', 'mounted'],
    ['都道府県', 'mounted'],
  ])('should render the %s label when %s', async (labelText) => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes(labelText))).toBe(true);
  });

  it('should render the 郵便番号 / 住所 / 電話番号 / FAX labels when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('郵便番号'))).toBe(true);
    expect(labels.some((t) => t.includes('住所'))).toBe(true);
    expect(labels.some((t) => t.includes('電話番号'))).toBe(true);
    expect(labels.some((t) => t.includes('FAX'))).toBe(true);
  });

  it('should render the 所長名 / 委託区分 / 配達手数料単価 / インボイス番号 labels when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('所長名'))).toBe(true);
    expect(labels.some((t) => t.includes('委託区分'))).toBe(true);
    expect(labels.some((t) => t.includes('配達手数料単価'))).toBe(true);
    expect(labels.some((t) => t.includes('インボイス番号'))).toBe(true);
  });

  it('should render the bank-section labels (金融機関コード / 金融機関名 / 口座支店コード / 口座支店名 / 口座種別 / 口座番号 / 口座名義) when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('金融機関コード'))).toBe(true);
    expect(labels.some((t) => t.includes('金融機関名'))).toBe(true);
    expect(labels.some((t) => t.includes('口座支店コード'))).toBe(true);
    expect(labels.some((t) => t.includes('口座支店名'))).toBe(true);
    expect(labels.some((t) => t.includes('口座種別'))).toBe(true);
    expect(labels.some((t) => t.includes('口座番号'))).toBe(true);
    expect(labels.some((t) => t.includes('口座名義'))).toBe(true);
  });

  it('should render the 配達手数料支払サイクル / 振込手数料負担区分 / 手数料 / 備考 labels when mounted (create)', async () => {
    // [haiten-edit-only] 廃店フラグ deliberately omitted from CREATE mode
    // (customer 2026-05-26 — new hanbaiten are always 営業中). The edit
    // mode below asserts it DOES render.
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('配達手数料支払サイクル'))).toBe(true);
    expect(labels.some((t) => t.includes('振込手数料負担区分'))).toBe(true);
    expect(labels.some((t) => t.includes('振込手数料'))).toBe(true);
    expect(labels.some((t) => t.includes('備考'))).toBe(true);
    expect(labels.some((t) => t.includes('廃店フラグ'))).toBe(false);
  });

  it('should render 配達手数料支払サイクル as a 1〜12 dropdown (not a free text input)', async () => {
    const { wrapper } = await renderView();
    const item = wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.text().includes('配達手数料支払サイクル'));
    expect(item).toBeTruthy();
    const select = item!.findComponent({ name: 'ASelect' });
    expect(select.exists()).toBe(true);
    const options = select.props('options') as Array<{ value: number }>;
    expect(options.map((o) => o.value)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('should render the 廃店フラグ checkbox in edit mode', async () => {
    // [haiten-edit-only] EDIT mode keeps the toggle so ops can mark a
    // store as 廃店.
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('廃店フラグ'))).toBe(true);
  });

  it('should fetch the todofuken dropdown once when mounted (COMMON-001)', async () => {
    await renderView();
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    expect(getTodofukenList).toHaveBeenCalledTimes(1);
  });

  it('should NOT call getHanbaiten when mounted in create mode (no :id)', async () => {
    await renderView();
    const { getHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    expect(getHanbaiten).not.toHaveBeenCalled();
  });

  it('should render the 登録 submit button when mounted in create mode', async () => {
    // Antd inserts a half-width space between two CJK chars (登 録) —
    // match by selector + substring rather than literal text.
    const { wrapper } = await renderView();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.text()).toContain('登');
  });

  it('should render the 前の画面に戻る back button when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('前の画面に戻る');
  });

  it('should default haiten_flg to false when mounted in create mode', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    expect(vm.formState?.haiten_flg).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 編集モード — form pre-fill (機能定義 2.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — edit mode pre-fill (機能定義 2.x)', () => {
  it('should call getHanbaiten with the route id when mounted in edit mode', async () => {
    await renderView({ hanbaitenId: 1 });
    const { getHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    expect(getHanbaiten).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getHanbaiten).mock.calls[0]?.[0]).toBe(1);
  });

  it('should pre-fill form fields with the API response values when in edit mode', async () => {
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const values = inputs.map((i) => (i.element as HTMLInputElement).value);
    expect(values.some((v) => v === 'H001')).toBe(true);
    expect(values.some((v) => v === '販売店A')).toBe(true);
    expect(values.some((v) => v === '山田太郎')).toBe(true);
    expect(values.some((v) => v === '0312345678')).toBe(true);
  });

  it('should disable the hanbaiten_code input when in edit mode (販売店コード変更不可)', async () => {
    // 機能定義 2.x — 販売店コードは変更不可（disabled）.
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const codeInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === 'H001',
    );
    expect(codeInput).toBeDefined();
    expect(codeInput!.attributes('disabled')).toBeDefined();
  });

  it('should render the 更新 submit button (not 登録) when mounted in edit mode', async () => {
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    // Antd auto-spacing — match by single CJK char.
    expect(submitBtn.text()).toContain('更');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 必須バリデーション — base fields (機能定義 3.1 / ACSMS-MSG-017-007)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — required field validation (機能定義 3.1)', () => {
  it('should show 必須項目です。 when hanbaiten_code is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ hanbaiten_code: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  // Large CRUD form — pressing Enter inside a text input must NOT implicitly
  // submit (Japanese IME "next field" reflex). Regression guard for
  // preventEnterImplicitSubmit wired on the <a-form>.
  it('should NOT call createHanbaiten when user presses Enter inside a text input', async () => {
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    const { wrapper } = await renderView();
    await flushPromises();

    const firstInput = wrapper.find('input');
    expect(firstInput.exists()).toBe(true);
    await firstInput.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when hanbaiten_name is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ hanbaiten_name: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should reject tel / fax with a hyphen (half-width digits only) and NOT submit', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ tel: '03-1234-5678' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain(
      '電話番号は半角数字のみ（ハイフンなし）入力可能です。',
    );
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should NOT show 必須項目です。 when hanbaiten_name_kana is empty (optional)', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(createHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ hanbaiten_name_kana: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // 販売店名称（カナ） is optional per api.md §1.1. createHanbaiten
    // should have been called (blank kana is allowed).
    expect(createHanbaiten).toHaveBeenCalledTimes(1);
  });

  it('should show a half-width katakana format error when hanbaiten_name_kana is hiragana and 登録 is clicked', async () => {
    // vue.md §Kana fields — 半角カタカナ only (project default for
    // *_name_kana — half-width for Zengin / bank-CSV compatibility).
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(createHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({
      hanbaiten_name_kana: 'はんばいてん',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('半角カタカナ');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. 委託区分による条件付き必須 (画面設計書 v1.2 §3.1 + api.md §4.1)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — itaku_kubun=1 conditional-required (No.17-23)', () => {
  it('should show 必須項目です。 when itaku_kubun=1 and bank_code is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ bank_code: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when itaku_kubun=1 and bank_name is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ bank_name: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when itaku_kubun=1 and bank_branch_code is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ bank_branch_code: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when itaku_kubun=1 and bank_branch_name is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ bank_branch_name: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when itaku_kubun=1 and yokin_shubetsu is unset and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ yokin_shubetsu: null }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when itaku_kubun=1 and koza_no is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ koza_no: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should show 必須項目です。 when itaku_kubun=1 and koza_meigi is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({ koza_meigi: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. 委託区分=2 / 9 — bank fields stay optional (画面設計書 v1.2 §3.1)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — itaku_kubun=2/9 bank fields optional', () => {
  it('should call createHanbaiten when itaku_kubun=2 (日農委託) and all bank fields are blank', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(createHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({
      itaku_kubun: 2,
      bank_code: '',
      bank_name: '',
      bank_branch_code: '',
      bank_branch_name: '',
      yokin_shubetsu: null,
      koza_no: '',
      koza_meigi: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // itaku_kubun=2 → bank fields not required, submit should pass.
    expect(createHanbaiten).toHaveBeenCalledTimes(1);
  });

  it('should call createHanbaiten when itaku_kubun=9 (その他) and all bank fields are blank', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(createHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm({
      itaku_kubun: 9,
      bank_code: '',
      bank_name: '',
      bank_branch_code: '',
      bank_branch_name: '',
      yokin_shubetsu: null,
      koza_no: '',
      koza_meigi: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createHanbaiten).toHaveBeenCalledTimes(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. 登録 (create) — happy path (機能定義 3.3 / 3.4 / ACSMS-MSG-017-001)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — create success (機能定義 3.3 / 3.4)', () => {
  it('should call createHanbaiten with the form body when 登録 is clicked with valid input', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(createHanbaiten).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createHanbaiten).toHaveBeenCalledTimes(1);
    const body = vi.mocked(createHanbaiten).mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(body).toMatchObject({
      hanbaiten_code: 'H001',
      hanbaiten_name: '販売店A',
      itaku_kubun: 1,
    });
  });

  it('should show 「登録しました。」 toast when createHanbaiten succeeds (ACSMS-MSG-017-001)', async () => {
    const { wrapper } = await renderView();
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Project verb-only convention — useNotify().created() → '登録しました。'.
    expect(successSpy).toHaveBeenCalledWith('登録しました。');
  });

  it('should navigate to HanbaitenList when createHanbaiten succeeds', async () => {
    // 機能定義 3.4 — 登録後一覧画面へ遷移.
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('HanbaitenList');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. 登録 — エラーフロー (DUPLICATE_CODE + INTERNAL_SERVER_ERROR)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — create error paths (ACSMS-MSG-017-003 / 006)', () => {
  it('should show ACSMS-MSG-017-003 field error when createHanbaiten rejects with DUPLICATE_CODE', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(createHanbaiten).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'DUPLICATE_CODE',
          message: '販売店コード「H001」はすでに登録されています。',
          errors: [
            {
              field: 'hanbaiten_code',
              message: '販売店コード「H001」はすでに登録されています。',
            },
          ],
        },
      },
    });

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('販売店コード「H001」はすでに登録されています。');
  });

  it('should NOT show success toast when createHanbaiten rejects with 500', async () => {
    // 機能定義 3.4 — システムエラー → ACSMS-MSG-017-006 (interceptor toasts).
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(createHanbaiten).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });

  it('should NOT navigate when createHanbaiten rejects with VALIDATION_ERROR', async () => {
    const { wrapper, router } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(createHanbaiten).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          errors: [{ field: 'tel', message: '電話番号は半角数字で入力してください。' }],
        },
      },
    });
    const pushSpy = vi.spyOn(router, 'push');
    pushSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateHanbaitenForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).not.toContain('HanbaitenList');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. 編集モード — update (機能定義 3.4 / ACSMS-MSG-017-002)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — update flow (edit mode)', () => {
  it('should call updateHanbaiten with the route id when 更新 is clicked in edit mode', async () => {
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const { updateHanbaiten, createHanbaiten } = await import(
      '@/api/hanbaiten/hanbaiten'
    );
    vi.mocked(updateHanbaiten).mockClear();

    // 編集で何か変更しないと「変更なし」ガードでスキップされる。
    (wrapper.vm as any).formState.hanbaiten_name = '変更後販売店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createHanbaiten).not.toHaveBeenCalled();
    expect(updateHanbaiten).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateHanbaiten).mock.calls[0]?.[0]).toBe(1);
  });

  it('should NOT include hanbaiten_code in the update body when submitting in edit mode (更新不可)', async () => {
    // api.md §3 注記 — hanbaiten_code は更新リクエストに含めない.
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const { updateHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(updateHanbaiten).mockClear();

    (wrapper.vm as any).formState.hanbaiten_name = '変更後販売店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const body = vi.mocked(updateHanbaiten).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).toBeDefined();
    expect(body.hanbaiten_code).toBeUndefined();
  });

  it('should show 「更新しました。」 toast when updateHanbaiten succeeds (ACSMS-MSG-017-002)', async () => {
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    (wrapper.vm as any).formState.hanbaiten_name = '変更後販売店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('更新しました。');
  });

  it('should navigate to HanbaitenList when updateHanbaiten succeeds', async () => {
    const { wrapper, router } = await renderView({ hanbaitenId: 1 });
    const pushSpy = vi.spyOn(router, 'push');

    (wrapper.vm as any).formState.hanbaiten_name = '変更後販売店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('HanbaitenList');
  });

  it('should NOT call updateHanbaiten (skip) when nothing changed in edit mode', async () => {
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const { updateHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(updateHanbaiten).mockClear();
    const infoSpy = vi.spyOn(message, 'info');
    infoSpy.mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateHanbaiten).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('変更がありません。');
  });

  it('should NOT call createHanbaiten when submit is fired in edit mode', async () => {
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createHanbaiten).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 9. 前の画面に戻る (機能定義 4.x)
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — back navigation (機能定義 4.x)', () => {
  it('should navigate to HanbaitenList when 前の画面に戻る is clicked', async () => {
    // 機能定義 4.1 — 販売店明細検索画面へ遷移.
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
    await backBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('HanbaitenList');
  });

  it('should NOT call createHanbaiten when 前の画面に戻る is clicked', async () => {
    const { wrapper } = await renderView();
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    await backBtn!.trigger('click');
    await flushPromises();

    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should NOT call updateHanbaiten when 前の画面に戻る is clicked in edit mode', async () => {
    const { wrapper } = await renderView({ hanbaitenId: 1 });
    const { updateHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(updateHanbaiten).mockClear();

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    await backBtn!.trigger('click');
    await flushPromises();

    expect(updateHanbaiten).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 10. m_code 連動 — itaku_kubun / yokin_shubetsu options render
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — m_code dropdown options', () => {
  it('should render the ITAKU_KUBUN option labels (振込 / 日農委託 / その他) when codes store is seeded', async () => {
    const { wrapper } = await renderView();
    // The form is mounted with the m_code seed from buildCodesSeed().
    // Option labels appear in the rendered DOM either as <option>
    // children of a <select> or as radio labels — assert the strings
    // are reachable from wrapper.html().
    const html = wrapper.html();
    expect(html).toContain('振込');
    expect(html).toContain('日農委託');
    expect(html).toContain('その他');
  });

  it('should render the YOKIN_SHUBETSU option labels (普通 / 当座) when codes store is seeded', async () => {
    const { wrapper } = await renderView();
    const html = wrapper.html();
    expect(html).toContain('普通');
    expect(html).toContain('当座');
  });

  it('should render the TESURYO_KUBUN option labels (JA / 販売店) when codes store is seeded', async () => {
    const { wrapper } = await renderView();
    const html = wrapper.html();
    expect(html).toContain('JA');
    // 販売店 also appears in screen title / breadcrumb chunks rendered
    // by the view itself, but its presence here mainly proves the
    // TESURYO_KUBUN option label rendered.
    expect(html).toContain('販売店');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 11. 都道府県 dropdown (COMMON-001) renders options
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — 都道府県 dropdown (COMMON-001)', () => {
  it('should render the 東京都 option label when getTodofukenList resolves', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.html()).toContain('東京都');
  });

  it('should call getTodofukenList exactly once when mounted in edit mode', async () => {
    await renderView({ hanbaitenId: 1 });
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    expect(getTodofukenList).toHaveBeenCalledTimes(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// [staff-ja-id] NICHINO_STAFF 代行入力 create-form path
// ───────────────────────────────────────────────────────────────────────
describe('HanbaitenFormView — NICHINO_STAFF 代行入力 path', () => {
  const staffUser = () =>
    buildAuthUser({
      role_code: 'NICHINO_STAFF',
      role_id: 2,
      ja_id: null,
      permissions: ['hanbaiten.daiko_input'],
    });

  it('should render the JA picker form-item for staff', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    expect(
      wrapper.find('[data-test="hanbaiten-staff-ja-form-item"]').exists(),
    ).toBe(true);
  });

  it('should NOT render the JA picker for JA-scoped roles', async () => {
    const { wrapper } = await renderView();
    expect(
      wrapper.find('[data-test="hanbaiten-staff-ja-form-item"]').exists(),
    ).toBe(false);
  });

  it('should prefill formState.ja_id from router history state on create-mode mount', async () => {
    // NICHINO_STAFF reaches create from the search screen, which forwards
    // the picked JA via router history state (globalThis.history.state.jaId)
    // — the form pre-selects it. No ?ja_id in the URL.
    const { wrapper } = await renderView({
      user: staffUser(),
      jaState: 42,
    });
    const vm = wrapper.vm as unknown as { formState: { ja_id: number | null } };
    expect(vm.formState.ja_id).toBe(42);
  });

  it('should flag ja_id REQUIRED when staff submits create without picking a JA', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    const vm = wrapper.vm as unknown as {
      formState: Record<string, unknown>;
      fieldErrors: Record<string, string>;
    };
    await fillForm(vm, {
      hanbaiten_code: 'H777',
      hanbaiten_name: '販売店A',
      itaku_kubun: 2,
    });
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();
    expect(vm.fieldErrors.ja_id).toBe('必須項目です。');
    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    expect(createHanbaiten).not.toHaveBeenCalled();
  });

  it('should include ja_id in the POST body when NICHINO_STAFF submits create with JA picked', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    // Staff picks a JA in the form's dropdown (no ?ja_id prefill anymore).
    wrapper.findComponent({ name: 'BaseJaDropdown' }).vm.$emit('update:value', 42);
    await flushPromises();
    const vm = wrapper.vm as unknown as { formState: Record<string, unknown> };
    await fillForm(vm, {
      hanbaiten_code: 'H777',
      hanbaiten_name: '販売店A',
      itaku_kubun: 2,
    });
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    expect(createHanbaiten).toHaveBeenCalled();
    const callBody = vi.mocked(createHanbaiten).mock.calls[0]?.[0] as
      | unknown as Record<string, unknown> | undefined;
    expect(callBody?.ja_id).toBe(42);
  });

  it('should NOT include ja_id in the POST body for JA-scoped roles (BE binds session.ja_id)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as unknown as { formState: Record<string, unknown> };
    await fillForm(vm, {
      hanbaiten_code: 'H777',
      hanbaiten_name: '販売店A',
      itaku_kubun: 2,
    });
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    const { createHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    expect(createHanbaiten).toHaveBeenCalled();
    const callBody = vi.mocked(createHanbaiten).mock.calls[0]?.[0] as
      | unknown as Record<string, unknown> | undefined;
    expect('ja_id' in (callBody ?? {})).toBe(false);
  });

  it('should disable the BaseJaDropdown in edit mode (FK immutable)', async () => {
    const { wrapper } = await renderView({
      user: staffUser(),
      hanbaitenId: 1,
    });
    const dropdown = wrapper.findComponent({ name: 'BaseJaDropdown' });
    expect(dropdown.exists()).toBe(true);
    expect(dropdown.props('disabled')).toBe(true);
  });

  it('should disable BaseTankaDropdown for staff in create mode when no JA picked', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    const tanka = wrapper.findComponent({ name: 'BaseTankaDropdown' });
    expect(tanka.exists()).toBe(true);
    expect(tanka.props('disabled')).toBe(true);
  });

  it('should enable BaseTankaDropdown for staff once a JA is picked', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    wrapper.findComponent({ name: 'BaseJaDropdown' }).vm.$emit('update:value', 42);
    await flushPromises();
    const tanka = wrapper.findComponent({ name: 'BaseTankaDropdown' });
    expect(tanka.exists()).toBe(true);
    expect(tanka.props('disabled')).toBe(false);
    // jaId prop forwards the picked tenant so option fetches scope correctly.
    expect(tanka.props('jaId')).toBe(42);
  });

  it('should keep BaseTankaDropdown enabled for staff in edit mode (JA immutable)', async () => {
    const { wrapper } = await renderView({
      user: staffUser(),
      hanbaitenId: 1,
    });
    const tanka = wrapper.findComponent({ name: 'BaseTankaDropdown' });
    expect(tanka.exists()).toBe(true);
    expect(tanka.props('disabled')).toBe(false);
  });

  it('should reset haitatsuryo_tanka_id when staff swaps JA (cascade)', async () => {
    const { wrapper } = await renderView({ user: staffUser() });
    wrapper.findComponent({ name: 'BaseJaDropdown' }).vm.$emit('update:value', 42);
    await flushPromises();
    const vm = wrapper.vm as unknown as {
      formState: { ja_id: number | null; haitatsuryo_tanka_id: number | null };
    };
    // Pretend staff picked a tanka under JA=42.
    vm.formState.haitatsuryo_tanka_id = 99;
    await flushPromises();

    // Switch JA via BaseJaDropdown → cascade watch must blank the tanka.
    const dropdown = wrapper.findComponent({ name: 'BaseJaDropdown' });
    dropdown.vm.$emit('update:value', 7);
    await flushPromises();

    expect(vm.formState.ja_id).toBe(7);
    expect(vm.formState.haitatsuryo_tanka_id).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Route reuse — edit → create must reset the form (reported bug)
// ═══════════════════════════════════════════════════════════════════════
describe('HanbaitenFormView — route reuse (edit → create reset)', () => {
  it('should reset the form to blank when navigating from edit to create', async () => {
    // Bug: vue-router REUSES this component between HanbaitenEdit and
    // HanbaitenCreate, so onMounted does not re-run — the create form
    // kept showing the edit record's data. watch(hanbaitenId) →
    // applyRouteMode() must reset it.
    const { wrapper, router } = await renderView({ hanbaitenId: 5 });
    const vm = wrapper.vm as any;
    await flushPromises();

    // Edit mode hydrated the form from buildHanbaitenDetail().
    expect(vm.formState.hanbaiten_name).toBe('販売店A');
    expect(vm.formState.hanbaiten_code).toBe('H001');

    // Jump to create via the SAME component instance (router reuses it).
    await router.push({ name: 'HanbaitenCreate' });
    await flushPromises();

    // Form must be blank — no leakage of the edit record's data.
    expect(vm.formState.hanbaiten_name).toBe('');
    expect(vm.formState.hanbaiten_code).toBe('');
    expect(vm.formState.ja_id).toBeNull();
  });

  it('should reload the new record when navigating between two edit ids', async () => {
    const { router } = await renderView({ hanbaitenId: 5 });
    const { getHanbaiten } = await import('@/api/hanbaiten/hanbaiten');
    await flushPromises();
    expect(getHanbaiten).toHaveBeenLastCalledWith(5);

    await router.push({ name: 'HanbaitenEdit', params: { id: '8' } });
    await flushPromises();

    // The id-change must trigger a fresh load for the new record.
    expect(getHanbaiten).toHaveBeenLastCalledWith(8);
  });
});

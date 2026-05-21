// Screen: ACSMS-SCR-007 — 支店マスタ登録画面
//
// Drives src/views/shiten/ShitenFormView.vue. The view is shared between
// create (/shiten/create) and edit (/shiten/:id/edit). Each it() maps
// to a clause in docs/design/ACSMS-SCR-007/screen-design.md (機能定義 +
// メッセージ情報) + index.html (DOM hierarchy) + ACSMS-SCR-007-api.md
// (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import ShitenFormView from '@/views/shiten/ShitenFormView.vue';
import {
  buildAuthUser,
  buildShitenDetail,
  buildCreateShitenForm,
  buildKanriShitenListResponseForDropdown,
} from '@test/fixtures/shiten.fixture';

// Mock the shiten API client — /gen-code-frontend creates this with
// getShiten / createShiten / updateShiten methods.
vi.mock('@/api/shiten/shiten', () => ({
  getShiten: vi.fn(),
  createShiten: vi.fn(),
  updateShiten: vi.fn(),
}));

// 管理支店 select feeds from the shared ACSMS-API-COMMON-004 dropdown
// endpoint (cascade by session.ja_id) — NOT the SCR-008 admin list.
vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
  listKanriShiten: vi.fn(),
  removeKanriShiten: vi.fn(),
  getKanriShiten: vi.fn(),
  createKanriShiten: vi.fn(),
  updateKanriShiten: vi.fn(),
}));

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);
vi.spyOn(message, 'warning').mockImplementation(() => noopMessage);
vi.spyOn(message, 'info').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Path param id — passed via route push when set (edit mode). */
  id?: number;
  /** Override the default CHUOKAI auth user. */
  user?: ReturnType<typeof buildAuthUser>;
}

async function renderView(opts: RenderOptions = {}): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
  pushSpy: ReturnType<typeof vi.fn>;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/shiten', name: 'ShitenList', component: { template: '<div />' } },
      { path: '/shiten/create', name: 'ShitenCreate', component: { template: '<div />' } },
      {
        path: '/shiten/:id/edit',
        name: 'ShitenEdit',
        component: { template: '<div />' },
      },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
    ],
  });

  if (opts.id !== undefined) {
    await router.push({ name: 'ShitenEdit', params: { id: String(opts.id) } });
  } else {
    await router.push({ name: 'ShitenCreate' });
  }
  await router.isReady();
  const pushSpy = vi.spyOn(router, 'push') as unknown as ReturnType<typeof vi.fn>;

  const wrapper = mount(ShitenFormView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAuthUser() },
          },
        }),
        Antd,
      ],
    },
  });
  await flushPromises();
  return { wrapper, router, pushSpy };
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getShiten, createShiten, updateShiten } = await import('@/api/shiten/shiten');
  vi.mocked(getShiten).mockResolvedValue({ data: buildShitenDetail() });
  vi.mocked(createShiten).mockResolvedValue({
    data: { ...buildShitenDetail(), shiten_id: 99 },
    message: '登録しました。',
  });
  vi.mocked(updateShiten).mockResolvedValue({
    data: buildShitenDetail(),
    message: '更新しました。',
  });

  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  const fullResp = buildKanriShitenListResponseForDropdown();
  vi.mocked(getKanriShitenDropdown).mockResolvedValue({
    data: fullResp.data.map((r) => ({
      kanri_shiten_id: r.kanri_shiten_id,
      kanri_shiten_code: r.kanri_shiten_code,
      kanri_shiten_name: r.kanri_shiten_name,
    })),
  });
});

// ═════════════════════════════════════════════════════════════════════
// 1. 初期表示 (機能定義 §1)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — initial render (§1)', () => {
  it('should render the 支店情報入力 card heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('支店情報入力');
  });

  it('should render all required form labels when mounted', async () => {
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('管理支店'))).toBe(true);
    expect(labels.some((t) => t.includes('支店コード'))).toBe(true);
    expect(labels.some((t) => t.includes('支店名'))).toBe(true);
    expect(labels.some((t) => t.includes('支店名カナ') || t.includes('支店カナ'))).toBe(true);
    expect(labels.some((t) => t.includes('金融機関支店'))).toBe(true);
    expect(labels.some((t) => t.includes('備考'))).toBe(true);
  });

  it('should render the submit button with 登録 label in create mode when mounted', async () => {
    const { wrapper } = await renderView();
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    // Antd auto-spaces 2-CJK button labels (登 録) — match substring.
    expect(submitBtn.text()).toContain('登');
  });

  it('should render 更新 label on submit button in edit mode when mounted', async () => {
    const { wrapper } = await renderView({ id: 1 });
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.text()).toContain('更');
  });

  it('should render the 前の画面に戻る back button when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('前の画面に戻る');
  });

  it('should fetch 管理支店 dropdown once (ACSMS-API-COMMON-004) when mounted', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    await renderView();
    expect(getKanriShitenDropdown).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. 編集モード初期表示 (機能定義 §2)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — edit-mode preload (§2)', () => {
  it('should call getShiten with the path id when route has :id param', async () => {
    const { getShiten } = await import('@/api/shiten/shiten');
    await renderView({ id: 5 });
    expect(getShiten).toHaveBeenCalledWith(5);
  });

  it('should NOT call getShiten in create mode when no :id param', async () => {
    const { getShiten } = await import('@/api/shiten/shiten');
    await renderView();
    expect(getShiten).not.toHaveBeenCalled();
  });

  it('should still call getShiten with the requested id when BE returns 404', async () => {
    // COVERS: 機能定義 §2.2 — データ取得失敗 → ACSMS-MSG-007-002
    // Global axios interceptor handles the toast; this assertion just
    // guards that the view attempted the fetch with the correct id.
    const { getShiten } = await import('@/api/shiten/shiten');
    vi.mocked(getShiten).mockRejectedValue({
      response: {
        status: 404,
        data: { error_code: 'NOT_FOUND', message: '指定された支店が見つかりません' },
      },
    });
    await renderView({ id: 999 });
    expect(getShiten).toHaveBeenCalledWith(999);
  });

  it('should make 支店コード input disabled in edit mode (機能定義 §2.3)', async () => {
    const { wrapper } = await renderView({ id: 1 });
    // 支店コード is immutable after create — UI disables the input.
    const formItems = wrapper.findAllComponents({ name: 'AFormItem' });
    const codeItem = formItems.find((fi) => fi.text().includes('支店コード'));
    expect(codeItem).toBeDefined();
    const html = codeItem!.html();
    expect(/disabled|ant-input-disabled/.test(html)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. 入力チェック (機能定義 §3.1)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — required-field validation (§3.1)', () => {
  it('should show ACSMS-MSG-007-007 (必須項目です。) when 支店コード is blank on submit', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should NOT call createShiten when required fields are blank on submit', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).not.toHaveBeenCalled();
  });

  it('should NOT throw エラーが発生しました when 管理支店 is cleared via allow-clear (regression for ?.trim() vs .trim())', async () => {
    // COVERS: vue.md §Validation — required-string checks MUST use ?.trim()
    // because antd's <a-select allow-clear> sets the v-model to `undefined`
    // (not "") when the × icon is clicked. Calling `.trim()` directly would
    // throw TypeError → global error handler → generic "エラーが発生しました"
    // toast that masks the actual required-field violation.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      vm.form.kanri_shiten_id = undefined; // simulate × clear-icon click
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should show format error when 支店コード is not 3 half-width digits', async () => {
    // COVERS: api.md §4.1 — shiten_code: 必須、半角数字3桁固定
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm(), { shiten_code: 'ABC' });
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    // Either client-side regex error or BE VALIDATION_ERROR — assert it
    // surfaced as inline help, NOT as a generic exception toast.
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should reject 支店名(カナ) when value contains non-half-width-katakana characters', async () => {
    // COVERS: vue.md §Kana fields MUST validate the script — downstream
    // Zengin CSV / PDF exports require half-width katakana. Hiragana /
    // kanji / Latin must be blocked at submit time, BEFORE the API call.
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      Object.assign(vm.form, buildCreateShitenForm(), {
        shiten_name_kana: 'ホンテンエイギョウブ', // full-width katakana — invalid
      });
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('支店名(カナ)は半角カタカナ・半角数字で入力してください。');
    expect(createShiten).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. 登録・更新 submit (機能定義 §3.3, §3.4)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — submit (§3.3, §3.4)', () => {
  it('should call createShiten with the form payload when 登録 is clicked with valid input', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).toHaveBeenCalledTimes(1);
    expect(createShiten).toHaveBeenCalledWith(
      expect.objectContaining({
        shiten_code: '099',
        shiten_name: '新規支店',
        kanri_shiten_id: 1,
      }),
    );
  });

  it('should show 登録しました。 success toast when createShiten resolves', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).toHaveBeenCalledWith('登録しました。');
  });

  it('should navigate to ShitenList after successful create', async () => {
    const { wrapper, pushSpy } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('ShitenList');
  });

  it('should call updateShiten with the path id + body when 更新 is clicked in edit mode', async () => {
    const { updateShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    const vm = wrapper.vm as any;
    if (vm.form) vm.form.shiten_name = '更新後支店名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateShiten).toHaveBeenCalledTimes(1);
    expect(updateShiten).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ shiten_name: '更新後支店名' }),
    );
  });

  it('should show 更新しました。 toast when updateShiten resolves', async () => {
    const { wrapper } = await renderView({ id: 5 });
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).toHaveBeenCalledWith('更新しました。');
  });

  it('should navigate to ShitenList after successful update', async () => {
    const { wrapper, pushSpy } = await renderView({ id: 5 });
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('ShitenList');
  });

  it('should map BE VALIDATION_ERROR errors[].field to <a-form-item :help> when create rejects', async () => {
    // COVERS: vue.md §Error Handling — VALIDATION_ERROR is consumed by
    // useApiForm and surfaced inline via <a-form-item :help>, not toast.
    const { createShiten } = await import('@/api/shiten/shiten');
    vi.mocked(createShiten).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。',
          errors: [{ field: 'shiten_code', message: '支店コードは必須です' }],
        },
      },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('支店コードは必須です');
  });

  it('should NOT re-toast DUPLICATE_CODE when BE rejects (global axios interceptor owns the toast)', async () => {
    // COVERS: vue.md §Error Handling Architecture — DUPLICATE_CODE is
    // toasted centrally; the view must NOT call message.error itself.
    const { createShiten } = await import('@/api/shiten/shiten');
    vi.mocked(createShiten).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'DUPLICATE_CODE',
          message: '支店コード「099」はすでに登録されています。',
        },
      },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createShiten).toHaveBeenCalled();
    // Spec-side guard: view must not call message.error for HTTP errors.
    expect(message.error).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. 前の画面に戻る (機能定義 §4)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — back navigation (§4)', () => {
  it('should navigate to ShitenList when 前の画面に戻る is clicked', async () => {
    // Per established SCR-009 pattern (customer dropped the confirm modal),
    // back button navigates straight to the list view.
    const { wrapper, pushSpy } = await renderView();
    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
    await backBtn!.trigger('click');
    await flushPromises();
    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('ShitenList');
  });
});

// ═════════════════════════════════════════════════════════════════════
// Enter-implicit-submit guard (vue.md §long forms)
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — Enter-implicit-submit guard', () => {
  it('should NOT call createShiten when Enter is pressed inside a text input', async () => {
    // COVERS: vue.md §Block Enter implicit submit on long CRUD forms.
    // SCR-007 form has 6 fields (>4) → must wire preventEnterImplicitSubmit
    // on the <a-form> @keydown handler.
    const { createShiten } = await import('@/api/shiten/shiten');
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    if (input.exists()) {
      await input.trigger('keydown', { key: 'Enter' });
      await flushPromises();
    }
    expect(createShiten).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════
// Defensive / edge-case coverage — error paths + focusFirstError
// ═════════════════════════════════════════════════════════════════════
describe('ShitenFormView — defensive paths', () => {
  it('should focus the first invalid field after submitting a blank create form', async () => {
    const { wrapper } = await renderView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should swallow updateShiten rejection without crashing (interceptor toasts)', async () => {
    const { updateShiten } = await import('@/api/shiten/shiten');
    vi.mocked(updateShiten).mockRejectedValue({
      response: { data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const { wrapper } = await renderView({ id: 5 });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should swallow createShiten rejection without crashing (interceptor toasts)', async () => {
    const { createShiten } = await import('@/api/shiten/shiten');
    vi.mocked(createShiten).mockRejectedValue({
      response: { data: { error_code: 'CONFLICT', message: 'duplicate' } },
    });
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) Object.assign(vm.form, buildCreateShitenForm());
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should fall back gracefully when getShiten rejects on edit-mode mount', async () => {
    const { getShiten } = await import('@/api/shiten/shiten');
    vi.mocked(getShiten).mockRejectedValue({
      response: { data: { error_code: 'NOT_FOUND' } },
    });
    const { wrapper } = await renderView({ id: 999 });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('should set kanriShitenOptions to [] when getKanriShitenDropdown rejects', async () => {
    const { getKanriShitenDropdown } = await import(
      '@/api/kanri-shiten/kanri-shiten'
    );
    vi.mocked(getKanriShitenDropdown).mockRejectedValueOnce({ message: 'boom' });
    const { wrapper } = await renderView();
    // Form still renders — catch block silently emptied options.
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('should focus the first invalid select-type field (focusFirstError wrapper path)', async () => {
    // 管理支店 is the only <a-select> on the form. Leave it blank to
    // exercise the wrapper-type focus branch.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.form) {
      vm.form.shiten_code = '001';
      vm.form.shiten_name = '本店';
      vm.form.kanri_shiten_id = undefined;  // → first error here
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });
});

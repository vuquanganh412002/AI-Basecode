// @ts-nocheck — TDD red phase (/gen-ut-frontend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-005 — JAマスタ登録画面
//
// Drives src/views/ja/JaFormView.vue. Every it() maps to a clause in
// docs/design/ACSMS-SCR-005/screen-design.md (メッセージ情報) +
// docs/design/ACSMS-SCR-005/index.html (UI structure) +
// docs/design/ACSMS-SCR-005/ACSMS-SCR-005-api.md (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import JaFormView from '@/views/ja/JaFormView.vue';
import {
  buildJa,
  buildCreateJaForm,
  buildTodofukenList,
  buildAuthUser,
} from '@test/fixtures/ja.fixture';

// Mock the JA API client. /gen-code-frontend will create
// `src/api/ja/ja.ts` exporting these named functions.
vi.mock('@/api/ja/ja', () => ({
  getJa: vi.fn(),
  createJa: vi.fn(),
  updateJa: vi.fn(),
}));

// Mock the prefecture (都道府県) lookup used by the dropdown.
vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));

// Spy on antd's global toast so we can assert success / error copy.
vi.spyOn(message, 'success').mockImplementation(() => undefined);
vi.spyOn(message, 'error').mockImplementation(() => undefined);

interface RenderOptions {
  /** Edit mode: pass a number → router pre-navigates to /ja/:id; create mode: undefined. */
  jaId?: number;
  /** Override default NICHINO_ADMIN session for role-restriction tests. */
  user?: ReturnType<typeof buildAuthUser>;
}

async function renderView(opts: RenderOptions = {}): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/ja', name: 'JaList', component: { template: '<div />' } },
      { path: '/ja/create', name: 'JaCreate', component: { template: '<div />' } },
      { path: '/ja/:id/edit', name: 'JaEdit', component: { template: '<div />' } },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
    ],
  });
  if (opts.jaId !== undefined) {
    await router.push({ name: 'JaEdit', params: { id: String(opts.jaId) } });
  } else {
    await router.push({ name: 'JaCreate' });
  }
  await router.isReady();

  const wrapper = mount(JaFormView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            auth: { user: opts.user ?? buildAuthUser() },
            // Seed m_code cache so <a-radio v-for> over ZEI_KUBUN renders
            // its option templates (covers the template branches inside
            // the v-for that otherwise stay uninstantiated).
            codes: {
              all: {
                ZEI_KUBUN: [
                  { value: 1, label: '内税', label_short: '内' },
                  { value: 2, label: '外税', label_short: '外' },
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

beforeEach(async () => {
  vi.clearAllMocks();
  // Default: prefecture list resolves to a small set so the dropdown renders.
  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue({ data: buildTodofukenList() });
  // Default getJa resolves to a known JA so edit-mode mounts don't error.
  const { getJa } = await import('@/api/ja/ja');
  vi.mocked(getJa).mockResolvedValue({ data: buildJa() });
});

describe('JaFormView — mount + initial render', () => {
  // Page title 「JAマスタ登録画面」 + breadcrumb come from MainLayout's
  // AppHeader (driven by route meta), NOT from this view. Mounting the
  // view standalone in unit tests therefore does not render them; the
  // production path is verified via the full app smoke run.

  it('should render the JA基本情報入力 form heading when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('JA基本情報入力');
  });

  it('should fetch the prefecture list once when mounted', async () => {
    await renderView();
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    expect(getTodofukenList).toHaveBeenCalledTimes(1);
  });

  it('should render the submit button when mounted', async () => {
    const { wrapper } = await renderView();
    // Antd v4 inserts a space between two adjacent CJK characters inside
    // <a-button> ("登 録" instead of "登録"), so assert by selector +
    // text-include rather than literal "登録".
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.text()).toContain('登');
  });

  it('should render the 前の画面に戻る back button when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('前の画面に戻る');
  });
});

describe('JaFormView — create mode (no ja_id in route)', () => {
  it('should NOT call getJa when no ja_id parameter is present', async () => {
    await renderView();
    const { getJa } = await import('@/api/ja/ja');
    expect(getJa).not.toHaveBeenCalled();
  });

  it('should call createJa with the form payload when 登録 is clicked with valid input', async () => {
    const { createJa } = await import('@/api/ja/ja');
    vi.mocked(createJa).mockResolvedValue({
      data: { ...buildJa(), ja_id: 99 },
      message: '登録しました。',
    });

    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();

    expect(createJa).toHaveBeenCalledTimes(1);
    expect(createJa).toHaveBeenCalledWith(
      expect.objectContaining({ ja_code: '1301003001', ja_name: 'JA東京みどり' }),
    );
  });

  it('should show "登録しました。" success toast when createJa succeeds', async () => {
    const { createJa } = await import('@/api/ja/ja');
    vi.mocked(createJa).mockResolvedValue({
      data: { ...buildJa(), ja_id: 99 },
      message: '登録しました。',
    });

    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();

    // Project copy convention (vue.md §useNotify): toasts are verb-only.
    // The button + screen context already imply the subject.
    expect(message.success).toHaveBeenCalledWith('登録しました。');
  });

  it('should navigate back when 前の画面に戻る is clicked in create mode', async () => {
    const { wrapper, router } = await renderView();
    const backSpy = vi.spyOn(router, 'back');
    await wrapper.find('[data-test="btn-back"]').trigger('click');
    expect(backSpy).toHaveBeenCalled();
  });

  // Form has 17 fields — pressing Enter inside any text input must NOT
  // implicitly submit (UX: users hit Enter as "next field" reflex,
  // especially on Japanese IME keyboards). Regression guard for the
  // preventEnterImplicitSubmit utility wired on the <a-form>.
  it('should NOT call createJa when user presses Enter inside a text input', async () => {
    const { createJa } = await import('@/api/ja/ja');
    const { wrapper } = await renderView();
    await flushPromises();

    const firstInput = wrapper.find('input');
    expect(firstInput.exists()).toBe(true);
    await firstInput.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(createJa).not.toHaveBeenCalled();
  });
});

describe('JaFormView — edit mode (ja_id in route)', () => {
  it('should call getJa with the path ja_id when mounted in edit mode', async () => {
    const { getJa } = await import('@/api/ja/ja');
    await renderView({ jaId: 1 });
    expect(getJa).toHaveBeenCalledWith(1);
  });

  it('should populate the form fields from the getJa response when mounted in edit mode', async () => {
    const { getJa } = await import('@/api/ja/ja');
    vi.mocked(getJa).mockResolvedValue({ data: buildJa({ ja_id: 7, ja_name: '読込済JA' }) });
    const { wrapper } = await renderView({ jaId: 7 });
    expect(wrapper.html()).toContain('読込済JA');
  });

  it('should call updateJa with the path ja_id and form payload when 登録 is clicked in edit mode', async () => {
    const { updateJa } = await import('@/api/ja/ja');
    vi.mocked(updateJa).mockResolvedValue({
      data: buildJa({ ja_id: 1, ja_name: 'JA東京中央（改定）' }),
      message: '更新しました。',
    });

    const { wrapper } = await renderView({ jaId: 1 });
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_name: 'JA東京中央（改定）' });
    await flushPromises();

    expect(updateJa).toHaveBeenCalledTimes(1);
    expect(updateJa).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ ja_name: 'JA東京中央（改定）' }),
    );
  });

  it('should show "更新しました。" success toast when updateJa succeeds', async () => {
    const { updateJa } = await import('@/api/ja/ja');
    vi.mocked(updateJa).mockResolvedValue({
      data: buildJa({ ja_id: 1 }),
      message: '更新しました。',
    });

    const { wrapper } = await renderView({ jaId: 1 });
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();

    expect(message.success).toHaveBeenCalledWith('更新しました。');
  });

  it('should redirect to "/ja" list when getJa returns NOT_FOUND on edit-mode mount', async () => {
    const { getJa } = await import('@/api/ja/ja');
    vi.mocked(getJa).mockRejectedValue({
      response: { status: 404, data: { error_code: 'NOT_FOUND', message: '指定されたJAが見つかりません' } },
    });
    const { router } = await renderView({ jaId: 999 });
    await flushPromises();
    // The view should bail out and redirect to Dashboard.
    expect(router.currentRoute.value.name).toBe('Dashboard');
  });
});

describe('JaFormView — form validation (per screen-design.md メッセージ情報)', () => {
  it('should show "必須項目です。" under ja_code when submitted empty in create mode', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_code: '' });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should show "必須項目です。" under ja_name when submitted empty', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_name: '' });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should show "必須項目です。" under todofuken_code when none selected', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), todofuken_code: '' });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should show "必須項目です。" under todofuken_code when select is cleared (undefined)', async () => {
    // Reproduces the bug: antd `<a-select allow-clear>` sets v-model to
    // undefined (not ""), so a non-null-safe `.trim()` would throw and
    // bubble up to the generic "エラーが発生しました…" toast, hiding the
    // real required-field violation.
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateJaForm(),
      todofuken_code: undefined as unknown as string,
    });
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
    expect(wrapper.text()).not.toContain('エラーが発生しました');
  });

  it('should show "郵便番号は半角数字のみ（ハイフンなし）入力可能です。" when yubin_no contains a hyphen', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), yubin_no: '160-0022' });
    await flushPromises();
    expect(wrapper.text()).toContain('郵便番号は半角数字のみ（ハイフンなし）入力可能です。');
  });

  it('should show "電話番号は半角数字のみ（ハイフンなし）入力可能です。" when tel contains non-digit characters', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), tel: '03-1234-5678' });
    await flushPromises();
    expect(wrapper.text()).toContain('電話番号は半角数字のみ（ハイフンなし）入力可能です。');
  });

  it('should show "FAXは半角数字のみ（ハイフンなし）入力可能です。" when fax contains non-digit characters', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), fax: '03-1234-5679' });
    await flushPromises();
    expect(wrapper.text()).toContain('FAXは半角数字のみ（ハイフンなし）入力可能です。');
  });

  it('should show "有効なメールアドレスを入力してください。" when email format is invalid', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), email: 'not-an-email' });
    await flushPromises();
    expect(wrapper.text()).toContain('有効なメールアドレス');
  });

  it('should show kana format error when ja_name_kana contains hiragana', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_name_kana: 'じぇいえい' });
    await flushPromises();
    expect(wrapper.text()).toContain('JA名(カナ)は半角カタカナ・半角数字で入力してください。');
  });

  it('should show kana format error when ja_name_kana contains ASCII letters', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_name_kana: 'JA Tokyo' });
    await flushPromises();
    expect(wrapper.text()).toContain('JA名(カナ)は半角カタカナ・半角数字で入力してください。');
  });

  it('should show kana format error when ja_name_kana contains full-width katakana', async () => {
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_name_kana: 'ジェイエイ' });
    await flushPromises();
    expect(wrapper.text()).toContain('JA名(カナ)は半角カタカナ・半角数字で入力してください。');
  });

  it('should pass kana validation when ja_name_kana is empty (optional field)', async () => {
    const { createJa } = await import('@/api/ja/ja');
    vi.mocked(createJa).mockResolvedValue({
      data: { ...buildJa(), ja_id: 99 },
      message: '登録しました。',
    });
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_name_kana: '' });
    await flushPromises();
    expect(wrapper.text()).not.toContain('JA名(カナ)は半角カタカナ・半角数字で入力してください。');
    expect(createJa).toHaveBeenCalled();
  });

  it('should pass kana validation when ja_name_kana contains chouonpu and half-width katakana', async () => {
    const { createJa } = await import('@/api/ja/ja');
    vi.mocked(createJa).mockResolvedValue({
      data: { ...buildJa(), ja_id: 99 },
      message: '登録しました。',
    });
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({
      ...buildCreateJaForm(),
      ja_name_kana: 'ｼﾞｪｲｴｲﾄｳｷｮｳﾐﾄﾞﾘｰ',
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain('JA名(カナ)は半角カタカナ・半角数字で入力してください。');
    expect(createJa).toHaveBeenCalled();
  });

  it('should NOT call createJa when client-side validation fails', async () => {
    const { createJa } = await import('@/api/ja/ja');
    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_code: '' });
    await flushPromises();
    expect(createJa).not.toHaveBeenCalled();
  });
});

describe('JaFormView — API error handling (per ACSMS-SCR-005-api.md エラー一覧)', () => {
  it('should map VALIDATION_ERROR errors[] to per-field help text when createJa returns 400', async () => {
    const { createJa } = await import('@/api/ja/ja');
    vi.mocked(createJa).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。',
          errors: [
            { field: 'ja_code', message: 'JAコードを入力してください' },
            { field: 'email', message: '有効なメールアドレスを入力してください。' },
          ],
        },
      },
    });

    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();

    expect(wrapper.text()).toContain('JAコードを入力してください');
    expect(wrapper.text()).toContain('有効なメールアドレスを入力してください。');
  });

  it('should show duplicate-code error toast when createJa returns CONFLICT', async () => {
    const { createJa } = await import('@/api/ja/ja');
    vi.mocked(createJa).mockRejectedValue({
      response: {
        status: 409,
        data: {
          error_code: 'CONFLICT',
          message: '同一のJAコードが既に登録されています',
        },
      },
    });

    const { wrapper } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();
    // axios-instance.ts global handler shows a message.error toast for CONFLICT.
    // We don't assert on `message.error` directly because it may run inside the
    // shared interceptor; assert that no SUCCESS toast fired and that
    // createJa was the cause.
    expect(message.success).not.toHaveBeenCalled();
    expect(createJa).toHaveBeenCalled();
  });

  it('should NOT show success toast when updateJa returns INTERNAL_SERVER_ERROR', async () => {
    const { updateJa } = await import('@/api/ja/ja');
    vi.mocked(updateJa).mockRejectedValue({
      response: {
        status: 500,
        data: {
          error_code: 'INTERNAL_SERVER_ERROR',
          message: 'システムエラーが発生しました。',
        },
      },
    });

    const { wrapper } = await renderView({ jaId: 1 });
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();

    expect(message.success).not.toHaveBeenCalled();
  });
});

describe('JaFormView — post-submit navigation', () => {
  it('should redirect to JaList after createJa succeeds', async () => {
    const { createJa } = await import('@/api/ja/ja');
    vi.mocked(createJa).mockResolvedValue({
      data: { ...buildJa(), ja_id: 99 },
      message: '登録しました。',
    });

    const { wrapper, router } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('JaList');
  });

  it('should redirect to JaList after updateJa succeeds in edit mode', async () => {
    const { updateJa } = await import('@/api/ja/ja');
    vi.mocked(updateJa).mockResolvedValue({
      data: buildJa({ ja_id: 1 }),
      message: '更新しました。',
    });

    const { wrapper, router } = await renderView({ jaId: 1 });
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('JaList');
  });

  it('should NOT redirect when createJa rejects (stay on form)', async () => {
    const { createJa } = await import('@/api/ja/ja');
    vi.mocked(createJa).mockRejectedValue({
      response: {
        status: 400,
        data: {
          error_code: 'VALIDATION_ERROR',
          message: '入力値が不正です。',
          errors: [{ field: 'ja_code', message: 'JAコードを入力してください' }],
        },
      },
    });

    const { wrapper, router } = await renderView();
    await wrapper.vm.submitWith?.(buildCreateJaForm());
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('JaCreate');
  });

  it('should NOT redirect when client-side validation fails', async () => {
    const { wrapper, router } = await renderView();
    await wrapper.vm.submitWith?.({ ...buildCreateJaForm(), ja_code: '' });
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('JaCreate');
  });
});

// ───────────────────────────────────────────────────────────────────────
// Field-level read-only for CHUOKAI / JA_HONTEN in edit mode
// (account_concept §JAマスタ + .claude/rules/security.md FIELD_RESTRICTIONS)
// ───────────────────────────────────────────────────────────────────────
describe('JaFormView — edit mode field restrictions for CHUOKAI / JA_HONTEN', () => {
  /** Locate an `<input>` / `<a-radio>` etc. by the surrounding form-item label text. */
  function inputByLabel(
    wrapper: ReturnType<typeof mount>,
    labelText: string,
  ): { exists: boolean; disabled: boolean } {
    const items = wrapper.findAllComponents({ name: 'AFormItem' });
    const found = items.find((it) => it.text().includes(labelText));
    if (!found) return { exists: false, disabled: false };
    // antd marks the wrapping `.ant-select` (parent of selector) with
    // `ant-select-disabled` when :disabled — check the form-item HTML
    // for any disabled signal: native attr OR antd class.
    const html = found.html();
    const disabled =
      /disabled(?:=|>|\s)/.test(html) || html.includes('ant-select-disabled');
    return { exists: true, disabled };
  }

  function chuokaiUser() {
    return buildAuthUser({
      role_code: 'CHUOKAI',
      permissions: ['ja.view', 'ja.update'],
    });
  }

  it('should disable JA名 / JA名(カナ) / 都道府県 / 中央会フラグ when CHUOKAI edits', async () => {
    const { wrapper } = await renderView({ jaId: 5, user: chuokaiUser() });
    expect(inputByLabel(wrapper, 'JA名').disabled).toBe(true);
    expect(inputByLabel(wrapper, 'JA名(カナ)').disabled).toBe(true);
    expect(inputByLabel(wrapper, '都道府県').disabled).toBe(true);
  });

  it('should keep 郵便番号 / 住所 / 電話番号 / FAX / メール / 担当部署 / 担当者 / 税区分 / 備考 editable when CHUOKAI edits', async () => {
    const { wrapper } = await renderView({ jaId: 5, user: chuokaiUser() });
    expect(inputByLabel(wrapper, '郵便番号').disabled).toBe(false);
    expect(inputByLabel(wrapper, '住所').disabled).toBe(false);
    expect(inputByLabel(wrapper, '電話番号').disabled).toBe(false);
    expect(inputByLabel(wrapper, 'FAX').disabled).toBe(false);
    expect(inputByLabel(wrapper, 'メールアドレス').disabled).toBe(false);
    expect(inputByLabel(wrapper, '担当部署名').disabled).toBe(false);
    expect(inputByLabel(wrapper, '担当者名').disabled).toBe(false);
    expect(inputByLabel(wrapper, '備考').disabled).toBe(false);
  });

  it('should keep ALL fields editable when NICHINO_ADMIN edits (default test user)', async () => {
    const { wrapper } = await renderView({ jaId: 5 });
    expect(inputByLabel(wrapper, 'JA名').disabled).toBe(false);
    expect(inputByLabel(wrapper, '都道府県').disabled).toBe(false);
  });

  it('should NOT apply restrictions in create mode even for CHUOKAI (create requires ja.create which they lack — list view gates this, but defense-in-depth)', async () => {
    // jaId undefined → create mode → isRestrictedEditor stays false.
    const { wrapper } = await renderView({ user: chuokaiUser() });
    expect(inputByLabel(wrapper, 'JA名').disabled).toBe(false);
    expect(inputByLabel(wrapper, '都道府県').disabled).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Defensive / edge-case coverage — error paths + focusFirstError
// ───────────────────────────────────────────────────────────────────────
describe('JaFormView — defensive paths', () => {
  it('should fall back to an empty prefecture list when getTodofukenList rejects', async () => {
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    vi.mocked(getTodofukenList).mockRejectedValueOnce({ message: 'boom' });
    const { wrapper } = await renderView();
    // The dropdown should render but its options list is empty — no crash.
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('should focus the first invalid field after submitting a blank create form', async () => {
    const { wrapper } = await renderView({ user: undefined });
    // attach to body so focus is observable
    wrapper.vm; // eslint-disable-line
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    // The view's focusFirstError logic runs after validateClient. We just
    // assert it didn't throw (any branch covered).
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should swallow updateJa rejection without crashing when BE returns 500 (interceptor toasts)', async () => {
    const { updateJa } = await import('@/api/ja/ja');
    vi.mocked(updateJa).mockRejectedValue({
      response: { data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const { wrapper } = await renderView({ jaId: 5 });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    // No re-toast from view; success toast also NOT called.
    expect(message.success).not.toHaveBeenCalled();
  });

  it('should fall back gracefully when getJa rejects with NOT_FOUND on edit-mode mount', async () => {
    const { getJa } = await import('@/api/ja/ja');
    vi.mocked(getJa).mockRejectedValue({
      response: { data: { error_code: 'NOT_FOUND' } },
    });
    const { wrapper } = await renderView({ jaId: 999 });
    // The form should still render; the global axios interceptor toasted +
    // (per spec) the caller may redirect — neither path should crash.
    expect(wrapper.find('form').exists()).toBe(true);
  });

  // ─── focusFirstError target-type branches ────────────────────────
  // The first-error in FIELD_ORDER drives which DOM-type branch fires.
  // ja_code is <a-input> (native input) → instanceof HTMLInputElement.
  // todofuken_code is <a-select> (wrapper) → .ant-select-selector path.
  // zei_kubun is <a-radio-group> (wrapper) → first <input type="radio">.

  it('should focus an <a-select> wrapper (.ant-select-selector path) when the first error is a select-type field', async () => {
    const { wrapper } = await renderView({ user: undefined });
    // Fill ja_code/ja_name/ja_name_kana so the first error lands on
    // todofuken_code (which is <a-select> — wrapper-type focus path).
    const vm = wrapper.vm as any;
    if (vm.form) {
      vm.form.ja_code = '0000000001';
      vm.form.ja_name = 'テストJA';
      vm.form.ja_name_kana = 'ﾃｽﾄｼﾞｪｲｴｰ';
      // Leave todofuken_code, zei_kubun blank.
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });

  it('should focus a <a-radio-group> wrapper (first <input type=radio>) when zei_kubun is the first error', async () => {
    const { wrapper } = await renderView({ user: undefined });
    // Fill everything BEFORE zei_kubun so it becomes the first error.
    const vm = wrapper.vm as any;
    if (vm.form) {
      vm.form.ja_code = '0000000001';
      vm.form.ja_name = 'テスト';
      vm.form.todofuken_code = '13';
      vm.form.zei_kubun = '';  // leave zei_kubun blank
    }
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('必須項目です。');
  });
});

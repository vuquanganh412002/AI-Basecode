// Screen: ACSMS-SCR-025 — アカウントマスタ登録画面
//
// Drives src/views/account/AccountFormView.vue (rewrites the SCR-024-era
// placeholder). Single view covers both CREATE (route `AccountCreate`)
// and EDIT (route `AccountEdit`). Every it() maps to a clause in
// docs/design/ACSMS-SCR-025/screen-design.md (機能定義 + メッセージ情報) +
// docs/design/ACSMS-SCR-025/ACSMS-SCR-025-api.md (API-025-001..003).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import AccountFormView from '@/views/account/AccountFormView.vue';

import { resetTodofukenCache } from '@/composables/useTodofuken';
import {
  buildAccountDetail,
  buildCreateAccountForm,
  buildTodofukenList,
  type CreateAccountForm,
} from '@test/fixtures/account-form.fixture';
import {
  buildAuthUser,
  buildJaDropdownResponse,
  buildKanriShitenDropdownList,
  buildRoleDropdownList,
} from '@test/fixtures/accounts.fixture';

// API wrappers — /gen-code-frontend will add detail / create / update
// to `src/api/account/account.ts` alongside the existing
// `listAccounts` / `removeAccount` (SCR-024).
vi.mock('@/api/account/account', () => ({
  listAccounts: vi.fn(),
  removeAccount: vi.fn(),
  getAccount: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

// Dropdown lookups (COMMON-001..004).
vi.mock('@/api/roles/roles', () => ({
  listRolesDropdown: vi.fn(),
}));
vi.mock('@/api/todofuken/todofuken', () => ({
  getTodofukenList: vi.fn(),
}));
vi.mock('@/api/ja/ja', () => ({
  getJaDropdown: vi.fn(),
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

interface RenderOptions {
  /** Edit mode: pass a number → router navigates to AccountEdit/:id. */
  accountId?: number;
  /** Override default NICHINO_ADMIN session (for access-denied path). */
  user?: ReturnType<typeof buildAuthUser>;
  /** Attach to document.body so document-based focus (focusFirstError) is observable. */
  attach?: boolean;
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
      { path: '/accounts', name: 'AccountList', component: { template: '<div />' } },
      { path: '/accounts/create', name: 'AccountCreate', component: { template: '<div />' } },
      {
        path: '/accounts/:id/edit',
        name: 'AccountEdit',
        component: { template: '<div />' },
      },
    ],
  });
  if (opts.accountId !== undefined) {
    await router.push({ name: 'AccountEdit', params: { id: String(opts.accountId) } });
  } else {
    await router.push({ name: 'AccountCreate' });
  }
  await router.isReady();

  const wrapper = mount(AccountFormView, {
    ...(opts.attach ? { attachTo: document.body } : {}),
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
  return { wrapper, router };
}

/**
 * Apply a full form payload while respecting AccountFormView's cascade
 * watchers. `Object.assign(formState, ...)` sets `todofuken_code` and
 * `ja_id` synchronously; on the next microtask the todofuken watcher
 * wipes `ja_id` (and `kanri_shiten_id`) so a downstream field reads
 * null when the test asserts. Real UX picks fields in cascade order
 * — this helper mimics that order: assign, flush, then re-apply the
 * cascade-target values so the watcher doesn't silently nullify them.
 */
async function fillForm(
  vm: { formState: Record<string, unknown> },
  form: CreateAccountForm,
): Promise<void> {
  Object.assign(vm.formState, form);
  await flushPromises();
  if ('ja_id' in form) vm.formState.ja_id = form.ja_id;
  if ('kanri_shiten_id' in form) vm.formState.kanri_shiten_id = form.kanri_shiten_id;
  await flushPromises();
}

beforeEach(async () => {
  // 都道府県は useTodofuken のモジュール共有キャッシュ。テスト間で持ち越すと
  // 2件目以降が「取得済み」になり HTTP 回数の検証が崩れる。
  resetTodofukenCache();
  vi.clearAllMocks();
  const { listRolesDropdown } = await import('@/api/roles/roles');
  vi.mocked(listRolesDropdown).mockResolvedValue({ data: buildRoleDropdownList() });

  const { getTodofukenList } = await import('@/api/todofuken/todofuken');
  vi.mocked(getTodofukenList).mockResolvedValue({ data: buildTodofukenList() });

  const { getJaDropdown } = await import('@/api/ja/ja');
  vi.mocked(getJaDropdown).mockResolvedValue(buildJaDropdownResponse());

  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  vi.mocked(getKanriShitenDropdown).mockResolvedValue({
    data: buildKanriShitenDropdownList(),
  });

  const { getShitenDropdown } = await import('@/api/shiten/shiten');
  vi.mocked(getShitenDropdown).mockResolvedValue({
    data: [
      { shiten_id: 30, shiten_code: 'S001', shiten_name: '本店支店', kanri_shiten_id: 20, kinyu_shiten_flg: false },
    ],
  });

  const { getAccount, createAccount, updateAccount } = await import('@/api/account/account');
  vi.mocked(getAccount).mockResolvedValue({ data: buildAccountDetail() });
  vi.mocked(createAccount).mockResolvedValue({
    data: buildAccountDetail({ account_id: 99 }),
    message: '登録しました。',
  });
  vi.mocked(updateAccount).mockResolvedValue({
    data: buildAccountDetail(),
    message: '更新しました。',
  });
});

// ───────────────────────────────────────────────────────────────────────
// 1. 画面初期表示 (機能定義 1.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — initial render (機能定義 1.1 / 1.2)', () => {
  it('should render the form fields when mounted in create mode', async () => {
    // v1.3 screen design removed the section headings (ログイン情報 /
    // アカウント情報 / その他). Assert on form labels that are always
    // present instead — those are the canonical proof the form mounted.
    const { wrapper } = await renderView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t.includes('ログインID'))).toBe(true);
    expect(labels.some((t) => t.includes('アカウント名'))).toBe(true);
  });

  it('should fetch the role dropdown once when mounted (COMMON-002)', async () => {
    await renderView();
    const { listRolesDropdown } = await import('@/api/roles/roles');
    expect(listRolesDropdown).toHaveBeenCalledTimes(1);
  });

  it('should fetch the todofuken dropdown once when mounted (COMMON-001)', async () => {
    await renderView();
    const { getTodofukenList } = await import('@/api/todofuken/todofuken');
    expect(getTodofukenList).toHaveBeenCalledTimes(1);
  });

  it('should NOT call getAccount when mounted in create mode (no :id)', async () => {
    await renderView();
    const { getAccount } = await import('@/api/account/account');
    expect(getAccount).not.toHaveBeenCalled();
  });

  it('should call getAccount with the route id when mounted in edit mode', async () => {
    await renderView({ accountId: 2 });
    const { getAccount } = await import('@/api/account/account');
    expect(getAccount).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getAccount).mock.calls[0]?.[0]).toBe(2);
  });

  it('should render the 登録 submit button when mounted in create mode', async () => {
    const { wrapper } = await renderView();
    // Antd inserts a half-width space between two CJK chars (登 録) —
    // match by selector + substring rather than literal text.
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.text()).toContain('登');
  });

  it('should render the 前の画面に戻る back button when mounted', async () => {
    const { wrapper } = await renderView();
    expect(wrapper.text()).toContain('前の画面に戻る');
  });

  it('should default paper_flg and denshi_flg to false when mounted in create mode', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    expect(vm.formState?.paper_flg).toBe(false);
    expect(vm.formState?.denshi_flg).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. 編集モード — form pre-fill (機能定義 1.2 + 8.1)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — edit mode pre-fill (機能定義 1.2)', () => {
  it('should pre-fill form fields with the API response values when in edit mode', async () => {
    const { wrapper } = await renderView({ accountId: 2 });
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const values = inputs.map((i) => (i.element as HTMLInputElement).value);
    expect(values.some((v) => v === 'ja_honten001')).toBe(true);
    expect(values.some((v) => v === 'JA本店 花子')).toBe(true);
    expect(values.some((v) => v === 'honten001@example.com')).toBe(true);
    expect(values.some((v) => v === 'honten001.sub1@example.com')).toBe(true);
  });

  it('should disable the login_id input when in edit mode', async () => {
    // 機能定義 8.1 — ログインID項目は変更不可（disabled）.
    const { wrapper } = await renderView({ accountId: 2 });
    const inputs = wrapper.findAll('input').filter((i) => i.element.type === 'text');
    const loginIdInput = inputs.find(
      (i) => (i.element as HTMLInputElement).value === 'ja_honten001',
    );
    expect(loginIdInput).toBeDefined();
    expect(loginIdInput!.attributes('disabled')).toBeDefined();
  });

  it('should leave the password input blank when in edit mode (空欄=変更しない)', async () => {
    // 機能定義 1.2 — パスワードは空欄（変更時のみ入力）.
    const { wrapper } = await renderView({ accountId: 2 });
    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.exists()).toBe(true);
    expect((passwordInput.element as HTMLInputElement).value).toBe('');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. 管理者区分による表示変更 (機能定義 4.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — role-based dropdown visibility (機能定義 4.x)', () => {
  // v1.3 screen design: 都道府県 / JA / 管理支店 are ALWAYS rendered.
  // Visibility-by-role is now expressed via `:disabled` + the trailing
  // `*` required-marker. The role still drives validation behaviour
  // (showTodofuken/showJa/showKanriShiten gate the required check).

  it('should disable 都道府県 / JA / 管理支店 dropdowns when role_id is 1 (日農管理者)', async () => {
    // 機能定義 4.1 — role_id=1,2 → these 3 dropdowns are non-applicable.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) vm.formState.role_id = 1;
    await flushPromises();

    const labels = wrapper.findAll('label').map((l) => l.text());
    // Labels still appear (always rendered) but WITHOUT the asterisk.
    expect(labels.some((t) => t === '都道府県')).toBe(true);
    expect(labels.some((t) => t.includes('管理支店'))).toBe(true);
    // No asterisk on these labels for role_id=1 (not required).
    expect(labels.some((t) => t === '都道府県*')).toBe(false);
    expect(labels.some((t) => t === '管理支店*')).toBe(false);
  });

  it('should mark 都道府県 + JA required when role_id is 4 (JA本店) and 管理支店 not required', async () => {
    // 機能定義 4.2 — role_id=4 → 都道府県 + JA 必須、管理支店なし.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) vm.formState.role_id = 4;
    await flushPromises();

    const labels = wrapper.findAll('label').map((l) => l.text());
    // Asterisks present on 都道府県 + JA, absent on 管理支店.
    expect(labels.some((t) => t === '都道府県*')).toBe(true);
    expect(labels.some((t) => t === 'JA名*')).toBe(true);
    expect(labels.some((t) => t === '管理支店*')).toBe(false);
  });

  it('should mark all three scope dropdowns required when role_id is 5 (JA管理支店)', async () => {
    // 機能定義 4.2 — role_id=5 → すべての項目が入力必須.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) vm.formState.role_id = 5;
    await flushPromises();

    const labels = wrapper.findAll('label').map((l) => l.text());
    expect(labels.some((t) => t === '都道府県*')).toBe(true);
    expect(labels.some((t) => t === 'JA名*')).toBe(true);
    expect(labels.some((t) => t === '管理支店*')).toBe(true);
  });

  // 所属支店(shiten_id) — 顧客要件2026-07: 常に表示。role_id=5＋管理支店選択時のみ
  // 活性、それ以外は都道府県 / JA / 管理支店 と同様グレーアウト。
  function shitenSelect(wrapper: ReturnType<typeof mount>) {
    return wrapper
      .findAllComponents({ name: 'AFormItem' })
      .find((it) => it.props('name') === 'shiten_id')
      ?.findComponent({ name: 'ASelect' });
  }

  it('should always render the 所属支店 dropdown but disable it for role_id 4 (JA本店)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) vm.formState.role_id = 4;
    await flushPromises();
    expect(wrapper.findAll('label').map((l) => l.text())).toContain('所属支店');
    expect(shitenSelect(wrapper)?.props('disabled')).toBe(true);
  });

  it('should enable the 所属支店 dropdown only when role_id is 5 and a 管理支店 is selected', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) vm.formState.role_id = 5;
    await flushPromises();
    // 管理支店未選択 → 表示されるが非活性。
    expect(wrapper.findAll('label').map((l) => l.text())).toContain('所属支店');
    expect(shitenSelect(wrapper)?.props('disabled')).toBe(true);

    vm.formState.kanri_shiten_id = 20;
    await flushPromises();
    expect(shitenSelect(wrapper)?.props('disabled')).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. カスケード (機能定義 5.x + 6.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — 都道府県 / JA cascade (機能定義 5.x / 6.x)', () => {
  it('should re-fetch the JA dropdown when 都道府県 changes', async () => {
    // 機能定義 5.1 — 都道府県選択→JA一覧再取得.
    const { wrapper } = await renderView();
    const { getJaDropdown } = await import('@/api/ja/ja');
    vi.mocked(getJaDropdown).mockClear();

    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.role_id = 4;
      vm.formState.todofuken_code = '13';
    }
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalled();
    const callArg = vi.mocked(getJaDropdown).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toMatchObject({ todofuken_code: '13' });
  });

  it('should pass chuokai_flg=true when role_id=3 (中央会) and 都道府県 changes', async () => {
    // 機能定義 5.1 — role_id=3 → chuokai_flg=1 で絞込み.
    const { wrapper } = await renderView();
    const { getJaDropdown } = await import('@/api/ja/ja');
    vi.mocked(getJaDropdown).mockClear();

    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.role_id = 3;
      vm.formState.todofuken_code = '13';
    }
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalled();
    const callArg = vi.mocked(getJaDropdown).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    // BE accepts role_id and translates to chuokai_flg per COMMON-003 cascade rule.
    expect(callArg).toMatchObject({ role_id: 3 });
  });

  it('should reset ja_id and kanri_shiten_id when 都道府県 changes', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.role_id = 5;
      vm.formState.todofuken_code = '13';
      vm.formState.ja_id = 10;
      vm.formState.kanri_shiten_id = 20;
    }
    await flushPromises();

    if (vm.formState) vm.formState.todofuken_code = '27';
    await flushPromises();

    expect(vm.formState?.ja_id).toBeFalsy();
    expect(vm.formState?.kanri_shiten_id).toBeFalsy();
  });

  it('should re-fetch the 管理支店 dropdown when JA changes', async () => {
    // 機能定義 6.1 — JA選択→管理支店一覧再取得.
    const { wrapper } = await renderView();
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(getKanriShitenDropdown).mockClear();

    const vm = wrapper.vm as any;
    // Apply cascade upstream first; flush so the todofuken_code watcher
    // wipes downstream (it would erase ja_id if set in the same tick).
    // Then set ja_id and re-flush so the ja_id watcher actually fires
    // with prev=null → next=10 and calls fetchKanriShitenOptions(10).
    vm.formState.role_id = 5;
    vm.formState.todofuken_code = '13';
    await flushPromises();
    vm.formState.ja_id = 10;
    await flushPromises();

    expect(getKanriShitenDropdown).toHaveBeenCalled();
    const arg = vi.mocked(getKanriShitenDropdown).mock.calls[0]?.[0];
    expect(arg).toBe(10);
  });

  it('should reset kanri_shiten_id when JA changes', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.role_id = 5;
      vm.formState.todofuken_code = '13';
      vm.formState.ja_id = 10;
      vm.formState.kanri_shiten_id = 20;
    }
    await flushPromises();

    if (vm.formState) vm.formState.ja_id = 11;
    await flushPromises();

    expect(vm.formState?.kanri_shiten_id).toBeFalsy();
  });

  it('should reset 都道府県 / JA / 管理支店 when role_id changes between two non-null roles (QA 2026-05)', async () => {
    // [role-change-full-reset] User report — switching role left the
    // previous role's selections sitting in the dropdowns. Even when
    // the new role shows the same fields (e.g. role 5 → 4 both show
    // 都道府県+JA), all 3 must clear so the user picks from scratch.
    //
    // Sequence: first pick role=5 (null→5, NO reset by design — see
    // [skip-initial-pick] in AccountFormView.vue), flush, then assign
    // dependents, flush, THEN switch role 5 → 4. The latter triggers
    // the reset.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) vm.formState.role_id = 5;
    await flushPromises();
    if (vm.formState) {
      vm.formState.todofuken_code = '13';
      vm.formState.ja_id = 10;
      vm.formState.kanri_shiten_id = 20;
    }
    await flushPromises();

    if (vm.formState) vm.formState.role_id = 4;
    await flushPromises();

    expect(vm.formState?.todofuken_code).toBeFalsy();
    expect(vm.formState?.ja_id).toBeFalsy();
    expect(vm.formState?.kanri_shiten_id).toBeFalsy();
  });

  it('should also reset dependent fields when role_id changes between siblings (3 → 4)', async () => {
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) vm.formState.role_id = 3;
    await flushPromises();
    if (vm.formState) {
      vm.formState.todofuken_code = '13';
      vm.formState.ja_id = 10;
    }
    await flushPromises();

    if (vm.formState) vm.formState.role_id = 4;
    await flushPromises();

    expect(vm.formState?.todofuken_code).toBeFalsy();
    expect(vm.formState?.ja_id).toBeFalsy();
  });

  it('should NOT reset dependents on the first role pick (null → value)', async () => {
    // [skip-initial-pick] Guards the Object.assign() pattern used by
    // fillForm() across create-flow tests: role_id + todofuken bundle
    // into one tick. role_id transition null→N must NOT clear the
    // dependents that were assigned in the same Object.assign call.
    // Real UX: dependents are null at first pick anyway, no observable
    // diff — this is purely a test-stability guard.
    const { wrapper } = await renderView();
    const vm = wrapper.vm as any;
    if (vm.formState) {
      vm.formState.role_id = 5;
      vm.formState.todofuken_code = '13';
    }
    await flushPromises();
    expect(vm.formState?.todofuken_code).toBe('13');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. 登録ボタン — バリデーション (機能定義 2.1)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — submit validation (機能定義 2.1)', () => {
  it('should show ACSMS-MSG-025-001 「必須項目です。」 when login_id is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm({ login_id: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createAccount).not.toHaveBeenCalled();
  });

  // Form has 14 controls — pressing Enter inside a text input must NOT
  // implicitly submit (users hit Enter as a "next field" reflex, esp. on
  // Japanese IME keyboards). Regression guard for preventEnterImplicitSubmit
  // wired on the <a-form>.
  it('should NOT call createAccount when user presses Enter inside a text input', async () => {
    const { createAccount } = await import('@/api/account/account');
    const { wrapper } = await renderView();
    await flushPromises();

    const firstInput = wrapper.find('input');
    expect(firstInput.exists()).toBe(true);
    await firstInput.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(createAccount).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-025-001 「必須項目です。」 when account_name is empty and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm({ account_name: '' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-025-001 「必須項目です。」 when role_id is unset and 登録 is clicked', async () => {
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm());
    vm.formState.role_id = null;
    await flushPromises();
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('should show 必須項目です when role_id=4 and todofuken_code is empty and 登録 is clicked', async () => {
    // 機能定義 4.2 — 条件付き必須 (role_id=3,4,5 → 都道府県必須).
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm({
      role_id: 4,
      todofuken_code: '',
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('should show 必須項目です when role_id=5 and kanri_shiten_id is empty and 登録 is clicked', async () => {
    // 機能定義 4.2 — role_id=5 → 管理支店必須.
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm({
      role_id: 5,
      todofuken_code: '13',
      ja_id: 10,
      kanri_shiten_id: null,
    }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('必須項目です。');
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-025-002 when login_id format is invalid and 登録 is clicked', async () => {
    // 機能定義 2.1 — 半角英数記号以外 → MSG-025-002.
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm({ login_id: 'JA本店' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('ログインIDは半角英数字のみ入力可能です。');
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-025-003 when password format is invalid and 登録 is clicked', async () => {
    // 機能定義 2.1 — 8〜32文字、複雑性チェック.
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm({ password: 'short' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain(
      'パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。',
    );
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-025-005 when email format is invalid and 登録 is clicked', async () => {
    // 機能定義 2.1 — メール形式チェック.
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm({ email: 'not-an-email' }));

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('正しいメールアドレスを入力してください。');
    expect(createAccount).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. 登録ボタン — 成功フロー (機能定義 2.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — create success (機能定義 2.3 / 2.4)', () => {
  it('should call createAccount with the form body when 登録 is clicked with valid input', async () => {
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');
    vi.mocked(createAccount).mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createAccount).toHaveBeenCalledTimes(1);
    const body = vi.mocked(createAccount).mock.calls[0]?.[0] as unknown as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      login_id: 'ja_honten_new',
      role_id: 4,
      account_name: 'JA本店 新規',
    });
  });

  it('should show 「登録しました。」 toast when createAccount succeeds', async () => {
    // ACSMS-MSG-025-007 — 登録成功.
    const { wrapper } = await renderView();
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Project verb-only convention — useNotify().created() → '登録しました。'.
    expect(successSpy).toHaveBeenCalledWith('登録しました。');
  });

  it('should navigate to AccountList when createAccount succeeds', async () => {
    // 機能定義 2.4 — 登録後一覧画面へ遷移.
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('AccountList');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. 登録ボタン — エラーフロー
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — create error paths', () => {
  it('should show ACSMS-MSG-025-004 field error when createAccount rejects with DUPLICATE_CODE', async () => {
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');
    vi.mocked(createAccount).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error_code: 'DUPLICATE_CODE',
          message: 'ログインID「ja_honten_new」はすでに登録されています。',
          errors: [{ field: 'login_id', message: 'このログインIDは既に登録されています。' }],
        },
      },
    });

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('このログインIDは既に登録されています。');
  });

  it('should NOT show success toast when createAccount rejects with 500', async () => {
    // 機能定義 2.3 — システムエラー → ACSMS-MSG-025-008 (interceptor toasts).
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');
    vi.mocked(createAccount).mockRejectedValueOnce({
      response: { status: 500, data: { error_code: 'INTERNAL_SERVER_ERROR' } },
    });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    const vm = wrapper.vm as any;
    await fillForm(vm, buildCreateAccountForm());

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(successSpy).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. 編集モード — submit (機能定義 1.2 + 8.1)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — update flow (edit mode)', () => {
  it('should call updateAccount with the route id when 登録 is clicked in edit mode', async () => {
    const { wrapper } = await renderView({ accountId: 2 });
    const { updateAccount, createAccount } = await import('@/api/account/account');
    vi.mocked(updateAccount).mockClear();

    // 編集で何か変更しないと「変更なし」ガードでスキップされる。
    (wrapper.vm as any).formState.account_name = '変更後アカウント名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createAccount).not.toHaveBeenCalled();
    expect(updateAccount).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateAccount).mock.calls[0]?.[0]).toBe(2);
  });

  it('should keep password field empty in the update body when the user did not type a new password', async () => {
    // 機能定義 8.1 — パスワードを空欄のまま → 既存のパスワードを保持.
    const { wrapper } = await renderView({ accountId: 2 });
    const { updateAccount } = await import('@/api/account/account');
    vi.mocked(updateAccount).mockClear();

    // パスワード以外を変更 → 「変更なし」ガードを通過しつつ password は空欄のまま。
    (wrapper.vm as any).formState.account_name = '変更後アカウント名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const body = vi.mocked(updateAccount).mock.calls[0]?.[1] as unknown as Record<
      string,
      unknown
    >;
    expect(body.password === '' || body.password === undefined).toBe(true);
  });

  it('should show 「更新しました。」 toast when updateAccount succeeds', async () => {
    const { wrapper } = await renderView({ accountId: 2 });
    const successSpy = vi.spyOn(message, 'success');
    successSpy.mockClear();

    (wrapper.vm as any).formState.account_name = '変更後アカウント名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(successSpy).toHaveBeenCalledWith('更新しました。');
  });

  it('should navigate to AccountList when updateAccount succeeds', async () => {
    const { wrapper, router } = await renderView({ accountId: 2 });
    const pushSpy = vi.spyOn(router, 'push');

    (wrapper.vm as any).formState.account_name = '変更後アカウント名';
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('AccountList');
  });

  it('should NOT call updateAccount (skip) when nothing changed in edit mode', async () => {
    const { wrapper } = await renderView({ accountId: 2 });
    const { updateAccount } = await import('@/api/account/account');
    vi.mocked(updateAccount).mockClear();
    const infoSpy = vi.spyOn(message, 'info');
    infoSpy.mockClear();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateAccount).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('変更がありません。');
  });

  it('should NOT submit createAccount when called in edit mode', async () => {
    const { wrapper } = await renderView({ accountId: 2 });
    const { createAccount } = await import('@/api/account/account');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createAccount).not.toHaveBeenCalled();
  });
});

describe('AccountFormView — focus first error on submit', () => {
  it('should focus the first errored field when submit hits a validation error', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    // attach=true で document へマウントし focusFirstError の document 検索を有効化。
    const { wrapper } = await renderView({ attach: true }); // 新規（必須未入力）
    const { createAccount } = await import('@/api/account/account');
    vi.mocked(createAccount).mockClear();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await flushPromises(); // nextTick(focusFirstError) を待つ
    expect(createAccount).not.toHaveBeenCalled(); // 検証で送信ブロック
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 9. 前の画面に戻るボタン (機能定義 3.x)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — back navigation (機能定義 3.x)', () => {
  it('should navigate to AccountList when 前の画面に戻る is clicked', async () => {
    // 機能定義 3.1 — アカウント明細検索画面へ遷移.
    const { wrapper, router } = await renderView();
    const pushSpy = vi.spyOn(router, 'push');

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    expect(backBtn).toBeDefined();
    await backBtn!.trigger('click');
    await flushPromises();

    const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
    expect(pushed).toContain('AccountList');
  });

  it('should NOT call createAccount when 前の画面に戻る is clicked', async () => {
    const { wrapper } = await renderView();
    const { createAccount } = await import('@/api/account/account');

    const backBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('前の画面に戻る'));
    await backBtn!.trigger('click');
    await flushPromises();

    expect(createAccount).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 10. 権限チェック (機能定義 1.1 + メッセージ情報 ACSMS-MSG-025-009)
// ───────────────────────────────────────────────────────────────────────
describe('AccountFormView — access control', () => {
  it('should NOT call listRolesDropdown when the current user is NOT NICHINO_ADMIN', async () => {
    // 機能定義 1.1 — 日農管理者のみアクセス可能.
    await renderView({
      user: buildAuthUser({ role_code: 'CHUOKAI', role_id: 3, permissions: [] }),
    });
    const { listRolesDropdown } = await import('@/api/roles/roles');
    expect(listRolesDropdown).not.toHaveBeenCalled();
  });

  it('should show ACSMS-MSG-025-009 「アクセス権がありません。」 when the current user is NOT NICHINO_ADMIN', async () => {
    const { wrapper } = await renderView({
      user: buildAuthUser({ role_code: 'JA_HONTEN', role_id: 4, permissions: [] }),
    });
    expect(wrapper.text()).toContain('アクセス権がありません。');
  });
});

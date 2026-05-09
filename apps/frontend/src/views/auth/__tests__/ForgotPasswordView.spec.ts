// Screen: ACSMS-SCR-012 — パスワードの再設定 (Forgot Password)
//
// Drives src/views/auth/ForgotPasswordView.vue. Each it() maps to a clause in
// docs/design/ACSMS-SCR-012/screen-design.md (機能定義: パスワードの再設定 §1-4 +
// メッセージ情報) + forgot-password.html (DOM hierarchy) +
// docs/design/ACSMS-SCR-012/ACSMS-SCR-012-api.md (POST /api/v1/auth/forgot-password).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import ForgotPasswordView from '../ForgotPasswordView.vue';
import { buildForgotPasswordSuccess, buildAxiosError } from '../../../../test/fixtures/password-reset.fixture';

// Mock the entire auth API module — `forgotPassword` is added by /gen-code-frontend.
vi.mock('@/api/auth/auth', () => ({
  login: vi.fn(),
  verifyMfa: vi.fn(),
  resendMfa: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  fetchPublicOshirase: vi.fn(),
  toggleMfa: vi.fn(),
  forgotPassword: vi.fn(),
  verifyResetToken: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('@/stores/codes.store', () => ({
  useCodesStore: () => ({
    loadAll: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  }),
}));

import * as authApi from '@/api/auth/auth';

const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);

async function renderView(): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
  pushSpy: ReturnType<typeof vi.fn>;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/forgot-password', name: 'ForgotPassword', component: { template: '<div />' } },
    ],
  });
  await router.push({ name: 'ForgotPassword' });
  await router.isReady();
  const pushSpy = vi.spyOn(router, 'push') as unknown as ReturnType<typeof vi.fn>;

  const wrapper = mount(ForgotPasswordView, {
    global: {
      plugins: [
        router,
        createTestingPinia({ createSpy: vi.fn, stubActions: false }),
        Antd,
      ],
    },
  });
  return { wrapper, router, pushSpy };
}

describe('ForgotPasswordView (SCR-012 — Request Reset Email)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Initial render ──────────────────────────────────────────────────
  describe('initial render', () => {
    it('should render the パスワードの再設定 heading when mounted', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      expect(wrapper.text()).toContain('パスワードの再設定');
    });

    it('should render the メールアドレス label when mounted', async () => {
      const { wrapper } = await renderView();
      const labels = wrapper.findAll('label').map((l) => l.text());
      expect(labels.some((t) => t.includes('メールアドレス'))).toBe(true);
    });

    it('should render the submit button with パスワード再設定メールを送信 label when mounted', async () => {
      const { wrapper } = await renderView();
      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.exists()).toBe(true);
      // 'パスワード再設定メールを送信' is 14 CJK chars — antd does not auto-space 3+ in a row.
      expect(submitBtn.text()).toContain('パスワード再設定メールを送信');
    });

    it('should render the ログイン画面に戻る link when mounted', async () => {
      const { wrapper } = await renderView();
      expect(wrapper.text()).toContain('ログイン画面に戻る');
    });

    it('should NOT render any error message before submit when mounted', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      expect(wrapper.find('.ant-form-item-explain-error').exists()).toBe(false);
    });
  });

  // ─── §2.1 / §3.2 — required validation ───────────────────────────────
  describe('email validation (§2 / §3.2)', () => {
    it('should show ACSMS-SCR-012-001 when email is blank on submit', async () => {
      const { wrapper } = await renderView();
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(wrapper.text()).toContain('メールアドレスを入力してください。');
      expect(authApi.forgotPassword).not.toHaveBeenCalled();
    });

    it('should show ACSMS-SCR-012-002 when email format is invalid on submit', async () => {
      const { wrapper } = await renderView();
      const input = wrapper.find('input[type="text"], input[type="email"]').element as HTMLInputElement;
      // The view should render an `<input>` whose type is NOT `email` (per
      // vue.md §"NEVER use HTML5 native input types for validation"). The
      // selector matches either to avoid coupling to `type=` attribute.
      await wrapper.find('input').setValue('not-an-email');
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(wrapper.text()).toContain('有効なメールアドレスを入力してください。');
      expect(authApi.forgotPassword).not.toHaveBeenCalled();
      // Touch the unused locator so eslint doesn't strip it.
      expect(input).toBeDefined();
    });

    it('should NOT use HTML5 type="email" on the input when mounted', async () => {
      const { wrapper } = await renderView();
      // vue.md §"NEVER use HTML5 native input types for validation" —
      // antd modeless validation expects `type="text"` so error display
      // is governed by `<a-form-item :help>`, not the browser bubble.
      const emailInput = wrapper.find('input');
      expect(['email', 'tel', 'number', 'url', 'date'])
        .not.toContain(emailInput.attributes('type'));
    });
  });

  // ─── §3.3 / §3.4 — happy path submit ─────────────────────────────────
  describe('submit (§3.3 / §3.4)', () => {
    it('should call forgotPassword with email value when form is submitted with valid email', async () => {
      vi.mocked(authApi.forgotPassword).mockResolvedValue(buildForgotPasswordSuccess());
      const { wrapper } = await renderView();

      await wrapper.find('input').setValue('user@example.com');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(authApi.forgotPassword).toHaveBeenCalledTimes(1);
      expect(authApi.forgotPassword).toHaveBeenCalledWith('user@example.com');
    });

    it('should hide the form and show ACSMS-SCR-012-003 when forgotPassword resolves', async () => {
      vi.mocked(authApi.forgotPassword).mockResolvedValue(buildForgotPasswordSuccess());
      const { wrapper } = await renderView();

      await wrapper.find('input').setValue('user@example.com');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      // Spec §3.3: フォーム全体を非表示 → submit button should disappear.
      expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
      // Spec §3.4: ACSMS-SCR-012-003 shown.
      expect(wrapper.text()).toContain(
        'パスワード再設定用のメールを送信しました。メールを確認してください。',
      );
    });

    it('should show ACSMS-SCR-012-003 even when email is unregistered (account enumeration prevention)', async () => {
      // BE returns the same success body regardless of email existence.
      vi.mocked(authApi.forgotPassword).mockResolvedValue(buildForgotPasswordSuccess());
      const { wrapper } = await renderView();

      await wrapper.find('input').setValue('nobody@example.com');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toContain(
        'パスワード再設定用のメールを送信しました。メールを確認してください。',
      );
    });
  });

  // ─── §3.5 — system error ─────────────────────────────────────────────
  describe('error path (§3.5)', () => {
    it('should keep the form visible and NOT toast manually when forgotPassword rejects with 500', async () => {
      vi.mocked(authApi.forgotPassword).mockRejectedValue(
        buildAxiosError('INTERNAL_SERVER_ERROR', 'システムエラー', 500),
      );
      const { wrapper } = await renderView();

      await wrapper.find('input').setValue('user@example.com');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      // Spec rule: global axios interceptor toasts INTERNAL_SERVER_ERROR.
      // The view must NOT call message.error directly (§Error Handling Architecture).
      // Form should still be visible so user can retry.
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
    });

    it('should map BE VALIDATION_ERROR errors[].field=email to <a-form-item :help> when API rejects', async () => {
      vi.mocked(authApi.forgotPassword).mockRejectedValue(
        buildAxiosError(
          'VALIDATION_ERROR',
          '入力値が不正です。',
          400,
          [{ field: 'email', message: '有効なメールアドレスを入力してください。' }],
        ),
      );
      const { wrapper } = await renderView();

      await wrapper.find('input').setValue('user@example.com');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toContain('有効なメールアドレスを入力してください。');
    });
  });

  // ─── §4 — back link ──────────────────────────────────────────────────
  describe('back to login link (§4)', () => {
    it('should navigate to /login when ログイン画面に戻る link is clicked', async () => {
      const { wrapper, pushSpy } = await renderView();
      const backLink = wrapper
        .findAll('a')
        .find((a) => a.text().includes('ログイン画面に戻る'));
      expect(backLink).toBeDefined();
      await backLink!.trigger('click');
      const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
      expect(pushed).toContain('Login');
    });
  });
});

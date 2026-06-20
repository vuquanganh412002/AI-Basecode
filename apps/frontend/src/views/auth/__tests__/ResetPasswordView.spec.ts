// Screen: ACSMS-SCR-012 — パスワードの変更 (Reset Password — token-bearing)
//
// Drives src/views/auth/ResetPasswordView.vue. Each it() maps to a clause in
// docs/design/ACSMS-SCR-012/screen-design.md (機能定義: パスワードの変更 §1-5 +
// メッセージ情報) + change-password.html (DOM hierarchy) +
// docs/design/ACSMS-SCR-012/ACSMS-SCR-012-api.md
// (POST /api/v1/auth/reset-password/verify, POST /api/v1/auth/reset-password).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import ResetPasswordView from '@/views/auth/ResetPasswordView.vue';
import {
  buildAxiosError,
  buildResetPasswordSuccess,
  buildVerifyResetTokenSuccess,
} from '@test/fixtures/password-reset.fixture';

vi.mock('@/api/auth/auth', () => ({
  login: vi.fn(),
  verifyMfa: vi.fn(),
  resendMfa: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  fetchLoginOshirase: vi.fn(),
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

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

interface RenderOptions {
  /** Token query param. Omit to simulate URL with no `?token=`. */
  token?: string;
}

async function renderView(opts: RenderOptions = { token: VALID_TOKEN }): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
  pushSpy: ReturnType<typeof vi.fn>;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      {
        path: '/reset-password',
        name: 'ResetPassword',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({
    name: 'ResetPassword',
    query: opts.token ? { token: opts.token } : undefined,
  });
  await router.isReady();
  const pushSpy = vi.spyOn(router, 'push') as unknown as ReturnType<typeof vi.fn>;

  const wrapper = mount(ResetPasswordView, {
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

describe('ResetPasswordView (SCR-012 — Set New Password)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ═════════════════════════════════════════════════════════════════════
  // §1 — initial token verification
  // ═════════════════════════════════════════════════════════════════════
  describe('token verification on mount (§1)', () => {
    it('should call verifyResetToken with the URL token when mounted', async () => {
      vi.mocked(authApi.verifyResetToken).mockResolvedValue(buildVerifyResetTokenSuccess());
      await renderView({ token: VALID_TOKEN });
      await flushPromises();
      expect(authApi.verifyResetToken).toHaveBeenCalledTimes(1);
      expect(authApi.verifyResetToken).toHaveBeenCalledWith(VALID_TOKEN);
    });

    it('should show ACSMS-SCR-012-008 (無効なリンク) and NOT call verifyResetToken when ?token= is missing', async () => {
      const { wrapper } = await renderView({ token: undefined });
      await flushPromises();
      expect(authApi.verifyResetToken).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('無効なリンクです。');
    });

    it('should render the password form when verifyResetToken resolves with valid:true', async () => {
      vi.mocked(authApi.verifyResetToken).mockResolvedValue(buildVerifyResetTokenSuccess());
      const { wrapper } = await renderView();
      await flushPromises();

      const labels = wrapper.findAll('label').map((l) => l.text());
      expect(labels.some((t) => t.includes('新しいパスワード'))).toBe(true);
      expect(labels.some((t) => t.includes('確認用') || t.includes('（確認用）'))).toBe(true);
      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.exists()).toBe(true);
      expect(submitBtn.text()).toContain('パスワードを更新する');
    });

    it('should show ACSMS-SCR-012-008 (無効なリンク) when verifyResetToken rejects with INVALID_RESET_TOKEN', async () => {
      vi.mocked(authApi.verifyResetToken).mockRejectedValue(
        buildAxiosError('INVALID_RESET_TOKEN', '無効なリンクです。', 400),
      );
      const { wrapper } = await renderView();
      await flushPromises();
      expect(wrapper.text()).toContain('無効なリンクです。');
      expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
    });

    it('should show ACSMS-SCR-012-007 (期限切れ) when verifyResetToken rejects with EXPIRED_RESET_TOKEN', async () => {
      vi.mocked(authApi.verifyResetToken).mockRejectedValue(
        buildAxiosError(
          'EXPIRED_RESET_TOKEN',
          'リンクの有効期限が切れています。再度パスワード再設定をお試しください。',
          400,
        ),
      );
      const { wrapper } = await renderView();
      await flushPromises();
      expect(wrapper.text()).toContain(
        'リンクの有効期限が切れています。再度パスワード再設定をお試しください。',
      );
      expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
    });

    it('should render a loading indicator while verifyResetToken is in flight', async () => {
      let resolveVerify: ((v: { valid: true }) => void) | undefined;
      vi.mocked(authApi.verifyResetToken).mockReturnValue(
        new Promise((res) => {
          resolveVerify = res;
        }),
      );
      const { wrapper } = await renderView();
      // pending — show spinner, not form
      expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
      // a-spin or similar
      const hasSpinner =
        wrapper.find('.ant-spin').exists() ||
        wrapper.text().includes('読み込み中') ||
        wrapper.text().includes('検証中');
      expect(hasSpinner).toBe(true);
      resolveVerify?.({ valid: true });
      await flushPromises();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // §2 — new_password validation
  // ═════════════════════════════════════════════════════════════════════
  describe('new_password validation (§2)', () => {
    beforeEach(() => {
      vi.mocked(authApi.verifyResetToken).mockResolvedValue(buildVerifyResetTokenSuccess());
    });

    it('should show ACSMS-SCR-012-005 when new_password is blank on submit', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(wrapper.text()).toContain('新しいパスワードを入力してください。');
      expect(authApi.resetPassword).not.toHaveBeenCalled();
    });

    it('should show ACSMS-SCR-012-006 when new_password fails 2-of-3 categories rule', async () => {
      const { wrapper } = await renderView();
      await flushPromises();

      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('OnlyLetters');
      await inputs[1].setValue('OnlyLetters');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toContain(
        'パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。',
      );
      expect(authApi.resetPassword).not.toHaveBeenCalled();
    });

    it('should show ACSMS-SCR-012-006 when new_password is shorter than 8 chars', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('Ab1');
      await inputs[1].setValue('Ab1');
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(wrapper.text()).toContain('パスワードは8~32文字');
    });

    it('should show 半角文字のみ when new_password contains full-width characters (priority over format msg)', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      // Full-width Japanese letters → fails BOTH half-width and format
      // checks; the half-width check fires first so its message wins.
      await inputs[0].setValue('パスワード123');
      await inputs[1].setValue('パスワード123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(wrapper.text()).toContain('パスワードは半角文字のみで入力してください。');
      expect(wrapper.text()).not.toContain('8~32文字で、半角英字');
      expect(authApi.resetPassword).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // §3 — confirm_password validation
  // ═════════════════════════════════════════════════════════════════════
  describe('confirm_password validation (§3)', () => {
    beforeEach(() => {
      vi.mocked(authApi.verifyResetToken).mockResolvedValue(buildVerifyResetTokenSuccess());
    });

    it('should show ACSMS-SCR-012-009 when confirm_password is blank on submit', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('NewPass123');
      // leave confirm blank
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(wrapper.text()).toContain('確認用パスワードを入力してください。');
      expect(authApi.resetPassword).not.toHaveBeenCalled();
    });

    it('should show ACSMS-SCR-012-010 when confirm_password does NOT match new_password', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('NewPass123');
      await inputs[1].setValue('OtherPass99');
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(wrapper.text()).toContain('新しいパスワードと一致していません。');
      expect(authApi.resetPassword).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // §4 — submit happy path
  // ═════════════════════════════════════════════════════════════════════
  describe('submit (§4)', () => {
    beforeEach(() => {
      vi.mocked(authApi.verifyResetToken).mockResolvedValue(buildVerifyResetTokenSuccess());
    });

    it('should call resetPassword with token + new_password + confirm_password when form is submitted with valid data', async () => {
      vi.mocked(authApi.resetPassword).mockResolvedValue(buildResetPasswordSuccess());
      const { wrapper } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('NewPass123');
      await inputs[1].setValue('NewPass123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(authApi.resetPassword).toHaveBeenCalledTimes(1);
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: VALID_TOKEN,
        new_password: 'NewPass123',
        confirm_password: 'NewPass123',
      });
    });

    it('should toast ACSMS-SCR-012-011 when resetPassword resolves', async () => {
      vi.mocked(authApi.resetPassword).mockResolvedValue(buildResetPasswordSuccess());
      const { wrapper } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('NewPass123');
      await inputs[1].setValue('NewPass123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(message.success).toHaveBeenCalledWith(
        'パスワードを更新しました。ログイン画面に移動します。',
      );
    });

    it('should redirect to /login 3 seconds after successful reset (§4.6)', async () => {
      vi.useFakeTimers();
      vi.mocked(authApi.resetPassword).mockResolvedValue(buildResetPasswordSuccess());
      const { wrapper, pushSpy } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('NewPass123');
      await inputs[1].setValue('NewPass123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      // Just before 3s, no push yet.
      vi.advanceTimersByTime(2_900);
      const pushedBefore = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
      expect(pushedBefore).not.toContain('Login');

      // After 3s total — push should fire.
      vi.advanceTimersByTime(200);
      await flushPromises();
      const pushedAfter = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
      expect(pushedAfter).toContain('Login');
    });

    it('should show ACSMS-SCR-012-007 when resetPassword rejects with EXPIRED_RESET_TOKEN (§4.4)', async () => {
      vi.mocked(authApi.resetPassword).mockRejectedValue(
        buildAxiosError(
          'EXPIRED_RESET_TOKEN',
          'リンクの有効期限が切れています。再度パスワード再設定をお試しください。',
          400,
        ),
      );
      const { wrapper } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('NewPass123');
      await inputs[1].setValue('NewPass123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toContain(
        'リンクの有効期限が切れています。再度パスワード再設定をお試しください。',
      );
      // Form should be hidden — token expired, no point retrying with same token.
      expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
    });

    it('should map BE VALIDATION_ERROR errors[].field to <a-form-item :help> when API rejects with confirm_password mismatch', async () => {
      vi.mocked(authApi.resetPassword).mockRejectedValue(
        buildAxiosError(
          'VALIDATION_ERROR',
          '入力値が不正です。',
          400,
          [{ field: 'confirm_password', message: '新しいパスワードと一致していません。' }],
        ),
      );
      const { wrapper } = await renderView();
      await flushPromises();
      const inputs = wrapper.findAll('input[type="password"]');
      await inputs[0].setValue('NewPass123');
      // Force a server-side mismatch path even though FE values match.
      await inputs[1].setValue('NewPass123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toContain('新しいパスワードと一致していません。');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // §5 — back to login
  // ═════════════════════════════════════════════════════════════════════
  describe('back to login link (§5)', () => {
    beforeEach(() => {
      vi.mocked(authApi.verifyResetToken).mockResolvedValue(buildVerifyResetTokenSuccess());
    });

    it('should navigate to /login when ログイン画面に戻る link is clicked', async () => {
      const { wrapper, pushSpy } = await renderView();
      await flushPromises();
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

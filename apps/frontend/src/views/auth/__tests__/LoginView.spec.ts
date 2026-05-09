// @ts-nocheck — TDD red phase (/gen-ut-frontend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面
//
// Drives src/views/auth/LoginView.vue. Each it() maps to a clause in
// docs/design/ACSMS-SCR-001/screen-design.md (機能定義 §1-4 + §10 + §14-15
// + メッセージ情報) + index.html (DOM hierarchy) +
// docs/design/ACSMS-SCR-001/ACSMS-SCR-001-api.md (API contracts).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import LoginView from '../LoginView.vue';
import {
  buildLoginMfaResponse,
  buildLoginNoMfaResponse,
  buildPublicOshirase,
} from '../../../../test/fixtures/auth.fixture';

vi.mock('@/api/auth/auth', () => ({
  login: vi.fn(),
  verifyMfa: vi.fn(),
  resendMfa: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  fetchPublicOshirase: vi.fn(),
}));

vi.mock('@/stores/codes.store', () => ({
  useCodesStore: () => ({
    loadAll: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  }),
}));

import * as authApi from '@/api/auth/auth';

// Antd `MessageType` is callable with PromiseLike — return undefined via
// cast so the spy compiles after `@ts-nocheck` is removed.
const noopMessage = (() => undefined) as unknown as ReturnType<typeof message.success>;
vi.spyOn(message, 'success').mockImplementation(() => noopMessage);
vi.spyOn(message, 'error').mockImplementation(() => noopMessage);

interface RenderOptions {
  /** Optional `?redirect=` query passed to the route. */
  redirect?: string;
}

async function renderView(opts: RenderOptions = {}): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/mfa-verify', name: 'MfaVerify', component: { template: '<div />' } },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
    ],
  });
  await router.push({
    name: 'Login',
    query: opts.redirect ? { redirect: opts.redirect } : undefined,
  });
  await router.isReady();

  const wrapper = mount(LoginView, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: { auth: { user: null } },
        }),
        Antd,
      ],
    },
  });
  return { wrapper, router };
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: oshirase fetch resolves to empty so onMounted doesn't crash.
    vi.mocked(authApi.fetchPublicOshirase).mockResolvedValue([]);
  });

  // ───────────────────────────────────────────────────────────────────
  // Initial render
  // ───────────────────────────────────────────────────────────────────
  describe('initial render', () => {
    it('should render ユーザーID and パスワード labels when mounted', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      const labelTexts = wrapper.findAll('label').map((l) => l.text());
      expect(labelTexts.some((t) => t.includes('ユーザーID'))).toBe(true);
      expect(labelTexts.some((t) => t.includes('パスワード'))).toBe(true);
    });

    it('should render the login submit button when mounted', async () => {
      const { wrapper } = await renderView();
      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.exists()).toBe(true);
      // CJK auto-spacing ("ログイン" stays as-is — 4 CJK chars, no insert)
      expect(submitBtn.text()).toContain('ログ');
    });

    it('should render the 利用規約 link copy when mounted', async () => {
      const { wrapper } = await renderView();
      expect(wrapper.text()).toContain('利用規約');
    });

    it('should NOT render an error message before submit when mounted', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      // No `.ant-form-item-explain-error` until submit triggers validation.
      expect(wrapper.find('.ant-form-item-explain-error').exists()).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // §14 / §15 — お知らせ読込
  // ───────────────────────────────────────────────────────────────────
  describe('お知らせ list (§14-15)', () => {
    it('should call fetchPublicOshirase with publish_location=1 + limit=10 when mounted', async () => {
      await renderView();
      await flushPromises();
      expect(authApi.fetchPublicOshirase).toHaveBeenCalledWith(1, 10);
    });

    it('should render notice titles and YYYY.MM.DD dates when fetch returns items', async () => {
      vi.mocked(authApi.fetchPublicOshirase).mockResolvedValue([
        buildPublicOshirase({
          publish_start_date: '2026-04-10',
          title: 'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
        }),
        buildPublicOshirase({
          oshirase_id: 2,
          publish_start_date: '2026-04-05',
          title: '新機能リリースのお知らせ',
        }),
      ]);

      const { wrapper } = await renderView();
      await flushPromises();

      // Date format §15.3: YYYY.MM.DD (dots, not dashes).
      expect(wrapper.text()).toContain('2026.04.10');
      expect(wrapper.text()).toContain('システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）');
      expect(wrapper.text()).toContain('新機能リリースのお知らせ');
    });

    it('should render the empty お知らせはありません copy when no notices match', async () => {
      vi.mocked(authApi.fetchPublicOshirase).mockResolvedValue([]);
      const { wrapper } = await renderView();
      await flushPromises();
      expect(wrapper.text()).toContain('お知らせはありません');
    });

    it('should NOT block login form when fetchPublicOshirase rejects (§14.4)', async () => {
      vi.mocked(authApi.fetchPublicOshirase).mockRejectedValue({
        response: { data: { error_code: 'INTERNAL_SERVER_ERROR' } },
      });

      const { wrapper } = await renderView();
      await flushPromises();

      // Form is still usable.
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
      // Empty notices block does NOT propagate an unhandled rejection.
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // §2 / §3 / §4.1-4.2 — Client-side validation
  // ───────────────────────────────────────────────────────────────────
  describe('client-side validation (§2.1, §3.1, §4.1)', () => {
    it('should show ユーザーIDを入力してください。 when login_id is blank on submit (ACSMS-MSG-001-001)', async () => {
      const { wrapper } = await renderView();
      await flushPromises();

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toContain('ユーザーIDを入力してください。');
      // Must NOT call API when client validation fails.
      expect(authApi.login).not.toHaveBeenCalled();
    });

    it('should show パスワードを入力してください。 when password is blank on submit (ACSMS-MSG-001-002)', async () => {
      const { wrapper } = await renderView();
      await flushPromises();

      // Fill login_id only — password blank.
      const loginInput = wrapper.find('input[autocomplete="username"]');
      await loginInput.setValue('admin01');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toContain('パスワードを入力してください。');
      expect(authApi.login).not.toHaveBeenCalled();
    });

    it('should NOT show エラーが発生しました when login_id is blank (regression: §validateClient)', async () => {
      // Guards against a defensive crash in validateClient — blank fields
      // must produce the friendly message, never the generic system error.
      const { wrapper } = await renderView();
      await flushPromises();

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).not.toContain('エラーが発生しました');
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // §4 — Submit happy + MFA branch
  // ───────────────────────────────────────────────────────────────────
  describe('submit (§4)', () => {
    async function fillForm(wrapper: ReturnType<typeof mount>): Promise<void> {
      await wrapper.find('input[autocomplete="username"]').setValue('admin01');
      await wrapper.find('input[autocomplete="current-password"]').setValue('P@ssw0rd123');
    }

    it('should call authApi.login with the form payload when fields are filled and submitted (§4.4)', async () => {
      vi.mocked(authApi.login).mockResolvedValue(buildLoginNoMfaResponse());
      const { wrapper } = await renderView();
      await flushPromises();

      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(authApi.login).toHaveBeenCalledWith({
        login_id: 'admin01',
        password: 'P@ssw0rd123',
      });
    });

    it('should navigate to /dashboard when login resolves with mfa_required=false (§4.7)', async () => {
      vi.mocked(authApi.login).mockResolvedValue(buildLoginNoMfaResponse());
      const { wrapper, router } = await renderView();
      const pushSpy = vi.spyOn(router, 'push');
      await flushPromises();

      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
      expect(pushed).toContain('Dashboard');
    });

    it('should navigate to the redirect query param when present and MFA is not required', async () => {
      vi.mocked(authApi.login).mockResolvedValue(buildLoginNoMfaResponse());
      const { wrapper, router } = await renderView({ redirect: '/ja' });
      const pushSpy = vi.spyOn(router, 'push');
      await flushPromises();

      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
      expect(pushed).toContain('/ja');
    });

    it('should toast ログインしました success when login completes without MFA', async () => {
      vi.mocked(authApi.login).mockResolvedValue(buildLoginNoMfaResponse());
      const { wrapper } = await renderView();
      await flushPromises();

      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(message.success).toHaveBeenCalledWith('ログインしました。');
    });

    it('should navigate to MfaVerify with mfa_token query when MFA is required (§4.8)', async () => {
      vi.mocked(authApi.login).mockResolvedValue(
        buildLoginMfaResponse({ mfa_token: 'tok-abc' }),
      );
      const { wrapper, router } = await renderView();
      const pushSpy = vi.spyOn(router, 'push');
      await flushPromises();

      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
      expect(pushed).toContain('MfaVerify');
      expect(pushed).toContain('tok-abc');
    });

    it('should NOT toast success when API resolves with MFA required (§4.8 — auth not yet complete)', async () => {
      vi.mocked(authApi.login).mockResolvedValue(buildLoginMfaResponse());
      const { wrapper } = await renderView();
      await flushPromises();

      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(message.success).not.toHaveBeenCalled();
    });

    it('should NOT navigate when login API rejects with INVALID_CREDENTIALS (§4.6)', async () => {
      // Global axios interceptor toasts; the view just stays put for retry.
      vi.mocked(authApi.login).mockRejectedValue({
        response: { data: { error_code: 'INVALID_CREDENTIALS' } },
      });
      const { wrapper, router } = await renderView();
      const pushSpy = vi.spyOn(router, 'push');
      await flushPromises();

      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('should map server VALIDATION_ERROR errors into field-level help when API rejects', async () => {
      vi.mocked(authApi.login).mockRejectedValue({
        response: {
          data: {
            error_code: 'VALIDATION_ERROR',
            message: '入力値が不正です',
            errors: [
              { field: 'login_id', message: 'ユーザーIDの形式が不正です' },
            ],
          },
        },
      });
      const { wrapper } = await renderView();
      await flushPromises();

      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toContain('ユーザーIDの形式が不正です');
    });
  });
});

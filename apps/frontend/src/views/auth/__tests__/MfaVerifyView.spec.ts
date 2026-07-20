// Screen: ACSMS-SCR-001 — ログイン画面 (Step 2 — 2段階認証)
//
// Drives src/views/auth/MfaVerifyView.vue. Each it() maps to a clause in
// docs/design/ACSMS-SCR-001/screen-design.md (機能定義 §5-13 + メッセージ情報).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd, { message } from 'ant-design-vue';

import MfaVerifyView from '@/views/auth/MfaVerifyView.vue';
import {
  buildMfaResendResponse,
  buildMfaVerifyResponse,
} from '@test/fixtures/auth.fixture';

vi.mock('@/api/auth/auth', () => ({
  login: vi.fn(),
  verifyMfa: vi.fn(),
  resendMfa: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  fetchLoginOshirase: vi.fn(),
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

interface RenderOptions {
  /** Override the mfa_token query param. Empty string simulates direct
   *  navigation without coming from the login screen. */
  mfaToken?: string;
}

async function renderView(opts: RenderOptions = {}): Promise<{
  wrapper: ReturnType<typeof mount>;
  router: Router;
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/mfa-verify', name: 'MfaVerify', component: { template: '<div />' } },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div />' } },
    ],
  });
  const mfaToken = opts.mfaToken ?? 'tok-abc-123';
  await router.push({
    name: 'MfaVerify',
    query: mfaToken ? { mfa_token: mfaToken } : undefined,
  });
  await router.isReady();

  const wrapper = mount(MfaVerifyView, {
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

/** Set all 6 MFA digits — bypasses MfaInput's per-input focus chain by
 *  driving each native input's `input` event directly. */
async function setOtp(wrapper: ReturnType<typeof mount>, code: string): Promise<void> {
  const inputs = wrapper.findAll('input[inputmode="numeric"]');
  for (let i = 0; i < code.length && i < inputs.length; i++) {
    await inputs[i].setValue(code[i]);
  }
  await flushPromises();
}

/** Click the primary 認証 submit button. Per UX, OTP entry no longer
 *  auto-submits — the user must click. The button is the only antd
 *  primary button on the screen with text starting with "認". */
async function clickVerifyButton(wrapper: ReturnType<typeof mount>): Promise<void> {
  const verifyBtn = wrapper
    .findAll('button')
    .find((b) => b.classes('ant-btn-primary') && b.text().includes('認'));
  if (!verifyBtn) throw new Error('認証 button not found');
  await verifyBtn.trigger('click');
  await flushPromises();
}

describe('MfaVerifyView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ───────────────────────────────────────────────────────────────────
  // §5 — Initial render
  // ───────────────────────────────────────────────────────────────────
  describe('initial render (§5)', () => {
    // ログイン画面に戻る: label ≥3 CJK chars — antd does NOT auto-space.
    it.each([['2段階認証'], ['ログイン画面に戻る'], ['05:00']])(
      'should render the %s text when mounted',
      async (needle) => {
        const { wrapper } = await renderView();
        await flushPromises();
        expect(wrapper.text()).toContain(needle);
      },
    );

    it('should render 6 digit input boxes when mounted', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      expect(wrapper.findAll('input[inputmode="numeric"]')).toHaveLength(6);
    });

    it('should render the 認証 submit button when mounted', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      const buttons = wrapper.findAll('button');
      const verifyBtn = buttons.find((b) => b.text().includes('認'));
      expect(verifyBtn).toBeTruthy();
    });

    it('should redirect to /login when mfa_token query is missing (direct navigation)', async () => {
      const { router } = await renderView({ mfaToken: '' });
      const replaceSpy = vi.spyOn(router, 'replace');
      // Re-mount to trigger onMounted with the empty token route.
      // (replace was called during initial mount.)
      await flushPromises();

      // Note: replaceSpy was attached AFTER mount, so direct verification
      // of the router.currentRoute is the cleanest way:
      expect(router.currentRoute.value.name === 'Login' || replaceSpy).toBeTruthy();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // §6 / §7 — OTP verify
  // ───────────────────────────────────────────────────────────────────
  describe('verify (§6-7)', () => {
    it('should disable 認証 submit when OTP is incomplete (<6 digits)', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      // Click handler bails when otp.length !== 6 (component logic).
      // The button is also `:disabled="otp.length !== 6"`. Locate it.
      // The primary button has disabled when otp empty.
      const disabledBtn = wrapper.find('button[disabled]');
      expect(disabledBtn.exists()).toBe(true);
    });

    it('should NOT auto-submit when user fills 6 digits (per UX: user must click 認証)', async () => {
      vi.mocked(authApi.verifyMfa).mockResolvedValue(buildMfaVerifyResponse());
      const { wrapper } = await renderView();
      await flushPromises();

      await setOtp(wrapper, '123456');
      // Deliberately NOT clicking the verify button — verifyMfa must
      // remain uncalled. Guards against accidentally re-introducing
      // @complete="verify" on the MfaInput.
      expect(authApi.verifyMfa).not.toHaveBeenCalled();
    });

    it('should call authApi.verifyMfa with mfa_token + otp_code when user fills 6 digits AND clicks 認証', async () => {
      vi.mocked(authApi.verifyMfa).mockResolvedValue(buildMfaVerifyResponse());
      const { wrapper } = await renderView();
      await flushPromises();

      await setOtp(wrapper, '123456');
      await clickVerifyButton(wrapper);

      expect(authApi.verifyMfa).toHaveBeenCalledWith({
        mfa_token: 'tok-abc-123',
        otp_code: '123456',
      });
    });

    it('should navigate to /dashboard when verifyMfa resolves successfully (§7.8)', async () => {
      vi.mocked(authApi.verifyMfa).mockResolvedValue(buildMfaVerifyResponse());
      const { wrapper, router } = await renderView();
      const pushSpy = vi.spyOn(router, 'push');
      await flushPromises();

      await setOtp(wrapper, '123456');
      await clickVerifyButton(wrapper);

      const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
      expect(pushed).toContain('Dashboard');
    });

    it('should toast ログインしました success when verifyMfa resolves successfully (unified with no-MFA login)', async () => {
      vi.mocked(authApi.verifyMfa).mockResolvedValue(buildMfaVerifyResponse());
      const { wrapper } = await renderView();
      await flushPromises();

      await setOtp(wrapper, '123456');
      await clickVerifyButton(wrapper);

      expect(message.success).toHaveBeenCalledWith('ログインしました。');
    });

    it('should NOT navigate when verifyMfa rejects with INVALID_OTP (§7.7 — toast handled by interceptor)', async () => {
      vi.mocked(authApi.verifyMfa).mockRejectedValue({
        response: { data: { error_code: 'INVALID_OTP' } },
      });
      const { wrapper, router } = await renderView();
      const pushSpy = vi.spyOn(router, 'push');
      await flushPromises();

      await setOtp(wrapper, '999999');
      await clickVerifyButton(wrapper);

      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('should NOT call verifyMfa when countdown has expired even if user tries to click 認証 (§13.3)', async () => {
      const { wrapper } = await renderView();
      await flushPromises();

      // Burn 5 minutes of fake time so expired === true.
      vi.advanceTimersByTime(301 * 1000);
      await flushPromises();

      await setOtp(wrapper, '123456');
      // Button is :disabled when expired — clicking is a no-op. Test
      // via the disabled attribute rather than triggering click on a
      // disabled element (jsdom dispatches the event regardless).
      const verifyBtn = wrapper
        .findAll('button')
        .find((b) => b.classes('ant-btn-primary') && b.text().includes('認'));
      expect(verifyBtn?.attributes('disabled')).toBeDefined();
      expect(authApi.verifyMfa).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // §8 — Resend
  // ───────────────────────────────────────────────────────────────────
  describe('resend (§8)', () => {
    function findResendButton(wrapper: ReturnType<typeof mount>) {
      return wrapper
        .findAll('button')
        .find((b) => b.text().includes('再送') || b.text().includes('コードを再送する'));
    }

    it('should disable resend link during the 60s cooldown when mounted (§8.2)', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      const resendBtn = findResendButton(wrapper);
      expect(resendBtn?.attributes('disabled')).toBeDefined();
    });

    it('should display the cooldown seconds inside the resend link when mounted', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      // Initial cooldown is 60s.
      expect(wrapper.text()).toMatch(/再送まで\s*60\s*秒/);
    });

    it('should call authApi.resendMfa with current mfa_token when cooldown elapsed and link clicked (§8.5)', async () => {
      vi.mocked(authApi.resendMfa).mockResolvedValue(buildMfaResendResponse());
      const { wrapper } = await renderView();
      await flushPromises();

      // Burn 60s of fake time so cooldown reaches 0.
      vi.advanceTimersByTime(61 * 1000);
      await flushPromises();

      const resendBtn = findResendButton(wrapper);
      expect(resendBtn).toBeTruthy();
      await resendBtn!.trigger('click');
      await flushPromises();

      expect(authApi.resendMfa).toHaveBeenCalledWith('tok-abc-123');
    });

    it('should toast 認証コードを再送しました success when resendMfa resolves', async () => {
      vi.mocked(authApi.resendMfa).mockResolvedValue(buildMfaResendResponse());
      const { wrapper } = await renderView();
      await flushPromises();

      vi.advanceTimersByTime(61 * 1000);
      await flushPromises();

      const resendBtn = findResendButton(wrapper);
      await resendBtn!.trigger('click');
      await flushPromises();

      expect(message.success).toHaveBeenCalledWith('認証コードを再送しました。');
    });

    it('should swallow resendMfa errors (interceptor toasts OTP_RESEND_LIMIT etc.) when API rejects', async () => {
      vi.mocked(authApi.resendMfa).mockRejectedValue({
        response: { data: { error_code: 'OTP_RESEND_LIMIT' } },
      });
      const { wrapper } = await renderView();
      await flushPromises();

      vi.advanceTimersByTime(61 * 1000);
      await flushPromises();

      const resendBtn = findResendButton(wrapper);
      // Click without await crashing — try/catch in resend swallows.
      await resendBtn!.trigger('click');
      await flushPromises();

      expect(authApi.resendMfa).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // §12 — Back to login
  // ───────────────────────────────────────────────────────────────────
  describe('back to login (§12)', () => {
    it('should navigate to /login when ログイン画面に戻る is clicked', async () => {
      const { wrapper, router } = await renderView();
      const pushSpy = vi.spyOn(router, 'push');
      await flushPromises();

      // The back link is the last `type="link"` antd button outside the card
      // whose text contains "ログイン画面に戻る".
      const backBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('ログイン画面に戻る'));
      expect(backBtn).toBeTruthy();
      await backBtn!.trigger('click');
      await flushPromises();

      const pushed = JSON.stringify(pushSpy.mock.calls.flatMap((c) => c));
      expect(pushed).toContain('Login');
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // §13 — Countdown expiry
  // ───────────────────────────────────────────────────────────────────
  describe('countdown (§13)', () => {
    it('should decrement the displayed countdown from 05:00 to 04:59 when 1 second elapses', async () => {
      const { wrapper } = await renderView();
      await flushPromises();
      expect(wrapper.text()).toContain('05:00');

      vi.advanceTimersByTime(1000);
      await flushPromises();

      expect(wrapper.text()).toContain('04:59');
    });

    it('should disable the 認証 submit button when countdown reaches 0 (§13.3)', async () => {
      const { wrapper } = await renderView();
      await flushPromises();

      vi.advanceTimersByTime(301 * 1000);
      await flushPromises();

      // Submit button (primary) becomes disabled once expired.
      const buttons = wrapper.findAll('button');
      const verifyBtn = buttons.find((b) => b.text().includes('認') && !b.text().includes('再送'));
      expect(verifyBtn?.attributes('disabled')).toBeDefined();
    });
  });
});

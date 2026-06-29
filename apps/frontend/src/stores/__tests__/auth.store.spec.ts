// Screen: ACSMS-SCR-001 — ログイン画面
//
// Drives src/stores/auth.store.ts. Each describe block maps to one of the
// store actions: login, verifyMfa, resendMfa, refreshSession, logout +
// hasPermission. The store wraps `@/api/auth/auth`, which is mocked here
// (no real HTTP). The `codes` store side-effect is a no-op stub.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import {
  buildUser,
  buildLoginMfaResponse,
  buildLoginNoMfaResponse,
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
  toggleMfa: vi.fn(),
}));

// Singleton mock so tests can assert reset() / loadAll() were invoked
// across the auth-store actions that proxy to the codes cache.
const codesLoadAll = vi.fn().mockResolvedValue(undefined);
const codesReset = vi.fn();
vi.mock('@/stores/codes.store', () => ({
  useCodesStore: () => ({
    loadAll: codesLoadAll,
    reset: codesReset,
  }),
}));

import * as authApi from '@/api/auth/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────
  // login
  // ───────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should cache the user and return mfa_required=false when API returns user payload', async () => {
      vi.mocked(authApi.login).mockResolvedValue(buildLoginNoMfaResponse());
      const store = useAuthStore();

      const result = await store.login({ login_id: 'admin01', password: 'P@ssw0rd123' });

      expect(result.mfa_required).toBe(false);
      if (!result.mfa_required) {
        expect(result.user.login_id).toBe('admin01');
      }
      expect(store.user?.login_id).toBe('admin01');
      expect(store.isAuthenticated).toBe(true);
      expect(authApi.login).toHaveBeenCalledWith({
        login_id: 'admin01',
        password: 'P@ssw0rd123',
      });
    });

    it('should NOT cache user and return mfa_token when API responds with mfa_required=true', async () => {
      vi.mocked(authApi.login).mockResolvedValue(buildLoginMfaResponse());
      const store = useAuthStore();

      const result = await store.login({ login_id: 'chuokai01', password: 'P@ssw0rd123' });

      expect(result.mfa_required).toBe(true);
      if (result.mfa_required) {
        expect(result.mfa_token).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.expires_in).toBe(300);
      }
      // No user cached until OTP is verified.
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it('should propagate API errors when login rejects (interceptor handles toast)', async () => {
      vi.mocked(authApi.login).mockRejectedValue({
        response: { data: { error_code: 'INVALID_CREDENTIALS', message: 'wrong' } },
      });
      const store = useAuthStore();

      await expect(
        store.login({ login_id: 'admin01', password: 'wrong-pass' }),
      ).rejects.toBeDefined();
      expect(store.user).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // verifyMfa
  // ───────────────────────────────────────────────────────────────────
  describe('verifyMfa', () => {
    it('should cache the user when verifyMfa API returns user payload', async () => {
      vi.mocked(authApi.verifyMfa).mockResolvedValue(buildMfaVerifyResponse());
      const store = useAuthStore();

      const user = await store.verifyMfa(
        '550e8400-e29b-41d4-a716-446655440000',
        '123456',
      );

      expect(user.login_id).toBe('admin01');
      expect(store.user?.login_id).toBe('admin01');
      expect(store.isAuthenticated).toBe(true);
      expect(authApi.verifyMfa).toHaveBeenCalledWith({
        mfa_token: '550e8400-e29b-41d4-a716-446655440000',
        otp_code: '123456',
      });
    });

    it('should propagate API errors when verifyMfa rejects', async () => {
      vi.mocked(authApi.verifyMfa).mockRejectedValue({
        response: { data: { error_code: 'INVALID_OTP' } },
      });
      const store = useAuthStore();

      await expect(store.verifyMfa('token', '999999')).rejects.toBeDefined();
      expect(store.user).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // resendMfa
  // ───────────────────────────────────────────────────────────────────
  describe('resendMfa', () => {
    it('should pass mfa_token through to API and return the new token payload when called', async () => {
      vi.mocked(authApi.resendMfa).mockResolvedValue(buildMfaResendResponse());
      const store = useAuthStore();

      const result = await store.resendMfa('old-token');

      expect(result).toEqual({
        mfa_token: '660e8400-e29b-41d4-a716-446655440001',
        expires_in: 300,
        resend_count: 2,
        max_resend: 3,
      });
      expect(authApi.resendMfa).toHaveBeenCalledWith('old-token');
    });

    it('should NOT touch the user state when resendMfa is called (still pre-auth)', async () => {
      vi.mocked(authApi.resendMfa).mockResolvedValue(buildMfaResendResponse());
      const store = useAuthStore();

      await store.resendMfa('old-token');

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // refreshSession
  // ───────────────────────────────────────────────────────────────────
  describe('refreshSession', () => {
    it('should set the user from refresh API and return true when session is valid', async () => {
      vi.mocked(authApi.refresh).mockResolvedValue({ user: buildUser() });
      const store = useAuthStore();

      const ok = await store.refreshSession();

      expect(ok).toBe(true);
      expect(store.user?.login_id).toBe('admin01');
      expect(store.isAuthenticated).toBe(true);
    });

    it('should clear the user and return false when refresh API rejects (cookie expired)', async () => {
      vi.mocked(authApi.refresh).mockRejectedValue({
        response: { data: { error_code: 'UNAUTHORIZED' } },
      });
      const store = useAuthStore();
      // Pre-seed a user — refresh failure must wipe it.
      store.user = buildUser();

      const ok = await store.refreshSession();

      expect(ok).toBe(false);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // logout
  // ───────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('should clear the user when logout API succeeds', async () => {
      vi.mocked(authApi.logout).mockResolvedValue(undefined);
      const store = useAuthStore();
      store.user = buildUser();

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(authApi.logout).toHaveBeenCalled();
    });

    it('should still clear the user when logout API rejects (defensive: try/finally)', async () => {
      vi.mocked(authApi.logout).mockRejectedValue(new Error('network down'));
      const store = useAuthStore();
      store.user = buildUser();

      // Logout swallow-and-clear is safe: even if the cookie can't be
      // explicitly cleared server-side, the client must drop its cached
      // user immediately so the user re-authenticates.
      await expect(store.logout()).rejects.toBeDefined();
      expect(store.user).toBeNull();
    });

    it('should also reset the codes store on logout (next user must not inherit cache)', async () => {
      vi.mocked(authApi.logout).mockResolvedValue(undefined);
      const store = useAuthStore();
      store.user = buildUser();

      await store.logout();

      expect(codesReset).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // clearSession
  // ───────────────────────────────────────────────────────────────────
  describe('clearSession', () => {
    it('should null out user', () => {
      const store = useAuthStore();
      store.user = buildUser();
      store.clearSession();
      expect(store.user).toBeNull();
    });

    it('should also reset the codes store so next sign-in re-fetches m_code', () => {
      const store = useAuthStore();
      store.user = buildUser();
      store.clearSession();
      expect(codesReset).toHaveBeenCalled();
    });

    it('should flip isAuthenticated to false', () => {
      const store = useAuthStore();
      store.user = buildUser();
      expect(store.isAuthenticated).toBe(true);
      store.clearSession();
      expect(store.isAuthenticated).toBe(false);
    });

    it('should be idempotent — calling twice does not throw', () => {
      const store = useAuthStore();
      store.clearSession();
      expect(() => store.clearSession()).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // toggleMfa
  // ───────────────────────────────────────────────────────────────────
  describe('toggleMfa', () => {
    it('should update user.mfa_enable_flg to true when API resolves with enabled=true', async () => {
      vi.mocked(authApi.toggleMfa).mockResolvedValue({
        mfa_enable_flg: true,
        message: '2段階認証を有効にしました。',
      });
      const store = useAuthStore();
      store.user = buildUser({ mfa_enable_flg: false });

      const result = await store.toggleMfa(true);

      expect(result).toBe(true);
      expect(store.user?.mfa_enable_flg).toBe(true);
      expect(authApi.toggleMfa).toHaveBeenCalledWith(true);
    });

    it('should update user.mfa_enable_flg to false when API resolves with enabled=false', async () => {
      vi.mocked(authApi.toggleMfa).mockResolvedValue({
        mfa_enable_flg: false,
        message: '2段階認証を無効にしました。',
      });
      const store = useAuthStore();
      store.user = buildUser({ mfa_enable_flg: true });

      const result = await store.toggleMfa(false);

      expect(result).toBe(false);
      expect(store.user?.mfa_enable_flg).toBe(false);
    });

    it('should propagate API errors when toggleMfa rejects', async () => {
      vi.mocked(authApi.toggleMfa).mockRejectedValue({
        response: { data: { error_code: 'INTERNAL_SERVER_ERROR' } },
      });
      const store = useAuthStore();
      store.user = buildUser({ mfa_enable_flg: false });

      await expect(store.toggleMfa(true)).rejects.toBeDefined();
      // State unchanged on failure.
      expect(store.user?.mfa_enable_flg).toBe(false);
    });

    it('should be a no-op on user state when no user is logged in (defensive)', async () => {
      vi.mocked(authApi.toggleMfa).mockResolvedValue({
        mfa_enable_flg: true,
        message: '2段階認証を有効にしました。',
      });
      const store = useAuthStore();
      store.user = null;

      const result = await store.toggleMfa(true);

      expect(result).toBe(true);
      expect(store.user).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // hasPermission
  // ───────────────────────────────────────────────────────────────────
  describe('hasPermission', () => {
    it('should return false when user is null (logged out)', () => {
      const store = useAuthStore();
      expect(store.hasPermission('dokusya.view')).toBe(false);
    });

    it('should return true when the user has the requested permission code', () => {
      const store = useAuthStore();
      store.user = buildUser({ permissions: ['dokusya.view', 'tanka.view'] });
      expect(store.hasPermission('dokusya.view')).toBe(true);
    });

    it('should return false when the user does NOT have the requested permission code', () => {
      const store = useAuthStore();
      store.user = buildUser({ permissions: ['dokusya.view'] });
      expect(store.hasPermission('account.delete')).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // isAuthenticated (computed)
  // ───────────────────────────────────────────────────────────────────
  describe('isAuthenticated', () => {
    it('should be false when no user is cached', () => {
      const store = useAuthStore();
      expect(store.isAuthenticated).toBe(false);
    });

    it('should be true when a user is cached', () => {
      const store = useAuthStore();
      store.user = buildUser();
      expect(store.isAuthenticated).toBe(true);
    });
  });
});

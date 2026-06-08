import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import * as authApi from '@/api/auth/auth';
import { useCodesStore } from '@/stores/codes.store';
import type { User } from '@/types';

/**
 * Auth store.
 *
 * Authentication is handled entirely by the HTTP-only session cookie issued
 * by the backend (Redis-backed, 24h sliding TTL). The session ID is not
 * accessible from JavaScript, so this store only keeps the decoded `user`
 * object — `isAuthenticated` is derived from its presence.
 */
export type LoginOutcome =
  | { mfa_required: true; mfa_token: string; expires_in: number }
  | { mfa_required: false; user: User };

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => !!user.value);

  async function login(credentials: {
    login_id: string;
    password: string;
  }): Promise<LoginOutcome> {
    const data = await authApi.login(credentials);
    if (data.mfa_required) {
      return {
        mfa_required: true,
        mfa_token: data.mfa_token,
        expires_in: data.expires_in,
      };
    }
    // Session cookie set by the server; we only cache the user info.
    user.value = data.user;
    await useCodesStore().loadAll();
    return { mfa_required: false, user: data.user };
  }

  async function verifyMfa(mfaToken: string, otpCode: string): Promise<User> {
    const data = await authApi.verifyMfa({ mfa_token: mfaToken, otp_code: otpCode });
    user.value = data.user;
    await useCodesStore().loadAll();
    return data.user;
  }

  async function resendMfa(mfaToken: string) {
    return authApi.resendMfa(mfaToken);
  }

  /**
   * Extend the session TTL and rehydrate the cached user payload.
   *
   * Called on:
   *  - App boot (main.ts) — cookie exists but Pinia is empty, need to
   *    ask the backend "who am I?" before the SPA can decide where to route.
   *  - Explicit re-sync when permissions/role may have changed server-side.
   *
   * NOT called on 401: with an HTTP-only session cookie there is no
   * recoverable state to refresh — the error handler redirects to /login
   * directly. Returns false if the session has already expired so the
   * boot path can send the user to /login.
   */
  async function refreshSession(): Promise<boolean> {
    try {
      const data = await authApi.refresh();
      user.value = data.user;
      await useCodesStore().loadAll();
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }

  /**
   * Drop all client-side session state. Called by:
   *   - `logout` (user-initiated)
   *   - `refreshSession` catch path (boot probe fails)
   *   - the axios error handler on 401 outside auth endpoints
   *
   * Always resets `codes.store` alongside `user` — without this, a fresh
   * login on the same tab would render labels from the previous user's
   * cached m_code rows (the codes store guards `loadAll` so it would
   * skip refetching while `all !== null`).
   */
  function clearSession(): void {
    user.value = null;
    useCodesStore().reset();
  }

  /**
   * Toggle the caller's own MFA flag. Updates `user.mfa_enable_flg`
   * on success so the header switch UI reflects the new state without
   * a full session refresh. Errors propagate to the caller; the global
   * axios interceptor toasts.
   */
  async function toggleMfa(enabled: boolean): Promise<boolean> {
    const result = await authApi.toggleMfa(enabled);
    if (user.value) {
      user.value.mfa_enable_flg = result.mfa_enable_flg;
    }
    return result.mfa_enable_flg;
  }

  function hasPermission(permission: string): boolean {
    return user.value?.permissions.includes(permission) ?? false;
  }

  return {
    user,
    isAuthenticated,
    login,
    verifyMfa,
    resendMfa,
    refreshSession,
    logout,
    clearSession,
    toggleMfa,
    hasPermission,
  };
});

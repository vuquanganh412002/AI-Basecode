import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import * as authApi from '@/api/auth/auth';
import type { User } from '@/types';

export type LoginOutcome =
  | { mfa_required: true; mfa_token: string; expires_in: number }
  | { mfa_required: false; user: User };

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null);
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

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
    accessToken.value = data.access_token;
    user.value = data.user;
    return { mfa_required: false, user: data.user };
  }

  async function verifyMfa(mfaToken: string, otpCode: string): Promise<User> {
    const data = await authApi.verifyMfa({ mfa_token: mfaToken, otp_code: otpCode });
    accessToken.value = data.access_token;
    user.value = data.user;
    return data.user;
  }

  async function resendMfa(mfaToken: string) {
    return authApi.resendMfa(mfaToken);
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const data = await authApi.refresh();
      accessToken.value = data.access_token;
      user.value = data.user;
      return true;
    } catch {
      accessToken.value = null;
      user.value = null;
      return false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      accessToken.value = null;
      user.value = null;
    }
  }

  function hasPermission(permission: string): boolean {
    return user.value?.permissions.includes(permission) ?? false;
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    login,
    verifyMfa,
    resendMfa,
    refreshToken,
    logout,
    hasPermission,
  };
});

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import * as authApi from '@/api/auth/auth';
import { useCodesStore } from '@/stores/codes.store';
import type { User } from '@/types';

/**
 * 認証ストア。
 *
 * 認証は BE 発行の HTTP-only セッション cookie（Redis 管理、24h スライド TTL）が
 * 全て担う。セッション ID は JS から読めないため、当ストアはデコード済み `user`
 * オブジェクトのみ保持し、`isAuthenticated` はその有無から導出。
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
    // セッション cookie はサーバーが設定。ここでは user 情報のみキャッシュ。
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
   * セッション TTL を延長し、キャッシュ済み user ペイロードを再水和。
   *
   * 呼び出し時:
   *  - アプリ起動時（main.ts）— cookie はあるが Pinia が空。ルーティング判断前に
   *    BE へ「自分は誰か」を問う必要がある。
   *  - 権限/ロールがサーバー側で変わり得る際の明示的な再同期。
   *
   * 401 では呼ばない: HTTP-only セッション cookie では復元可能な状態が無く、
   * error handler が直接 /login へリダイレクトする。セッション失効時は false を
   * 返し、起動パスが /login へ送れるように。
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
   * クライアント側セッション状態を全破棄。呼び出し元:
   *   - `logout`（ユーザー起点）
   *   - `refreshSession` の catch パス（起動プローブ失敗）
   *   - auth エンドポイント外での 401 時の axios error handler
   *
   * 常に `user` と併せて `codes.store` をリセット — これが無いと同一タブでの
   * 再ログインが前ユーザーのキャッシュ済み m_code 行からラベルを描画する
   * （codes store は `all !== null` の間 `loadAll` を skip するガードのため）。
   */
  function clearSession(): void {
    user.value = null;
    useCodesStore().reset();
  }

  /**
   * 呼び出し元自身の MFA フラグをトグル。成功時に `user.mfa_enable_flg` を更新し、
   * 完全なセッション更新無しでヘッダーのスイッチ UI に新状態を反映。
   * エラーは呼び出し元へ伝播し、グローバル axios interceptor がトースト表示。
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

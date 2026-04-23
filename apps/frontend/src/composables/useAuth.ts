import { useAuthStore } from '@/stores/auth.store';
import { storeToRefs } from 'pinia';

export function useAuth() {
  const authStore = useAuthStore();
  const { user, isAuthenticated } = storeToRefs(authStore);

  return {
    user,
    isAuthenticated,
    login: authStore.login,
    logout: authStore.logout,
    hasPermission: authStore.hasPermission,
  };
}

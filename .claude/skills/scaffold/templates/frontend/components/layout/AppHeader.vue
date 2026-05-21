<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import BaseIconButton from '@/components/common/BaseIconButton.vue';

const router = useRouter();
const { user, logout } = useAuth();

async function handleLogout(): Promise<void> {
  await logout();
  router.push({ name: 'Login' });
}
</script>

<template>
  <header
    class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 px-6 py-3 flex-shrink-0"
  >
    <BaseIconButton icon="notifications" aria-label="通知" badge />

    <a-dropdown :trigger="['click']" placement="bottomRight">
      <button
        type="button"
        class="flex items-center gap-2 pl-3 py-1 border-l border-slate-200 dark:border-slate-700 hover:text-primary transition-colors"
      >
        <div
          class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden"
        >
          <span class="material-icons text-slate-500">account_circle</span>
        </div>
        <span class="text-sm">
          {{ user?.loginId ?? 'ゲスト' }}
          <span v-if="user?.roleLabel" class="text-text-secondary">:{{ user.roleLabel }}</span>
        </span>
      </button>

      <template #overlay>
        <a-menu>
          <a-menu-item key="logout" @click="handleLogout">
            <span class="material-icons text-base mr-2">logout</span>
            ログアウト
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </header>
</template>

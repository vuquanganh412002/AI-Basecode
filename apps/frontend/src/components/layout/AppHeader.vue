<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useBreadcrumb } from '@/composables/useBreadcrumb';
import { useSidebar } from '@/composables/useSidebar';

const router = useRouter();
const { user, logout } = useAuth();
const { items: breadcrumbs } = useBreadcrumb();
const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar();

/** Page title = the last breadcrumb segment (e.g. 単価マスタ登録画面). */
const pageTitle = computed(() => breadcrumbs.value.at(-1)?.label ?? '');

/**
 * Show the breadcrumb only when the page has an intermediate level
 * (e.g. ホーム > マスタ管理 > 単価マスタ). Top-level pages like
 * メニュー画面 have just [ホーム, メニュー画面] — reference design
 * hides the breadcrumb in that case.
 */
const showBreadcrumb = computed(() => breadcrumbs.value.length > 2);

const displayName = computed(() => {
  const id = user.value?.login_id ?? 'ゲスト';
  const role = user.value?.role_name;
  return role ? `${id}:${role}` : id;
});

async function handleLogout(): Promise<void> {
  await logout();
  router.push({ name: 'Login' });
}
</script>

<template>
  <header class="flex justify-between items-center gap-4">
    <!-- Left: sidebar toggle + page title + breadcrumb -->
    <div class="flex items-center gap-3 min-w-0">
      <button
        type="button"
        :aria-label="sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'"
        :aria-expanded="sidebarOpen"
        class="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0"
        @click="toggleSidebar"
      >
        <span class="material-icons">{{ sidebarOpen ? 'menu_open' : 'menu' }}</span>
      </button>

      <div class="min-w-0">
        <h2 v-if="pageTitle" class="text-2xl font-bold truncate">{{ pageTitle }}</h2>
      <nav
        v-if="showBreadcrumb"
        aria-label="Breadcrumb"
        class="flex text-xs text-slate-400 mt-1"
      >
        <ol class="inline-flex items-center space-x-1">
          <li
            v-for="(item, idx) in breadcrumbs"
            :key="idx"
            class="flex items-center"
          >
            <span
              v-if="idx > 0"
              class="material-icons text-xs mx-1"
            >chevron_right</span>
            <span
              v-if="idx === breadcrumbs.length - 1"
              class="text-slate-600 dark:text-slate-300"
            >{{ item.label }}</span>
            <router-link
              v-else-if="item.to"
              :to="item.to"
              class="hover:text-primary transition-colors"
            >{{ item.label }}</router-link>
            <span v-else>{{ item.label }}</span>
          </li>
        </ol>
      </nav>
      </div>
    </div>

    <!-- Right: notifications + user -->
    <div class="flex items-center gap-4 flex-shrink-0">
      <div class="flex items-center gap-3">
        <button
          type="button"
          aria-label="通知"
          class="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
        >
          <span class="material-icons">notifications</span>
          <span
            class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"
          />
        </button>

        <a-dropdown :trigger="['click']" placement="bottomRight">
          <button
            type="button"
            class="flex items-center gap-2 sm:pl-2 sm:border-l border-slate-200 dark:border-slate-700 hover:text-primary transition-colors"
          >
            <div
              class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden"
            >
              <span class="material-icons text-slate-500">account_circle</span>
            </div>
            <span class="hidden sm:inline truncate max-w-[160px] lg:max-w-none">
              {{ displayName }}
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
      </div>
    </div>
  </header>
</template>

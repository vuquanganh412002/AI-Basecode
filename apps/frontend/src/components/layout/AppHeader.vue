<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Modal } from 'ant-design-vue';
import { useAuth } from '@/composables/useAuth';
import { useBreadcrumb } from '@/composables/useBreadcrumb';
import { useNotify } from '@/composables/useNotify';
import { useSidebar } from '@/composables/useSidebar';

const route = useRoute();
const router = useRouter();
const { user, logout, toggleMfa } = useAuth();
const { items: breadcrumbs } = useBreadcrumb();
const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar();
const notify = useNotify();

/** Page title = the last breadcrumb segment (e.g. 単価マスタ登録画面). */
const pageTitle = computed(() => breadcrumbs.value.at(-1)?.label ?? '');

/**
 * Show the breadcrumb when the page has any non-home segment, EXCEPT on
 * the dashboard (which IS the home target — `ホーム > メニュー画面`
 * would be self-referential).
 *
 * Per the project breadcrumb convention (`.claude/rules/vue.md`), list
 * pages have 2 levels (`ホーム > Xマスタ一覧`) and create/edit pages
 * have 3 (`ホーム > Xマスタ一覧 > Xマスタ登録画面`); both should show.
 */
const showBreadcrumb = computed(
  () => breadcrumbs.value.length > 1 && route.name !== 'Dashboard',
);

const displayName = computed(() => {
  const id = user.value?.login_id ?? 'ゲスト';
  const role = user.value?.role_name;
  return role ? `${id}:${role}` : id;
});

async function handleLogout(): Promise<void> {
  await logout();
  router.push({ name: 'Login' });
}

/**
 * Self-service MFA toggle. Opens a confirm modal so the click on the
 * switch isn't a one-tap accident — disabling MFA in particular is a
 * security-relevant action.
 *
 * NOTE: This is the v1 simple flow agreed with product — no OTP /
 * password re-verification. If the session cookie is stolen, an
 * attacker CAN disable MFA on the victim's account. Tracked as a
 * known limitation; v2 should require password-on-disable +
 * OTP-on-enable per industry standard (Google/GitHub/AWS pattern).
 */
const mfaEnabled = computed(() => user.value?.mfa_enable_flg ?? false);

function onMfaSwitchClick(): void {
  const next = !mfaEnabled.value;
  Modal.confirm({
    title: next ? '2段階認証を有効にしますか？' : '2段階認証を無効にしますか？',
    content: next
      ? '次回ログイン時から、メールに送信される6桁の認証コードの入力が必要になります。'
      : 'セキュリティ強度が低下します。次回ログイン時から認証コードの入力が不要になります。',
    okText: next ? '有効にする' : '無効にする',
    okType: next ? 'primary' : 'danger',
    cancelText: 'キャンセル',
    async onOk() {
      try {
        await toggleMfa(next);
        // Custom copy — `notify.updated()` would toast the generic
        // '更新しました。' which loses the on/off outcome the user
        // just confirmed. Per vue.md §useNotify exceptions, use
        // `success(text)` for state-changing toggles where the
        // direction is meaningful.
        notify.success(
          next ? '2段階認証を有効にしました。' : '2段階認証を無効にしました。',
        );
      } catch {
        // Global axios interceptor already toasted (500 / network).
      }
    },
  });
}
</script>

<template>
  <!-- Layout
       ──────────────────────────────────────────────────────────────
       │ ☰  JAマスタ登録画面            🔔  ⊕ admin:日農（管理者） │
       │    ホーム ▶ マスタ管理 ▶ JAマスタ登録画面                 │
       ──────────────────────────────────────────────────────────────
       Hamburger sits at the far left as its own flex item. Title +
       breadcrumb live inside ONE shared column to guarantee they
       start at the same X (no manual padding to chase). Right group
       (bell + user) sits at the far right. -->
  <header class="flex justify-between items-start gap-4">
    <button
      type="button"
      :aria-label="sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'"
      :aria-expanded="sidebarOpen"
      class="p-2 text-icon hover:text-primary hover:bg-surface-hover rounded-full transition-colors flex-shrink-0"
      @click="toggleSidebar"
    >
      <span class="material-icons">{{ sidebarOpen ? 'menu_open' : 'menu' }}</span>
    </button>

    <!-- Shared column: title (row 1) + breadcrumb (row 2) — both flush
         to the left of this container, so they perfectly line up. -->
    <div class="min-w-0 flex-1">
      <h2 v-if="pageTitle" class="text-2xl font-bold truncate">
        {{ pageTitle }}
      </h2>
      <nav
        v-if="showBreadcrumb"
        aria-label="Breadcrumb"
        class="flex text-xs text-text-secondary mt-1"
      >
        <ol class="inline-flex items-center space-x-1 m-0 pl-0 list-none">
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
              class="text-text-main"
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

    <div class="flex items-center gap-3 flex-shrink-0">
      <button
        type="button"
        aria-label="通知"
        class="p-2 text-icon hover:text-primary hover:bg-surface-hover rounded-full transition-colors relative"
      >
        <span class="material-icons">notifications</span>
        <span
          class="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-card"
        />
      </button>

      <a-dropdown :trigger="['click']" placement="bottomRight">
        <button
          type="button"
          class="flex items-center gap-2 sm:pl-2 sm:border-l border-border hover:text-primary transition-colors"
        >
          <div
            class="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden"
          >
            <span class="material-icons text-icon">account_circle</span>
          </div>
          <!-- leading-normal + py-0.5: preflight を読み込まない構成では line-height
               が詰まり、truncate(overflow:hidden) が "g/y/p" のディセンダを切る。
               行高に余裕を持たせ下端のはみ出しを防ぐ。 -->
          <span class="hidden sm:inline-block truncate max-w-[160px] lg:max-w-none leading-normal py-0.5">
            {{ displayName }}
          </span>
        </button>

        <template #overlay>
          <a-menu>
            <a-menu-item key="mfa" @click="onMfaSwitchClick">
              <div class="flex items-center justify-between gap-4 min-w-[200px]">
                <span class="flex items-center">
                  <span class="material-icons text-base mr-2">security</span>
                  2段階認証
                </span>
                <!-- :checked is one-way bound; the modal-confirm flow in
                     onMfaSwitchClick decides whether the store value
                     actually flips. NO @click handler on the switch
                     itself — antd-switch emits a custom (not DOM) event
                     so @click.stop would crash on the missing
                     stopPropagation. The bubbled DOM click reaches the
                     a-menu-item handler above. -->
                <a-switch
                  :checked="mfaEnabled"
                  size="small"
                />
              </div>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout" @click="handleLogout">
              <span class="material-icons text-base mr-2">logout</span>
              ログアウト
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </header>
</template>

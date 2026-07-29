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

/** ページタイトル = パンくずの末尾セグメント（例: 単価マスタ登録画面）。 */
const pageTitle = computed(() => breadcrumbs.value.at(-1)?.label ?? '');

/**
 * ホーム以外のセグメントがあればパンくずを表示。ただしダッシュボードは除く
 * （ホームそのものなので `ホーム > メニュー画面` は自己参照になる）。
 *
 * プロジェクトのパンくず規約（`.claude/rules/vue.md`）では一覧ページは 2 階層
 * （`ホーム > Xマスタ一覧`）、新規/編集ページは 3 階層（`ホーム > Xマスタ一覧 > Xマスタ登録画面`）。
 * いずれも表示する。
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
 * セルフサービスの MFA 切替。スイッチのワンタップ誤操作を防ぐため確認モーダルを開く
 * — 特に MFA 無効化はセキュリティ上重要な操作。
 *
 * NOTE: これはプロダクトと合意した v1 の簡易フロー — OTP / パスワード再認証なし。
 * セッション Cookie を盗まれると攻撃者は被害者アカウントの MFA を無効化できる。既知の制約として
 * 管理中。v2 では業界標準（Google/GitHub/AWS パターン）に従い、無効化時パスワード +
 * 有効化時 OTP を要求すべき。
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
        // カスタム文言 — `notify.updated()` は汎用の '更新しました。' を出し、ユーザーが
        // 確認した on/off の結果が失われる。vue.md §useNotify 例外に従い、方向が意味を持つ
        // 状態切替では `success(text)` を使う。
        notify.success(
          next ? '2段階認証を有効にしました。' : '2段階認証を無効にしました。',
        );
      } catch {
        // グローバル axios インターセプタがトースト済み（500 / ネットワーク）。
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
       ハンバーガーは独立した flex 要素として左端に配置。タイトル + パンくずは
       同じ X 座標から始まるよう 1 つの共有カラム内に置く（手動 padding 調整不要）。
       右グループ（ベル + ユーザー）は右端に配置。 -->
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

    <!-- 共有カラム: タイトル（1 行目）+ パンくず（2 行目）— 両方このコンテナの
         左端に揃うので位置が完全に一致する。 -->
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
                <!-- :checked は一方向バインド。実際に store 値を反転するかは
                     onMfaSwitchClick のモーダル確認フローが決める。スイッチ自体に
                     @click ハンドラは付けない — antd-switch は DOM でなくカスタムイベントを
                     emit するため @click.stop は stopPropagation 欠如でクラッシュする。
                     バブリングした DOM click が上の a-menu-item ハンドラに届く。 -->
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

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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

/**
 * 表示形式: account_name (login_ID): role_name（顧客CR 2026-08-24）。
 * 未ログイン時は login_id が無いので「ゲスト」のみ表示する。
 */
const displayName = computed(() => {
  if (!user.value) return 'ゲスト';
  return `${user.value.account_name} (${user.value.login_id}): ${user.value.role_name}`;
});

/**
 * ヘッダーにアカウント名を出せる最小幅（px）。ヘッダー行の内訳:
 *   ハンバーガー 40 + gap 16
 *   右グループ ≈260（区切り/pl 8 + アバター32 + gap8 + 名前 max200 + gap12）
 *   タイトル欄は最長级の「統廃合販売店読者移行」(24px×10 ≈240px) が入る幅がほしい
 * → 40 + 16 + 240 + 16 + 260 ≈ 570。余裕を見て 640。
 *
 * 896 だと iPad + サイドバー展開（実幅 ≈842px）で名前が出ず、ヘッダーに
 * 明らかな余白があるのに隠れていた（顧客指摘 2026-08）。640 なら
 * 1024px 縦 + サイドバー展開（実幅 672px）でも名前とタイトルが両立する。
 */
const NAME_MIN_WIDTH = 640;

const headerEl = ref<HTMLElement | null>(null);
const headerWidth = ref(0);

/**
 * ヘッダーに名前を出せるか。出せるときはドロップダウン側の複製を消し、
 * 出せないときだけドロップダウンに出す（顧客要望 2026-08）。
 *
 * CSS のコンテナクエリで書けない理由: ドロップダウンの overlay は antd が
 * `document.body` へ teleport するため、MainLayout の `@container` の外に出る。
 * `@4xl:hidden` を書いてもコンテナ祖先が無く常に不一致になる。
 * かといってビューポート幅で代用すると、1024px + サイドバー展開のときに
 * 「ヘッダーは実幅672pxなので隠す／ドロップダウンはビューポート1024pxなので隠す」
 * となり *どこにも出ない* 事故が起きる。実幅を1か所で測り両者を同じ条件で
 * 切り替える。
 */
const canShowNameInHeader = computed(() => headerWidth.value >= NAME_MIN_WIDTH);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!headerEl.value) return;
  // 初期値は同期で取る。ResizeObserver の初回コールバックを待つと
  // 1フレームぶん名前が消えたまま描画され、ちらつく。
  headerWidth.value = headerEl.value.offsetWidth;
  // jsdom には ResizeObserver が無い。未定義なら offsetWidth（jsdom では 0）の
  // まま＝ドロップダウン側に名前が出るので、機能的には破綻しない。
  if (typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver((entries) => {
    headerWidth.value = entries[0]?.contentRect.width ?? 0;
  });
  resizeObserver.observe(headerEl.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
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
       │ ☰  JAマスタ登録画面    ⊕ 管理者太郎 (admin01): 日農（管理者） │
       │    ホーム ▶ マスタ管理 ▶ JAマスタ登録画面                 │
       ──────────────────────────────────────────────────────────────
       ハンバーガーは独立した flex 要素として左端に配置。タイトル + パンくずは
       同じ X 座標から始まるよう 1 つの共有カラム内に置く（手動 padding 調整不要）。
       右グループ（ユーザー）は右端に配置。ベル（通知）アイコンは顧客CR
       (2026-08-24) により削除済み。 -->
  <header ref="headerEl" class="flex justify-between items-start gap-4">
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
      <!-- 狭幅では `truncate` で「販売店…」と省略されるため、全文を title に持たせる。 -->
      <h2 v-if="pageTitle" class="text-2xl font-bold truncate" :title="pageTitle">
        {{ pageTitle }}
      </h2>
      <!-- パンくずは幅が足りなくても必ず 1 行に保つ（顧客要望 2026-08）。
           `<li>` は flex アイテムなので既定(min-width:auto より縮む
           flex-shrink:1)だと親幅に合わせて縮められ、スマホ幅では各項目の
           中で「ホー / ム」「購読者明 / 細検索」のように文字が折り返っていた。
           shrink-0 + whitespace-nowrap で縮小と改行を止め、はみ出す分は
           nav 自身の横スクロールに逃がす（ページ全体は横スクロールさせない）。

           overflow-y-hidden は必須。CSS の overflow は片方が visible 以外だと
           もう片方の visible が auto へ計算し直される仕様なので、
           overflow-x-auto だけ書くと overflow-y も auto になる。パンくずは
           chevron_right アイコンの行高のぶんだけ僅かに縦へはみ出すため、
           これだけで縦スクロールバーが出てヘッダー右側に矢印(▲▼)が
           表示されていた（顧客指摘 2026-08）。 -->
      <nav
        v-if="showBreadcrumb"
        aria-label="Breadcrumb"
        class="flex text-xs text-text-secondary mt-1 overflow-x-auto overflow-y-hidden"
      >
        <ol class="inline-flex items-center space-x-1 m-0 pl-0 list-none whitespace-nowrap">
          <li
            v-for="(item, idx) in breadcrumbs"
            :key="idx"
            class="flex items-center shrink-0"
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
      <a-dropdown :trigger="['click']" placement="bottomRight">
        <button
          type="button"
          class="flex items-center gap-2 hover:text-primary transition-colors"
        >
          <div
            class="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden"
          >
            <span class="material-icons text-icon">account_circle</span>
          </div>
          <!-- leading-normal + py-0.5: preflight を読み込まない構成では line-height
               が詰まり、truncate(overflow:hidden) が "g/y/p" のディセンダを切る。
               行高に余裕を持たせ下端のはみ出しを防ぐ。 -->
          <!-- アカウント名はヘッダーが窮屈なうちは出さない（顧客要望 2026-08）。
               この行は「ページタイトル / アバター / アカウント名」を
               分け合っており、名前（≈150px）を出すとタイトル側が削られて
               「購読者…」まで潰れていた。狭いときは代わりにドロップダウン
               （下記 account-info）へ出す。判定は canShowNameInHeader に一本化。
               出せる幅でも 200px で truncate し、ホバーでは title で全文。 -->
          <span
            v-if="canShowNameInHeader"
            class="truncate max-w-[200px] @6xl:max-w-none leading-normal py-0.5"
            data-test="account-name-header"
            :title="displayName"
          >
            {{ displayName }}
          </span>
        </button>

        <template #overlay>
          <a-menu>
            <!-- [account-info] ヘッダーに名前が出せない狭い幅のときだけ、
                 ドロップダウン先頭に全文を表示する。タッチ環境では `title` の
                 ツールチップが出せないため、アバターをタップすれば所属まで
                 確認できる導線をここに置く（顧客要望 2026-08）。
                 メニュー項目ではないので選択不可・クリックしても閉じない。

                 ヘッダーに名前が出ている幅では同じ情報が二重に見えるため、
                 `!canShowNameInHeader` のときだけ出す（顧客要望 2026-08）。 -->
            <a-menu-item-group v-if="!canShowNameInHeader">
              <template #title>
                <span class="flex items-center max-w-[240px]">
                  <!-- 下の 2段階認証 / ログアウト と同じアイコン+ラベルの並び。
                       aria-hidden: material-icons はリガチャなので、付けないと
                       読み上げが「account_circle」という文字列を読んでしまう。 -->
                  <span
                    class="material-icons text-base mr-2 shrink-0"
                    aria-hidden="true"
                  >account_circle</span>
                  <!-- data-test は名前の span 側に置く。アイコン側を含めると
                       リガチャ文字列が text() に混ざる。 -->
                  <span
                    class="break-all whitespace-normal text-text-main font-medium"
                    data-test="account-info"
                  >{{ displayName }}</span>
                </span>
              </template>
            </a-menu-item-group>
            <!-- account-info と対。名前を出さない幅では区切り線だけが
                 先頭に残らないよう同じ条件で消す。 -->
            <a-menu-divider v-if="!canShowNameInHeader" />
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

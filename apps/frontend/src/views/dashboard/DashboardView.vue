<script setup lang="ts">
/**
 * メニュー画面 (SCR-010) — mirrors docs/design/ACSMS-SCR-010/index.html.
 * TEMP: static fake data. Replace with API results when wiring real endpoints.
 */
import { useRouter } from 'vue-router';

const router = useRouter();

function goTo(name?: string): void {
  // Many routes aren't registered yet; skip silently rather than
  // triggering a vue-router warning for unknown routes.
  if (!name || !router.hasRoute(name)) return;
  router.push({ name });
}

interface Announcement {
  date: string;    // YYYY/MM/DD
  message: string;
}

interface MenuLink {
  label: string;
  icon: string;    // material icon name
  /** Route name. Skip navigation if the route isn't registered yet. */
  to?: string;
}

interface MenuCard {
  title: string;
  links: MenuLink[];
}

// ── TEMP FAKE DATA ──────────────────────────────────────────────────
const pendingApprovals = true;   // shows 承認待ちあり badge

const announcements: Announcement[] = [
  { date: '2024/05/20', message: 'システムメンテナンスのお知らせ：5月25日(土)午後11時～26日(日)午前7時' },
  { date: '2024/05/15', message: '新機能「購読者一括評価機能」がリリースされました' },
  { date: '2024/05/10', message: 'セキュリティアップデート適用のお知らせ' },
  { date: '2024/05/05', message: '月間レポート機能の改善完了' },
  { date: '2024/05/01', message: '2024年5月の販売目標について' },
  { date: '2024/04/28', message: 'API仕様書がアップデートされました' },
  { date: '2024/04/25', message: '購読者データインポート機能のパフォーマンス向上' },
  { date: '2024/04/20', message: '販売店別売上集計ダッシュボードを追加' },
  { date: '2024/04/15', message: 'ユーザーマニュアル第3版をダウンロード可能に' },
  { date: '2024/04/10', message: 'システム利用規約が更新されました。ご確認ください' },
];

const menuCards: MenuCard[] = [
  {
    title: '購読者管理',
    links: [
      { label: '購読者情報登録', icon: 'person_add', to: 'DokusyaCreate' },
      { label: '購読者Excelデータ取込', icon: 'upload_file', to: 'DokusyaImport' },
      { label: '購読者明細検索', icon: 'search', to: 'DokusyaList' },
      { label: '購読者販売店一括置換', icon: 'published_with_changes', to: 'DokusyaReplaceHanbaiten' },
    ],
  },
  {
    title: '販売店管理',
    links: [
      { label: '販売店情報登録', icon: 'store', to: 'HanbaitenCreate' },
      { label: '販売店Excelデータ取込', icon: 'sim_card_download', to: 'HanbaitenImport' },
      { label: '販売店明細検索', icon: 'find_in_page', to: 'HanbaitenList' },
    ],
  },
  {
    title: 'データ作成',
    links: [
      { label: '口座振替データ出力', icon: 'account_balance', to: 'KozaFurikaeExport' },
      { label: '支払情報出力', icon: 'payments', to: 'HaitatsuryoExport' },
    ],
  },
  {
    title: 'レポート作成',
    links: [
      { label: '購読者名簿', icon: 'assignment', to: 'ReportMeibo' },
      { label: '増減連絡票（販売店）', icon: 'trending_up', to: 'ReportZougenHanbaiten' },
      { label: '増減通知（日本農業新聞）', icon: 'newspaper', to: 'ReportZougenNichino' },
    ],
  },
  {
    title: 'マスタ管理',
    links: [
      { label: '単価マスタ登録', icon: 'settings_suggest', to: 'TankaList' },
      { label: 'JAマスタ登録', icon: 'domain', to: 'JaList' },
      { label: '支店マスタ登録', icon: 'apartment', to: 'ShitenList' },
    ],
  },
  {
    title: 'その他',
    links: [
      { label: 'ファイルアップロード', icon: 'upload', to: 'FileUpload' },
      { label: 'ファイルダウンロード', icon: 'download', to: 'FileDownload' },
    ],
  },
  {
    title: '管理者機能',
    links: [
      { label: 'ログ参照', icon: 'history', to: 'LogList' },
      { label: 'お知らせ一覧', icon: 'campaign', to: 'OshiraseList' },
      { label: '管理支店マスタ', icon: 'admin_panel_settings', to: 'KanriShitenList' },
      { label: 'アカウント管理', icon: 'manage_accounts', to: 'AccountList' },
      { label: '販売店代行入力', icon: 'upload', to: 'HanbaitenDaikoInput' },
      { label: 'ロール管理画面', icon: 'security', to: 'RoleList' },
    ],
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Banner Section -->
    <section
      class="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
        電子開設をお試し
      </h3>
      <div v-if="pendingApprovals" class="mb-4">
        <p
          class="text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded inline-block"
        >
          承認待ちあり
        </p>
      </div>
      <button
        type="button"
        class="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded font-bold hover:bg-primary-hover transition-colors"
      >
        Web申込読者承認へ
      </button>
    </section>

    <!-- Announcements Section -->
    <section
      class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div
        class="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap"
      >
        <h3 class="font-bold text-slate-800 dark:text-slate-200">お知らせ</h3>
        <span
          class="text-xs sm:text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded whitespace-nowrap"
        >
          締め切り時間　14時まで
        </span>
      </div>
      <div
        class="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto"
      >
        <div
          v-for="(item, idx) in announcements"
          :key="idx"
          class="px-4 sm:px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex justify-between items-center gap-3"
        >
          <div class="text-sm text-slate-700 dark:text-slate-300 min-w-0 flex-1">
            <span class="text-slate-600 dark:text-slate-400 whitespace-nowrap">{{ item.date }}</span>
            <span class="mx-2">-</span>
            <span>{{ item.message }}</span>
          </div>
          <a href="#" class="text-primary text-sm font-medium flex-shrink-0">詳細</a>
        </div>
      </div>
    </section>

    <!-- Menu Cards Grid — 1 col on mobile → 2 on sm → 3 on lg → 4 on xl -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      <section
        v-for="card in menuCards"
        :key="card.title"
        class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div
          class="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800"
        >
          <h3 class="font-bold text-slate-800 dark:text-slate-200">
            {{ card.title }}
          </h3>
        </div>
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          <a
            v-for="link in card.links"
            :key="link.label"
            href="#"
            class="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2"
            @click.prevent="goTo(link.to)"
          >
            <span
              class="material-icons text-[18px] text-slate-600 dark:text-slate-400"
            >{{ link.icon }}</span>
            <span>{{ link.label }}</span>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

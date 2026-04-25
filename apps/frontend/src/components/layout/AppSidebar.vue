<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useSidebar, MD_BREAKPOINT } from '@/composables/useSidebar';
import DarkModeToggle from './DarkModeToggle.vue';

const { open, hide } = useSidebar();

interface MenuItem {
  name: string;         // Route name
  label: string;
  icon: string;         // Material icon name
  permission?: string;  // Required permission (skip if user lacks it)
}

interface MenuSection {
  heading?: string;     // Undefined = top-level (e.g. home)
  items: MenuItem[];
  /** Extra wrapper classes (e.g. `pb-10` for the last section). */
  extraClass?: string;
}

// TEMP: while building out the layout, show every menu item regardless of
// permission so the full sidebar matches docs/design/ACSMS-SCR-*/index.html.
// Restore the real filter (`authStore.hasPermission(it.permission)`) before
// shipping.
const FAKE_FULL_MENU = true;

/**
 * Menu definition — mirrors docs/design/ACSMS-SCR-010 (メニュー画面) groups.
 * Items with a `permission` are only shown when the user has it.
 */
const sections: MenuSection[] = [
  {
    items: [{ name: 'Dashboard', label: 'メニュー画面', icon: 'home' }],
  },
  {
    heading: '購読者管理',
    items: [
      { name: 'DokusyaCreate', label: '購読者情報登録', icon: 'person_add', permission: 'dokusya.create' },
      { name: 'DokusyaImport', label: '購読者Excelデータ取込', icon: 'upload_file', permission: 'dokusya.import' },
      { name: 'DokusyaList', label: '購読者明細検索', icon: 'search', permission: 'dokusya.view' },
      { name: 'DokusyaReplaceHanbaiten', label: '購読者販売店一括置換', icon: 'published_with_changes', permission: 'dokusya.replace_hanbaiten' },
    ],
  },
  {
    heading: '販売店管理',
    items: [
      { name: 'HanbaitenCreate', label: '販売店情報登録', icon: 'store', permission: 'hanbaiten.create' },
      { name: 'HanbaitenImport', label: '販売店Excelデータ取込', icon: 'sim_card_download', permission: 'hanbaiten.import' },
      { name: 'HanbaitenList', label: '販売店明細検索', icon: 'find_in_page', permission: 'hanbaiten.view' },
    ],
  },
  {
    heading: 'データ作成',
    items: [
      { name: 'KozaFurikaeExport', label: '口座振替データ出力', icon: 'account_balance', permission: 'koza_furikae.export' },
      { name: 'HaitatsuryoExport', label: '配達手数料支払情報出力', icon: 'payments', permission: 'haitatsuryo.export' },
    ],
  },
  {
    heading: 'レポート作成',
    items: [
      { name: 'ReportMeibo', label: '購読者名簿', icon: 'assignment', permission: 'report.export_meibo' },
      { name: 'ReportZougenHanbaiten', label: '増減連絡票（販売店）', icon: 'trending_up', permission: 'report.export_zougen_hanbaiten' },
      { name: 'ReportZougenNichino', label: '増減通知（日本農業新聞）', icon: 'newspaper', permission: 'report.export_zougen_nichino' },
    ],
  },
  {
    heading: 'マスタ管理',
    items: [
      { name: 'TankaList', label: '単価マスタ', icon: 'settings_suggest', permission: 'tanka.view' },
      { name: 'JaList', label: 'JAマスタ', icon: 'domain', permission: 'ja.view' },
      { name: 'ShitenList', label: '支店マスタ', icon: 'apartment', permission: 'shiten.view' },
    ],
  },
  {
    heading: 'その他',
    items: [
      { name: 'FileUpload', label: 'ファイルアップロード', icon: 'upload', permission: 'file.upload' },
      { name: 'FileDownload', label: 'ファイルダウンロード', icon: 'download', permission: 'file.download' },
    ],
  },
  {
    heading: '管理者機能',
    extraClass: 'pb-10',
    // Order matches the dashboard menu card (docs/design/ACSMS-SCR-010/index.html).
    items: [
      { name: 'LogList', label: 'ログ参照', icon: 'history', permission: 'log.view' },
      { name: 'OshiraseList', label: 'お知らせ一覧', icon: 'campaign', permission: 'oshirase.view' },
      { name: 'KanriShitenList', label: '管理支店マスタ', icon: 'admin_panel_settings', permission: 'kanri_shiten.view' },
      { name: 'AccountList', label: 'アカウント管理', icon: 'manage_accounts', permission: 'account.view' },
      { name: 'HanbaitenDaikoInput', label: '販売店代行入力', icon: 'upload', permission: 'hanbaiten.daiko_input' },
      { name: 'RoleList', label: 'ロール管理', icon: 'security', permission: 'role.view' },
    ],
  },
];

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const visibleSections = computed(() =>
  sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (it) =>
          FAKE_FULL_MENU ||
          !it.permission ||
          authStore.hasPermission?.(it.permission),
      ),
    }))
    .filter((s) => s.items.length > 0),
);

function isActive(name: string): boolean {
  return route.name === name;
}

function navigate(name: string): void {
  // During layout testing many routes aren't registered yet; skip instead of
  // crashing / logging a vue-router warning.
  if (!router.hasRoute(name)) return;
  router.push({ name });
}

// Auto-close the overlay sidebar after navigating on mobile.
watch(
  () => route.fullPath,
  () => {
    if (typeof window !== 'undefined' && window.innerWidth < MD_BREAKPOINT) {
      hide();
    }
  },
);
</script>

<template>
  <!-- Mobile-only backdrop: dims page content and closes sidebar on tap. -->
  <div
    v-if="open"
    class="fixed inset-0 bg-black/40 z-30 md:hidden"
    aria-hidden="true"
    @click="hide"
  />

  <aside
    :class="[
      'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen w-72 flex-shrink-0',
      // Mobile: fixed overlay that slides in from the left.
      'fixed top-0 left-0 z-40 transition-transform duration-300',
      open ? 'translate-x-0' : '-translate-x-full',
      // Desktop: in-flow sticky child; animate width when collapsed instead.
      'md:sticky md:top-0 md:z-auto md:translate-x-0 md:transition-[width] md:duration-300',
      open ? '' : 'md:w-0 md:border-r-0 md:overflow-hidden',
    ]"
  >
    <!-- Brand -->
    <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
      <div class="w-8 h-8 bg-primary rounded flex items-center justify-center">
        <span class="material-icons text-white text-sm">auto_stories</span>
      </div>
      <h1 class="font-bold text-lg tracking-tight">購読者管理システム</h1>
    </div>

    <!-- Nav -->
    <nav class="flex-1 mt-2 overflow-y-auto sidebar-scroll px-4 pb-6 space-y-6">
      <div
        v-for="(section, idx) in visibleSections"
        :key="section.heading ?? `root-${idx}`"
        :class="section.extraClass"
      >
        <h3
          v-if="section.heading"
          class="px-3 text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2"
        >
          {{ section.heading }}
        </h3>
        <div class="space-y-1">
          <button
            v-for="item in section.items"
            :key="item.name"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded text-left transition-colors"
            :class="
              isActive(item.name)
                ? 'bg-primary/10 text-primary dark:text-blue-400 font-medium'
                : 'text-text-main hover:bg-slate-100 dark:hover:bg-slate-800'
            "
            @click="navigate(item.name)"
          >
            <span class="material-icons text-[18px]">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Footer: dark mode toggle -->
    <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
      <DarkModeToggle />
    </div>
  </aside>
</template>

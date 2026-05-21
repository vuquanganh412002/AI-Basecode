<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import DarkModeToggle from './DarkModeToggle.vue';

interface MenuItem {
  name: string;         // Route name
  label: string;
  icon: string;         // Material icon name
  permission?: string;  // Required permission (skip if user lacks it)
}

interface MenuSection {
  heading?: string;     // Undefined = top-level (e.g. home)
  items: MenuItem[];
}

/**
 * Menu definition.
 * ─── CUSTOMIZE PER PROJECT ───
 * Replace the sections below with the project's actual menu groups.
 * Add `permission: '<model>.<action>'` to any item that should be
 * hidden when the user lacks that permission.
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
    items: [
      { name: 'LogList', label: 'ログ参照', icon: 'history', permission: 'log.view' },
      { name: 'AccountList', label: 'アカウント管理', icon: 'manage_accounts', permission: 'account.view' },
      { name: 'OshiraseList', label: 'お知らせ一覧', icon: 'campaign', permission: 'oshirase.view' },
      { name: 'KanriShitenList', label: '管理支店マスタ', icon: 'admin_panel_settings', permission: 'kanri_shiten.view' },
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
        (it) => !it.permission || authStore.hasPermission?.(it.permission),
      ),
    }))
    .filter((s) => s.items.length > 0),
);

function isActive(name: string): boolean {
  return route.name === name;
}

function navigate(name: string): void {
  router.push({ name });
}
</script>

<template>
  <aside
    class="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 flex-shrink-0"
  >
    <!-- Brand -->
    <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
      <div class="w-8 h-8 bg-primary rounded flex items-center justify-center">
        <span class="material-icons text-white text-sm">auto_stories</span>
      </div>
      <h1 class="font-bold text-lg tracking-tight">__PROJECT_NAME__</h1>
    </div>

    <!-- Nav -->
    <nav class="flex-1 mt-2 overflow-y-auto sidebar-scroll px-4 pb-6 space-y-6">
      <div v-for="(section, idx) in visibleSections" :key="section.heading ?? `root-${idx}`">
        <h3
          v-if="section.heading"
          class="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2"
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
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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

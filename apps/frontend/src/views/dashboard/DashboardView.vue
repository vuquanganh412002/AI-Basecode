<script setup lang="ts">
/**
 * メニュー画面 (SCR-010) — mirrors docs/design/ACSMS-SCR-010/index.html.
 * Menu cards consume the same source as AppSidebar (single source of truth:
 * src/constants/menu-sections.ts) so the two surfaces never drift apart.
 *
 * TEMP: announcements / pending-approval flag are still static fake data.
 * Replace with API results when wiring real endpoints.
 */
import { useRouter } from 'vue-router';
import { useMenu } from '@/composables/useMenu';

const router = useRouter();

// excludeRoot: skip the rootless "メニュー画面" entry — we don't show a
// "go to dashboard" card while already on the dashboard.
const { visibleSections } = useMenu({ excludeRoot: true });

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

// ── TEMP FAKE DATA ──────────────────────────────────────────────────
const pendingApprovals = true;   // shows 承認待ちの読者がいます badge

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
</script>

<template>
  <div class="space-y-6">
    <!-- Banner Section -->
    <section
      class="bg-surface-card rounded-lg p-4 sm:p-6 border border-border shadow-sm"
    >
      <h3 class="text-lg font-bold text-text-main mb-3">
        電子版読者承認
      </h3>
      <div v-if="pendingApprovals" class="mb-4">
        <p
          class="text-sm font-bold text-error bg-error-subtle px-3 py-1 rounded inline-block"
        >
          承認待ちの読者がいます
        </p>
      </div>
      <button
        type="button"
        class="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded font-bold hover:bg-primary-hover transition-colors"
      >
        Web申込読者承認
      </button>
    </section>

    <!-- Announcements Section -->
    <section
      class="bg-surface-card rounded-lg shadow-sm border border-border overflow-hidden"
    >
      <div
        class="px-4 sm:px-6 py-3 sm:py-4 bg-surface-card-subtle border-b border-border flex items-center justify-between gap-2 flex-wrap"
      >
        <h3 class="font-bold text-text-main">お知らせ</h3>
        <span
          class="text-xs sm:text-sm font-bold text-error bg-error-subtle px-3 py-1 rounded whitespace-nowrap"
        >
          締め切り時間　14時まで
        </span>
      </div>
      <div
        class="divide-y divide-border max-h-64 overflow-y-auto"
      >
        <div
          v-for="(item, idx) in announcements"
          :key="idx"
          class="px-4 sm:px-6 py-3 hover:bg-surface-hover flex justify-between items-center gap-3"
        >
          <div class="text-sm text-text-main min-w-0 flex-1">
            <span class="text-text-description whitespace-nowrap">{{ item.date }}</span>
            <span class="mx-2">-</span>
            <span>{{ item.message }}</span>
          </div>
          <a href="#" class="text-primary text-sm font-medium flex-shrink-0">詳細</a>
        </div>
      </div>
    </section>

    <!-- Menu Cards Grid — 1 col on mobile → 2 on sm → 3 on lg → 4 on xl.
         Permission-filtered via useMenu(); empty role sees only the
         banner + announcements above. -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      <section
        v-for="section in visibleSections"
        :key="section.heading"
        class="bg-surface-card rounded-lg shadow-sm border border-border overflow-hidden"
      >
        <div
          class="px-4 sm:px-6 py-3 sm:py-4 bg-surface-card-subtle border-b border-border"
        >
          <h3 class="font-bold text-text-main">
            {{ section.heading }}
          </h3>
        </div>
        <div class="divide-y divide-border">
          <a
            v-for="item in section.items"
            :key="item.name"
            href="#"
            class="px-4 py-3 text-sm text-text-main hover:bg-surface-hover flex items-center gap-2"
            @click.prevent="goTo(item.name)"
          >
            <span class="material-icons text-[18px] text-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

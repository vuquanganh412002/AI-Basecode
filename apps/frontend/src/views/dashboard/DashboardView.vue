<script setup lang="ts">
/**
 * メニュー画面 (SCR-010) — mirrors docs/design/ACSMS-SCR-010/index.html.
 * Menu cards consume the same source as AppSidebar (single source of truth:
 * src/constants/menu-sections.ts) so the two surfaces never drift apart.
 *
 * Announcements come from `GET /api/v1/oshirase/menu?limit=20` per
 * docs/design/ACSMS-SCR-010/ACSMS-SCR-010-api.md (API-010-001). Endpoint
 * already filters to publish_location=2, status=公開, within publish
 * window, ja_id NULL OR user.ja_id. Returns two slices:
 *   - `oshirase_list` (oshirase_type != 4) for the body list
 *   - `deadline_notice` (oshirase_type = 4) for the header chip
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMenu } from '@/composables/useMenu';
import BaseCard from '@/components/common/BaseCard.vue';
import {
  getMenuOshirase,
  type MenuOshiraseItem,
} from '@/api/oshirase/oshirase';

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

// ── TEMP FAKE DATA — replace when wiring the real approval-queue endpoint ──
const pendingApprovals = true; // shows 承認待ちの読者がいます badge

// ── お知らせ from /api/v1/oshirase/menu (SCR-010) ──────────────────────
const announcements = ref<MenuOshiraseItem[]>([]);
const deadlineNotice = ref<MenuOshiraseItem | null>(null);
const announcementsLoading = ref(false);
const selectedAnnouncement = ref<MenuOshiraseItem | null>(null);

/** BE returns publish_start_date already in `YYYY/MM/DD HH:mm`; trim time for the list. */
function formatAnnouncementDate(value: string): string {
  return value.slice(0, 10);
}

/** Chip text — falls back to a static placeholder when no deadline notice exists. */
const deadlineChipText = computed(() => deadlineNotice.value?.title ?? '');

function openAnnouncement(item: MenuOshiraseItem): void {
  selectedAnnouncement.value = item;
}
function closeAnnouncement(): void {
  selectedAnnouncement.value = null;
}

onMounted(async () => {
  announcementsLoading.value = true;
  try {
    const resp = await getMenuOshirase(20);
    announcements.value = resp.data.oshirase_list;
    deadlineNotice.value = resp.data.deadline_notice;
  } catch {
    // Global axios interceptor toasts 401 / 500. Render empty list on
    // failure so the rest of the dashboard stays usable.
    announcements.value = [];
    deadlineNotice.value = null;
  } finally {
    announcementsLoading.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Banner Section -->
    <BaseCard padding="responsive">
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
    </BaseCard>

    <!-- Announcements Section -->
    <BaseCard padding="none">
      <div
        class="px-4 sm:px-6 py-3 sm:py-4 bg-surface-card-subtle border-b border-border flex items-center justify-between gap-2 flex-wrap"
      >
        <h3 class="font-bold text-text-main">お知らせ</h3>
        <!-- Header chip — populated from deadline_notice (oshirase_type=4)
             when one exists. Hidden when the BE returns null. Click
             opens the same detail dialog as the list rows. -->
        <button
          v-if="deadlineNotice"
          type="button"
          class="text-xs sm:text-sm font-bold text-error bg-error-subtle hover:bg-error-subtle/80 px-3 py-1 rounded whitespace-nowrap border-0 cursor-pointer"
          @click="openAnnouncement(deadlineNotice)"
        >
          {{ deadlineChipText }}
        </button>
      </div>
      <div class="divide-y divide-border max-h-64 overflow-y-auto">
        <p
          v-if="announcementsLoading"
          class="px-4 sm:px-6 py-3 text-sm text-text-description"
        >
          読み込み中...
        </p>
        <p
          v-else-if="announcements.length === 0"
          class="px-4 sm:px-6 py-3 text-sm text-text-description"
        >
          お知らせはありません。
        </p>
        <div
          v-for="item in announcements"
          :key="item.oshirase_id"
          class="px-4 sm:px-6 py-3 hover:bg-surface-hover flex justify-between items-center gap-3"
        >
          <div class="text-sm text-text-main min-w-0 flex-1">
            <span class="text-text-description whitespace-nowrap">
              {{ formatAnnouncementDate(item.publish_start_date) }}
            </span>
            <span class="mx-2">-</span>
            <span>{{ item.title }}</span>
          </div>
          <button
            type="button"
            class="text-primary hover:text-primary-hover text-sm font-medium flex-shrink-0 bg-transparent border-0 cursor-pointer"
            @click="openAnnouncement(item)"
          >
            詳細
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Menu Cards Grid — 1 col on mobile → 2 on sm → 3 on lg → 4 on xl.
         Permission-filtered via useMenu(); empty role sees only the
         banner + announcements above. -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      <BaseCard
        v-for="section in visibleSections"
        :key="section.heading"
        padding="none"
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
            <span class="material-icons text-lg text-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </a>
        </div>
      </BaseCard>
    </div>

    <a-modal
      :open="selectedAnnouncement !== null"
      :footer="null"
      width="640px"
      @cancel="closeAnnouncement"
    >
      <template #title>
        <span
          :class="
            selectedAnnouncement?.oshirase_type === 4
              ? 'text-error font-bold'
              : 'text-text-main font-bold'
          "
        >
          {{ selectedAnnouncement?.title }}
        </span>
      </template>
      <div v-if="selectedAnnouncement" class="space-y-4">
        <dl class="grid grid-cols-[8rem_1fr] gap-y-2 gap-x-3 text-sm">
          <dt class="text-text-description">お知らせID</dt>
          <dd class="text-text-main">{{ selectedAnnouncement.oshirase_id }}</dd>

          <dt class="text-text-description">お知らせ種別</dt>
          <dd class="text-text-main">
            <span class="bg-info-subtle text-info px-2 py-0.5 rounded font-medium">
              {{ selectedAnnouncement.oshirase_type_label }}
            </span>
            <span class="text-text-description ml-2">
              (種別コード: {{ selectedAnnouncement.oshirase_type }})
            </span>
            <span
              v-if="selectedAnnouncement.is_new"
              class="bg-error-subtle text-error px-2 py-0.5 rounded font-medium ml-2"
            >
              NEW
            </span>
          </dd>

          <dt class="text-text-description">対象JA</dt>
          <dd class="text-text-main">
            <template v-if="selectedAnnouncement.ja_id">
              JA ID: {{ selectedAnnouncement.ja_id }}
            </template>
            <template v-else>
              全JA向け
            </template>
          </dd>

          <dt class="text-text-description">公開開始日時</dt>
          <dd class="text-text-main">
            {{ selectedAnnouncement.publish_start_date }}
          </dd>

          <dt class="text-text-description">公開終了日時</dt>
          <dd class="text-text-main">
            {{ selectedAnnouncement.publish_end_date ?? '指定なし' }}
          </dd>
        </dl>

        <div>
          <p class="text-text-description text-sm mb-1">本文</p>
          <div
            class="text-sm text-text-main whitespace-pre-wrap leading-relaxed bg-bg-layout border border-border rounded p-3"
          >
            {{ selectedAnnouncement.content }}
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

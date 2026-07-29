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
import { useCodesStore } from '@/stores/codes.store';
import { useAuthStore } from '@/stores/auth.store';
import { OshiraseType, RoleCode } from '@/constants/enums';
import BaseCard from '@/components/common/BaseCard.vue';
import {
  getMenuOshirase,
  type MenuOshiraseItem,
} from '@/api/oshirase/oshirase';
import { getPendingApprovalCount } from '@/api/dokusya/dokusya';
import { linkifyParts } from '@/utils/linkify';

// [m_code-driven] お知らせ種別ラベルは FE 側で解決
// （認証済みメニュー一覧は oshirase_type_label を返さないため）。
const codes = useCodesStore();

const router = useRouter();

// excludeRoot: rootless「メニュー画面」を除外（ダッシュボード上で
// 「ダッシュボードへ」カードは出さない）。
const { visibleSections } = useMenu({ excludeRoot: true });

function goTo(name?: string): void {
  // 未登録ルートが多いため、警告を出さず静かにスキップする。
  if (!name || !router.hasRoute(name)) return;
  router.push({ name });
}

// ── 電子版読者承認 (SCR-010, API-010-002) ─────────────────────────────
// 日農アカウント (NICHINO_ADMIN / NICHINO_STAFF) はこのバナーを表示しない
// — 電子版読者承認は JA 側ロールの業務。それ以外のロールは承認待ち件数を
// DataScope 込みで取得し、0件ならボタンを無効化、>0 件なら購読者明細検索
// (DokusyaList) へ電子版承認ステータス=未承認(0) で遷移する。
const authStore = useAuthStore();
const isNichino = computed(() => {
  const rc = authStore.user?.role_code;
  return rc === RoleCode.NICHINO_ADMIN || rc === RoleCode.NICHINO_STAFF;
});

const pendingCount = ref(0);
const pendingApprovals = computed(() => pendingCount.value > 0);

function goToPendingApproval(): void {
  if (pendingCount.value === 0) return;
  // 電子版承認ステータス=未承認 (denshi_shonin_status=0) を絞り込み条件として渡す。
  router.push({
    name: 'DokusyaList',
    query: { denshi_shonin_status: '0' },
  });
}

// ── お知らせ from /api/v1/oshirase/menu (SCR-010) ──────────────────────
const announcements = ref<MenuOshiraseItem[]>([]);
const deadlineNotice = ref<MenuOshiraseItem | null>(null);
const announcementsLoading = ref(false);
const selectedAnnouncement = ref<MenuOshiraseItem | null>(null);

/** BE の publish_start_date（YYYY/MM/DD HH:mm）から一覧用に時刻を落とす。 */
function formatAnnouncementDate(value: string): string {
  return value.slice(0, 10);
}

/** チップ表示文言 — 締切お知らせが無ければ空。 */
const deadlineChipText = computed(() => deadlineNotice.value?.title ?? '');

function openAnnouncement(item: MenuOshiraseItem): void {
  selectedAnnouncement.value = item;
}
function closeAnnouncement(): void {
  selectedAnnouncement.value = null;
}

// 本文中の URL をリンク化するための分割（v-html を使わず安全に描画）。
const announcementContentParts = computed(() =>
  selectedAnnouncement.value
    ? linkifyParts(selectedAnnouncement.value.content)
    : [],
);

onMounted(async () => {
  announcementsLoading.value = true;
  try {
    const resp = await getMenuOshirase(20);
    announcements.value = resp.data.oshirase_list;
    deadlineNotice.value = resp.data.deadline_notice;
  } catch {
    // 401 / 500 は global axios interceptor がトースト済み。失敗時は空一覧で
    // 描画し、ダッシュボードの他部分を使用可能に保つ。
    announcements.value = [];
    deadlineNotice.value = null;
  } finally {
    announcementsLoading.value = false;
  }

  // 承認待ち件数 — 日農アカウント以外のみ取得 (NICHINO は権限/業務対象外)。
  if (!isNichino.value) {
    try {
      const res = await getPendingApprovalCount();
      pendingCount.value = res.data.count;
    } catch {
      // 失敗時は 0 件扱い (ボタン無効) にフォールバック。
      // 401 / 403 / 500 は global axios interceptor がトースト済み。
      pendingCount.value = 0;
    }
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- 電子版読者承認 Banner — 日農アカウント (role 1/2) には非表示 -->
    <BaseCard v-if="!isNichino" padding="responsive">
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
        :disabled="pendingCount === 0"
        class="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
        @click="goToPendingApproval"
      >
        Web申込読者承認
      </button>
    </BaseCard>

    <!-- お知らせセクション -->
    <BaseCard padding="none">
      <div
        class="px-4 sm:px-6 py-3 sm:py-4 bg-surface-card-subtle border-b border-border flex items-center justify-between gap-2 flex-wrap"
      >
        <h3 class="font-bold text-text-main">お知らせ</h3>
        <!-- ヘッダーチップ — deadline_notice (oshirase_type=4) がある時のみ表示。
             null なら非表示。クリックで一覧行と同じ詳細ダイアログを開く。 -->
        <button
          v-if="deadlineNotice"
          type="button"
          class="text-xs sm:text-sm font-bold text-error bg-error-subtle hover:bg-error-subtle/80 px-3 py-1 rounded whitespace-nowrap border-0 cursor-pointer"
          @click="openAnnouncement(deadlineNotice)"
        >
          {{ deadlineChipText }}
        </button>
      </div>
      <!-- 約5行（1行≈2.75rem → max-h-56≈5行）を超えたらスクロール。
           overflow-y-auto は超過時のみバー表示（≤5件はバー無し）。 -->
      <div class="divide-y divide-border max-h-56 overflow-y-auto">
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
        <!-- 行単位のクリックで詳細モーダルを開く（顧客指摘 2026-06）。
             種別バッジと NEW を一覧でも表示。native <button> なので
             Enter/Space は標準でアクセシブル。 -->
        <button
          v-for="item in announcements"
          :key="item.oshirase_id"
          type="button"
          data-test="announcement-row"
          class="w-full text-left px-4 sm:px-6 py-3 hover:bg-surface-hover flex items-center gap-2 cursor-pointer bg-transparent border-0"
          @click="openAnnouncement(item)"
        >
          <span class="material-icons text-base text-primary shrink-0">chevron_right</span>
          <!-- 種別バッジを固定幅カラムに入れて、後続の日付・タイトルが
               行をまたいで縦に揃うようにする（バッジ自体は内容幅）。 -->
          <span class="shrink-0 w-20">
            <span
              class="inline-block px-2 py-0.5 rounded font-medium text-xs text-center"
              :class="
                item.oshirase_type === OshiraseType.DEADLINE
                  ? 'bg-error-subtle text-error'
                  : 'bg-info-subtle text-info'
              "
            >
              {{ codes.label('OSHIRASE_TYPE', item.oshirase_type) }}
            </span>
          </span>
          <!-- 日付は等幅数字 + 固定書式（YYYY/MM/DD）なので幅が一定 →
               区切りとタイトルも縦に揃う。 -->
          <span
            class="shrink-0 text-sm text-text-description tabular-nums whitespace-nowrap"
          >
            {{ formatAnnouncementDate(item.publish_start_date) }}
          </span>
          <span class="shrink-0 text-text-secondary">-</span>
          <span class="text-sm text-text-main min-w-0 flex-1 truncate">
            {{ item.title }}
          </span>
          <span
            v-if="item.is_new"
            class="bg-error-subtle text-error px-2 py-0.5 rounded font-medium text-xs shrink-0"
          >
            NEW
          </span>
        </button>
      </div>
    </BaseCard>

    <!-- メニューカードグリッド — mobile 1列 → sm 2 → lg 3 → xl 4。
         useMenu() で権限フィルタ済み。権限なしはバナー+お知らせのみ表示。 -->
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
            class="px-4 py-3 text-sm flex items-center gap-2"
            :class="
              item.disabled
                ? 'text-text-disabled opacity-40 cursor-not-allowed'
                : 'text-text-main hover:bg-surface-hover'
            "
            :aria-disabled="item.disabled ? 'true' : undefined"
            :title="
              item.disabled
                ? '紙版・電子版いずれの取扱い権限もありません'
                : undefined
            "
            @click.prevent="!item.disabled && goTo(item.name)"
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
      <!-- 種別バッジをタイトルの前に。NEW は更新から7日以内のとき表示。 -->
      <template #title>
        <div v-if="selectedAnnouncement" class="flex items-center gap-2 pr-6">
          <span
            class="px-2 py-0.5 rounded font-medium text-xs shrink-0"
            :class="
              selectedAnnouncement.oshirase_type === OshiraseType.DEADLINE
                ? 'bg-error-subtle text-error'
                : 'bg-info-subtle text-info'
            "
          >
            {{ codes.label('OSHIRASE_TYPE', selectedAnnouncement.oshirase_type) }}
          </span>
          <span class="font-bold text-text-main">
            {{ selectedAnnouncement.title }}
          </span>
          <span
            v-if="selectedAnnouncement.is_new"
            class="bg-error-subtle text-error px-2 py-0.5 rounded font-medium text-xs shrink-0"
          >
            NEW
          </span>
        </div>
      </template>
      <div v-if="selectedAnnouncement" class="space-y-3">
        <!-- 公開開始日時のみ表示（種別・対象JA・公開終了日時は非表示）。
             グレー・年月日時分のみ（BE が YYYY/MM/DD HH:mm を返す）。 -->
        <p class="text-right text-text-secondary text-xs">
          {{ selectedAnnouncement.publish_start_date }}
        </p>

        <div>
          <p class="text-text-description text-sm mb-1">本文</p>
          <div
            class="text-sm text-text-main whitespace-pre-wrap leading-relaxed bg-bg-layout border border-border rounded p-3"
          >
            <!-- 本文中の URL はリンク化（target=_blank + noopener）。 -->
            <template
              v-for="(part, idx) in announcementContentParts"
              :key="idx"
            >
              <a
                v-if="part.type === 'url'"
                :href="part.value"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline break-all"
                >{{ part.value }}</a
              ><template v-else>{{ part.value }}</template>
            </template>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

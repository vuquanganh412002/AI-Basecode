<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Modal, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import {
  listShiten,
  removeShiten,
  type ShitenListItem,
  type ListShitenQuery,
} from '@/api/shiten/shiten';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
} from '@/api/kanri-shiten/kanri-shiten';

interface ShitenFilters {
  shiten_name: string;
  shiten_code: string;
  kanri_shiten_id: number | undefined;
  jastem_toriatsukai_tenpo_code: string;
  /** 'all' = 全選択 (no filter), 'true' = 金融機関支店, 'false' = 金融機関支店以外. */
  kinyu_shiten_flg: 'all' | 'true' | 'false';
}

const router = useRouter();
const route = useRoute();
const notify = useNotify();
const authStore = useAuthStore();

// Permission gates per docs/database/seeder.md §3 shiten.* matrix +
// ACSMS-SCR-006 api.md §4.2. The three JA-level roles (CHUOKAI /
// JA_HONTEN / JA_KANRI_SHITEN) all carry shiten.view / .create /
// .update / .delete; we still guard the UI so a future role-perm
// edit can't accidentally surface forbidden actions. Buttons stay
// visible but `:disabled` for roles missing the perm so the UX
// signals "feature exists, your role can't use it" instead of
// hiding the affordance entirely (vue.md §Permission-aware list buttons).
const canCreate = computed(() => authStore.hasPermission('shiten.create'));
const canUpdate = computed(() => authStore.hasPermission('shiten.update'));
const canDelete = computed(() => authStore.hasPermission('shiten.delete'));

const DEFAULT_FILTERS: ShitenFilters = {
  shiten_name: '',
  shiten_code: '',
  kanri_shiten_id: undefined,
  jastem_toriatsukai_tenpo_code: '',
  kinyu_shiten_flg: 'all',
};

const { state, loading, total, onChange, applyFilters, resetFilters } =
  useTableQuery<ShitenFilters>({
    defaultFilters: { ...DEFAULT_FILTERS },
    // Default sort puts the most-recently-updated rows first so the row
    // a user just created / edited appears at the top of the list.
    // The 画面定義§8.1 columns stay available via header clicks.
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<ShitenListItem[]>([]);
const kanriShitenOptions = ref<KanriShitenDropdownItem[]>([]);

// Columns mirror docs/design/ACSMS-SCR-006/screen-design.md
// §画面項目定義 §検索結果テーブル + index.html, with 管理支店名 added
// as the leading context column (joined from m_kanri_shiten by the BE).
// Sortable columns: 支店コード / 支店名 per §機能定義§8.1, plus 管理支店名
// (joined; BE adds a LEFT JOIN only when this sort is requested).
const columns: TableColumnsType = [
  { title: '支店コード', dataIndex: 'shiten_code', key: 'shiten_code', sorter: true, width: 160 },
  { title: '管理支店名', dataIndex: 'kanri_shiten_name', key: 'kanri_shiten_name', sorter: true, width: 200 },
  { title: '支店名', dataIndex: 'shiten_name', key: 'shiten_name', sorter: true, width: 220 },
  { title: '支店カナ', dataIndex: 'shiten_name_kana', key: 'shiten_name_kana', width: 220 },
  { title: '金融機関支店フラグ', dataIndex: 'kinyu_shiten_flg', key: 'kinyu_shiten_flg', align: 'center', width: 160 },
  { title: 'データ送信取扱店舗コード', dataIndex: 'jastem_toriatsukai_tenpo_code', key: 'jastem_toriatsukai_tenpo_code', width: 220 },
  { title: '店舗名', dataIndex: 'jastem_tenpo_name', key: 'jastem_tenpo_name', width: 160 },
  { title: '貯金種別', dataIndex: 'jastem_tyokin_shubetsu', key: 'jastem_tyokin_shubetsu', align: 'center', width: 100 },
  { title: '口座番号', dataIndex: 'jastem_koza_no', key: 'jastem_koza_no', width: 140 },
  { title: '操作', key: 'actions', align: 'center', width: 90 },
];

/**
 * [highlight-on-return]
 * After a successful create/update, ShitenFormView pushes back here
 * with `?highlight=:shiten_id`. Hoist that row to the top of the
 * fetched page so the user sees the change without scrolling the
 * code-sorted list. The query param is consumed once — we clear it
 * via router.replace so a page refresh doesn't keep pinning the row.
 * If the touched row isn't on the current page (e.g. user paginated
 * before returning), the hoist is a no-op — no fetch-extra needed.
 */
function hoistHighlight(): void {
  const raw = route.query.highlight;
  if (typeof raw !== 'string') return;
  const id = Number(raw);
  if (Number.isNaN(id)) return;
  const idx = rows.value.findIndex((r) => r.shiten_id === id);
  if (idx > 0) {
    const [pinned] = rows.value.splice(idx, 1);
    rows.value.unshift(pinned);
  }
  // Clear the query param so subsequent navigations / refreshes
  // don't re-pin. Use replace so it doesn't add a history entry.
  void router.replace({ query: { ...route.query, highlight: undefined } });
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListShitenQuery = {
      shiten_name: state.filters.shiten_name || undefined,
      shiten_code: state.filters.shiten_code || undefined,
      kanri_shiten_id: state.filters.kanri_shiten_id,
      jastem_toriatsukai_tenpo_code:
        state.filters.jastem_toriatsukai_tenpo_code || undefined,
      // 'all' → undefined (no filter). 'true' / 'false' → boolean.
      kinyu_shiten_flg:
        state.filters.kinyu_shiten_flg === 'all'
          ? undefined
          : state.filters.kinyu_shiten_flg === 'true',
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by as ListShitenQuery['sort_by'],
      sort_order: state.sort_order,
    };
    const res = await listShiten(params);
    rows.value = res.data;
    total.value = res.meta.total;
    hoistHighlight();
  } catch {
    // Expected & ignored: global axios interceptor already toasted
    // FORBIDDEN / 500. Re-throwing would surface an unhandled rejection
    // in onMounted's fire-and-forget. See vue.md §List view rules #5.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function loadKanriShitenOptions(): Promise<void> {
  // 管理支店 dropdown via ACSMS-API-COMMON-004 — scoped to caller's JA.
  // NICHINO_* roles have ja_id = null but they don't carry shiten.view
  // (router guard rejects), so they never reach this view.
  const jaId = authStore.user?.ja_id;
  if (jaId === null || jaId === undefined) {
    kanriShitenOptions.value = [];
    return;
  }
  try {
    const resp = await getKanriShitenDropdown(jaId);
    kanriShitenOptions.value = resp.data;
  } catch {
    // Axios interceptor already toasted on 403 / 500.
    kanriShitenOptions.value = [];
  }
}

onMounted(() => {
  void fetchList();
  void loadKanriShitenOptions();
});

function onSearch(): void {
  // Trim leading/trailing whitespace so paste artifacts and IME-confirmed
  // spaces don't widen the ILIKE pattern. Mutate state.filters directly
  // so the input visibly updates (vue.md §List view rules #5a).
  state.filters.shiten_name = state.filters.shiten_name.trim();
  state.filters.shiten_code = state.filters.shiten_code.trim();
  state.filters.jastem_toriatsukai_tenpo_code =
    state.filters.jastem_toriatsukai_tenpo_code.trim();
  applyFilters({ ...state.filters });
  void fetchList();
}

function onClear(): void {
  resetFilters();
  void fetchList();
}

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goCreate(): void {
  void router.push({ name: 'ShitenCreate' });
}

function goEdit(row: ShitenListItem): void {
  void router.push({ name: 'ShitenEdit', params: { id: row.shiten_id } });
}

function askDelete(row: ShitenListItem): void {
  Modal.confirm({
    title: '削除確認',
    content: 'この支店を削除してもよろしいですか？', // ACSMS-MSG-006-005
    okText: 'はい',
    okType: 'danger',
    cancelText: 'いいえ',
    async onOk() {
      try {
        await removeShiten(row.shiten_id);
        notify.deleted(); // '削除しました。' (verb-only — vue.md §useNotify)
        await fetchList();
      } catch {
        // Global interceptor handled 409 CONFLICT (ACSMS-MSG-006-006) /
        // 500 (ACSMS-MSG-006-004); view must NOT re-toast.
      }
    },
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 5 filters per customer request 2026-05-21:
         支店コード / 支店名 / 管理支店 (dropdown) /
         データ送信取扱店舗コード / 金融機関支店フラグ (radio).
         4-col grid spreads filters across 2 rows; the radio group spans
         2 cols so all 3 options stay on one line. -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          支店コード
        </label>
        <a-input
          v-model:value="state.filters.shiten_code"
          placeholder="支店コード"
          allow-clear
          class="flex-1"
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          支店名
        </label>
        <a-input
          v-model:value="state.filters.shiten_name"
          placeholder="支店名"
          allow-clear
          class="flex-1"
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          管理支店
        </label>
        <a-select
          v-model:value="state.filters.kanri_shiten_id"
          placeholder="管理支店"
          allow-clear
          class="flex-1"
          :options="
            kanriShitenOptions.map((k) => ({
              value: k.kanri_shiten_id,
              label: `${k.kanri_shiten_code} - ${k.kanri_shiten_name}`,
            }))
          "
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          データ送信取扱店舗コード
        </label>
        <a-input
          v-model:value="state.filters.jastem_toriatsukai_tenpo_code"
          placeholder="取扱店舗コード"
          allow-clear
          class="flex-1"
        />
      </div>

      <div class="flex items-center gap-2 md:col-span-2 lg:col-span-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          金融機関支店フラグ
        </label>
        <a-radio-group v-model:value="state.filters.kinyu_shiten_flg">
          <a-radio value="all">全選択</a-radio>
          <a-radio value="true">金融機関支店</a-radio>
          <a-radio value="false">金融機関支店以外</a-radio>
        </a-radio-group>
      </div>
    </BaseSearchForm>

    <!-- Empty-result message rendered as a sibling <p> — a-table's
         emptyText slot is not safely forwardable through BaseDataTable's
         dynamic slot loop. (vue.md §List view rules #4) -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="shiten-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="支店一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="shiten_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <a-button type="primary" :disabled="!canCreate" @click="goCreate">
          <template #icon>
            <span class="material-icons text-sm mr-1">add</span>
          </template>
          新規登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'shiten_code'">
          <!-- Code is the edit entry point. Anchor only when the user
               has update permission; otherwise plain text avoids a
               dead-end click. -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as ShitenListItem)"
          >
            {{ (record as ShitenListItem).shiten_code }}
          </a>
          <span v-else>{{ (record as ShitenListItem).shiten_code }}</span>
        </template>
        <template v-else-if="column.key === 'kinyu_shiten_flg'">
          <span
            v-if="(record as ShitenListItem).kinyu_shiten_flg"
            class="material-icons text-success text-base"
            aria-label="金融機関支店"
          >
            check_circle
          </span>
          <span
            v-else
            class="material-icons text-text-disabled text-base"
            aria-label="金融機関支店ではない"
          >
            radio_button_unchecked
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as ShitenListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

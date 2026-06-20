<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { type TableColumnsType } from 'ant-design-vue';
import { confirmDelete } from '@/utils/confirm';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import {
  listKanriShiten,
  removeKanriShiten,
  type KanriShitenListItem,
  type ListKanriShitenQuery,
} from '@/api/kanri-shiten/kanri-shiten';
import { getTodofukenList, type TodofukenItem } from '@/api/todofuken/todofuken';

interface KanriShitenFilters {
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  // `undefined` (vs `''`) lets the <a-select> render its placeholder when
  // no prefecture is chosen. antd treats '' as a selected value and
  // would suppress the placeholder.
  todofuken_code: string | undefined;
  tel: string;
  fax: string;
}

const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();

// Permission gates per docs/database/seeder.md §3 kanri_shiten.* matrix
// + ACSMS-SCR-008 画面定義§1.3 (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
// can VIEW their own scope but only NICHINO_ADMIN can create / delete).
// Buttons stay visible but `:disabled` for non-admin roles so the UX
// signals "feature exists, your role can't use it" instead of hiding
// the affordance entirely (vue.md §Permission-aware list buttons).
const canCreate = computed(() => authStore.hasPermission('kanri_shiten.create'));
const canUpdate = computed(() => authStore.hasPermission('kanri_shiten.update'));
const canDelete = computed(() => authStore.hasPermission('kanri_shiten.delete'));

// Default sort is `updated_at DESC` so a newly created / updated record
// surfaces at the top of the list on the next render. The 3 sortable
// column headers from 画面定義§8.1 still override this when clicked.
const {
  state, loading, total, onChange, searchActions,
} =
  useTableQuery<KanriShitenFilters>({
    defaultFilters: {
      kanri_shiten_code: '',
      kanri_shiten_name: '',
      todofuken_code: undefined,
      tel: '',
      fax: '',
    },
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<KanriShitenListItem[]>([]);

/** Prefecture options for the search dropdown. Fetched once on mount. */
const todofukenOptions = ref<TodofukenItem[]>([]);

// Columns mirror docs/design/ACSMS-SCR-008/screen-design.md
// §画面項目定義 §検索結果テーブル. Sortable columns restricted to the 3
// listed in §機能定義§8.1.
const columns: TableColumnsType = [
  { title: '管理支店コード', dataIndex: 'kanri_shiten_code', key: 'kanri_shiten_code', sorter: true, width: 160 },
  { title: '管理支店名', dataIndex: 'kanri_shiten_name', key: 'kanri_shiten_name', sorter: true, width: 220 },
  { title: 'JA名', dataIndex: 'ja_name', key: 'ja_name', width: 180 },
  { title: '都道府県', dataIndex: 'todofuken_name', key: 'todofuken_code', sorter: true, width: 110 },
  { title: '郵便番号', dataIndex: 'yubin_no', key: 'yubin_no', width: 110 },
  { title: '住所', dataIndex: 'address', key: 'address', width: 240 },
  { title: '電話番号', dataIndex: 'tel', key: 'tel', width: 130 },
  { title: 'FAX', dataIndex: 'fax', key: 'fax', width: 130 },
  { title: '紙版', dataIndex: 'paper_flg', key: 'paper_flg', align: 'center', width: 70 },
  { title: '電子版', dataIndex: 'denshi_flg', key: 'denshi_flg', align: 'center', width: 70 },
  { title: '操作', key: 'actions', align: 'center', width: 90 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    // 都道府県 column displays `todofuken_name` (dataIndex) but BE's
    // sort whitelist is keyed by `todofuken_code`. Antd's sorter.field
    // comes from dataIndex, so map it back here.
    const sortBy =
      state.sort_by === 'todofuken_name' ? 'todofuken_code' : state.sort_by;
    const params: ListKanriShitenQuery = {
      kanri_shiten_code: state.filters.kanri_shiten_code || undefined,
      kanri_shiten_name: state.filters.kanri_shiten_name || undefined,
      todofuken_code: state.filters.todofuken_code || undefined,
      tel: state.filters.tel || undefined,
      fax: state.filters.fax || undefined,
      page: state.page,
      per_page: state.per_page,
      sort_by: sortBy as ListKanriShitenQuery['sort_by'],
      sort_order: state.sort_order,
    };
    const res = await listKanriShiten(params);
    rows.value = res.data;
    total.value = res.meta.total;
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

async function fetchTodofuken(): Promise<void> {
  try {
    const resp = await getTodofukenList();
    // BE envelope is `{ data: TodofukenItem[] }`. Spec mocks may pass a
    // plain array directly (buildTodofukenList helper) — accept both.
    todofukenOptions.value = Array.isArray(resp) ? resp : resp.data;
  } catch {
    // Dropdown is non-critical — keep view functional even if fetch fails.
    todofukenOptions.value = [];
  }
}

onMounted(() => {
  void fetchList();
  void fetchTodofuken();
});

// 検索 / 検索クリア — shared guard+fetch wiring (useTableQuery.searchActions).
const { onSearch, onClear } = searchActions({
  fetchList,
  // Trim text filters so paste artifacts / IME spaces don't widen the ILIKE
  // pattern. todofuken_code comes from a select — no whitespace to trim.
  beforeSearch() {
    state.filters.kanri_shiten_code = state.filters.kanri_shiten_code.trim();
    state.filters.kanri_shiten_name = state.filters.kanri_shiten_name.trim();
    state.filters.tel = state.filters.tel.trim();
    state.filters.fax = state.filters.fax.trim();
  },
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goCreate(): void {
  void router.push({ name: 'KanriShitenCreate' });
}

function goEdit(row: KanriShitenListItem): void {
  void router.push({ name: 'KanriShitenEdit', params: { id: row.kanri_shiten_id } });
}

function askDelete(row: KanriShitenListItem): void {
  confirmDelete('この管理支店を削除してもよろしいですか？', async () => {
    // ACSMS-MSG-008-005
    try {
      await removeKanriShiten(row.kanri_shiten_id);
      notify.deleted(); // ACSMS-MSG-008-006 '削除しました。' (verb-only)
      await fetchList();
    } catch {
      // Global interceptor handled 409 CONFLICT (ACSMS-MSG-008-004) /
      // 500 (ACSMS-MSG-008-003); view must NOT re-toast.
    }
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 5 fields laid out on a 4-column grid so the
         prefecture dropdown + 4 text fields wrap naturally to 2 rows. -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="kanri-shiten-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店コード</span>
        <a-input
          id="kanri-shiten-filter-1"
          v-model:value="state.filters.kanri_shiten_code"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="kanri-shiten-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店名</span>
        <a-input
          id="kanri-shiten-filter-2"
          v-model:value="state.filters.kanri_shiten_name"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="kanri-shiten-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">都道府県</span>
        <a-select
          id="kanri-shiten-filter-3"
          v-model:value="state.filters.todofuken_code"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
        >
          <a-select-option
            v-for="opt in todofukenOptions"
            :key="opt.todofuken_code"
            :value="opt.todofuken_code"
          >
            {{ opt.todofuken_name }}
          </a-select-option>
        </a-select>
      </label>
      <label for="kanri-shiten-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">電話番号</span>
        <a-input
          id="kanri-shiten-filter-4"
          v-model:value="state.filters.tel"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="kanri-shiten-filter-5" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">FAX</span>
        <a-input
          id="kanri-shiten-filter-5"
          v-model:value="state.filters.fax"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
        />
      </label>
    </BaseSearchForm>

    <!-- ACSMS-MSG-008-001 — empty-result message rendered separately
         (a-table's emptyText slot is not safely forwardable through
         BaseDataTable's dynamic slot loop). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="kanri-shiten-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="管理支店一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="kanri_shiten_id"
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
        <template v-if="column.key === 'kanri_shiten_code'">
          <!-- Code is the edit entry point. Anchor only when the user
               has update permission; otherwise plain text avoids a
               dead-end click. -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as KanriShitenListItem)"
          >
            {{ (record as KanriShitenListItem).kanri_shiten_code }}
          </a>
          <span v-else>{{ (record as KanriShitenListItem).kanri_shiten_code }}</span>
        </template>
        <template v-else-if="column.key === 'paper_flg'">
          <span v-if="(record as KanriShitenListItem).paper_flg" class="material-icons text-success text-base" aria-label="紙版あり">
            check_circle
          </span>
        </template>
        <template v-else-if="column.key === 'denshi_flg'">
          <span v-if="(record as KanriShitenListItem).denshi_flg" class="material-icons text-success text-base" aria-label="電子版あり">
            check_circle
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as KanriShitenListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

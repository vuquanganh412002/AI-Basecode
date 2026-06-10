<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Modal, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { listJa, removeJa, type JaListItem, type ListJaQuery } from '@/api/ja/ja';
import { getTodofukenList, type TodofukenItem } from '@/api/todofuken/todofuken';

interface JaFilters {
  ja_code: string;
  ja_name: string;
  /**
   * Prefecture code (2 chars). `undefined` = no filter (default state —
   * the antd <a-select allow-clear placeholder> renders the placeholder
   * instead of a "すべて" sentinel option). Cleared via the × icon.
   */
  todofuken_code: string | undefined;
}

const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();

// Permission gates per docs/database/seeder.md §3 ja.* matrix:
//   role 1 NICHINO_ADMIN : create / view / update / delete  (all 4)
//   role 3 CHUOKAI       : view / update  (no create / delete)
//   role 4 JA_HONTEN     : view / update  (no create / delete)
//   role 5 JA_KANRI_SHITEN: none — already filtered out at the router
//                            guard via `meta.permission: 'ja.view'`.
// Buttons / clickable cells must respect these flags so non-admin
// users don't see actions that the BE would 403 anyway.
const canCreate = computed(() => authStore.hasPermission('ja.create'));
const canUpdate = computed(() => authStore.hasPermission('ja.update'));
const canDelete = computed(() => authStore.hasPermission('ja.delete'));

const {
  state, loading, total, onChange, applyFilters, resetFilters, filtersChangedSinceApplied, isPristine,
} =
  useTableQuery<JaFilters>({
    defaultFilters: { ja_code: '', ja_name: '', todofuken_code: undefined },
    // Newest write (created or updated) appears first so users see
    // what they just changed at row 1. BE whitelist + default match
    // (ja.service.ts SORT_COLUMN_MAP + sort_by fallback).
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<JaListItem[]>([]);

/** 都道府県 dropdown options (ACSMS-API-COMMON-001). Fetched once on mount. */
const todofukenOptions = ref<TodofukenItem[]>([]);

// All columns carry an explicit width so adding sort icons does not
// reshape the table. Antd's default `tableLayout: 'auto'` divides leftover
// space among flex columns, so a sort arrow appearing on a sortable column
// makes other (widthless) columns shrink. Pinning every column's width and
// letting BaseDataTable's `scroll: { x: 'max-content' }` handle overflow
// keeps the layout stable on every sort click.
const columns: TableColumnsType = [
  { title: 'JAコード', dataIndex: 'ja_code', key: 'ja_code', sorter: true, width: 140 },
  { title: 'JA名', dataIndex: 'ja_name', key: 'ja_name', width: 220 },
  { title: '都道府県', dataIndex: 'todofuken_name', key: 'todofuken_name', sorter: true, width: 130 },
  { title: '郵便番号', dataIndex: 'yubin_no', key: 'yubin_no', width: 120 },
  { title: '住所', dataIndex: 'address', key: 'address', width: 280 },
  { title: '電話番号', dataIndex: 'tel', key: 'tel', width: 140 },
  { title: 'FAX', dataIndex: 'fax', key: 'fax', width: 140 },
  { title: '中央会フラグ', dataIndex: 'chuokai_flg', key: 'chuokai_flg', align: 'center', width: 130 },
  { title: '委託者コード', dataIndex: 'jastem_itakusha_code', key: 'jastem_itakusha_code', width: 140 },
  { title: '委託者名', dataIndex: 'jastem_itakusha_name', key: 'jastem_itakusha_name', width: 200 },
  { title: '農協番号', dataIndex: 'jastem_ja_code', key: 'jastem_ja_code', width: 110 },
  { title: '農協名', dataIndex: 'jastem_ja_name', key: 'jastem_ja_name', width: 160 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListJaQuery = {
      ja_code: state.filters.ja_code || undefined,
      ja_name: state.filters.ja_name || undefined,
      todofuken_code: state.filters.todofuken_code || undefined,
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by,
      sort_order: state.sort_order,
    };
    const res = await listJa(params);
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // Expected & ignored: the global axios interceptor in
    // src/api/error-handler.ts already toasted FORBIDDEN / 500.
    // Re-throwing would surface an unhandled rejection in onMounted's
    // fire-and-forget invocation. Per .claude/rules/vue.md, this is
    // an "expected and intentionally ignored" case — see fetch-on-mount
    // pattern.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function fetchTodofuken(): Promise<void> {
  try {
    const resp = await getTodofukenList();
    // BE envelope is `{ data: TodofukenItem[] }`. Spec fixtures may
    // pass a plain array directly (buildTodofukenList helper) — accept both.
    todofukenOptions.value = Array.isArray(resp)
      ? (resp as unknown as TodofukenItem[])
      : resp.data;
  } catch {
    // Non-critical — leave dropdown empty if lookup fails.
    todofukenOptions.value = [];
  }
}

onMounted(() => {
  void fetchList();
  void fetchTodofuken();
});

function onSearch(): void {
  // Trim leading/trailing whitespace so "  002001  " → "002001".
  // Paste artifacts and IME-confirmed spaces shouldn't alter the
  // search ILIKE pattern. Mutate state.filters directly so the input
  // visibly reflects the trimmed value too. todofuken_code is sourced
  // from a select — no whitespace to trim, pass through as-is.
  state.filters.ja_code = state.filters.ja_code.trim();
  state.filters.ja_name = state.filters.ja_name.trim();
  // Only fetch when the search would change what's on screen — skip when the
  // form matches the filters already applied to the displayed list (fresh
  // empty form, or re-pressing 検索 with no change). After clearing inputs by
  // hand this still fires once to restore the full list. 検索クリア resets.
  if (!filtersChangedSinceApplied()) return;
  applyFilters({ ...state.filters });
  void fetchList();
}

function onClear(): void {
  // 検索クリア is a no-op on a pristine screen — form already at defaults AND
  // the list already showing the default set. Skip the redundant fetch.
  if (isPristine()) return;
  resetFilters();
  void fetchList();
}

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goCreate(): void {
  void router.push({ name: 'JaCreate' });
}

function goEdit(row: JaListItem): void {
  void router.push({ name: 'JaEdit', params: { id: row.ja_id } });
}

function askDelete(row: JaListItem): void {
  Modal.confirm({
    title: '削除確認',
    content: 'このJAを削除してもよろしいですか？',
    // Project convention: confirm dialogs use はい / いいえ. The danger
    // styling already conveys "destructive" — see BaseConfirmModal default.
    okText: 'はい',
    okType: 'danger',
    cancelText: 'いいえ',
    async onOk() {
      try {
        await removeJa(row.ja_id);
        notify.deleted();
        await fetchList();
      } catch {
        // The global axios interceptor handles 409 CONFLICT
        // (ACSMS-MSG-004-003) and 500 (ACSMS-MSG-004-005); the view
        // must not re-toast — see .claude/rules/vue.md
        // §Error Handling Architecture.
      }
    },
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 4-column grid so the 2 fields occupy only the
         left half of the card (per design feedback). -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="ja-filter-code" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">JAコード</span>
        <a-input
          id="ja-filter-code"
          v-model:value="state.filters.ja_code"
          placeholder="JAコード"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="ja-filter-name" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">JA名</span>
        <a-input
          id="ja-filter-name"
          v-model:value="state.filters.ja_name"
          placeholder="JA名"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="ja-filter-todofuken" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">都道府県</span>
        <a-select
          id="ja-filter-todofuken"
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
    </BaseSearchForm>

    <!-- 一覧テーブル -->
    <!-- ACSMS-MSG-004-001 — empty-result message rendered separately
         (a-table's emptyText slot is not safely forwardable through
         BaseDataTable's dynamic slot loop). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="ja-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="JA一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="ja_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <!-- 新規登録 stays visible for every role; the button is just
             greyed-out when the user lacks ja.create. Same UX rule for
             削除 in the actions column below. -->
        <a-button
          type="primary"
          :disabled="!canCreate"
          @click="goCreate"
        >
          <template #icon>
            <span class="material-icons text-sm mr-1">add</span>
          </template>
          新規登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'ja_code'">
          <!-- ja_code is the click target for "open edit form". Only
               render as anchor when the user has ja.update — otherwise
               plain text so they don't get a dead link that would land
               on a 403-rebound dashboard. -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as JaListItem)"
          >
            {{ (record as JaListItem).ja_code }}
          </a>
          <span v-else>{{ (record as JaListItem).ja_code }}</span>
        </template>
        <template v-else-if="column.key === 'chuokai_flg'">
          {{ (record as JaListItem).chuokai_flg ? '中央会' : 'JA' }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <!-- 編集 link intentionally hidden — edit entry is the
               clickable ja_code cell above. 削除 stays visible but
               disabled when ja.delete is missing. -->
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as JaListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

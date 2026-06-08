<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { message, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseAccountDropdown from '@/components/common/BaseAccountDropdown.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useCodesStore } from '@/stores/codes.store';
import { ResultStatus } from '@/constants/enums';
import {
  listLogs,
  exportLogCsv,
  type ListLogsQuery,
  type ExportLogQuery,
  type LogListItem,
} from '@/api/log/log';
import {
  parseDatetimeWithSecondsTokyo,
  timestampForFilenameTokyo,
} from '@/utils/datetime';

const codes = useCodesStore();

interface LogFilters {
  date_from: string;
  date_to: string;
  log_type: number | null;
  account_id: number | null;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const {
  state, loading, total, onChange, applyFilters, resetFilters, filtersChangedSinceApplied, isPristine,
} =
  useTableQuery<LogFilters>({
    defaultFilters: {
      date_from: '',
      date_to: '',
      log_type: null,
      account_id: null,
    },
    defaultSortBy: 'log_datetime',
    defaultSortOrder: 'desc',
  });

const rows = ref<LogListItem[]>([]);

// 機能定義 1.3 — ログ種別 dropdown options (デフォルト = すべて).
// LOG_TYPE は Group A (TS enum あり) だが、表示ラベルは m_code 由来
// （customer が管理画面でラベルを変えても FE redeploy 不要）。
// 値で分岐するロジックは `LogType` 定数を使う（このファイルでは現状
// 分岐ロジック無し — 選択値はそのまま BE クエリへ渡すだけ）。
const LOG_TYPE_OPTIONS = computed(() => codes.options('LOG_TYPE'));

const columns: TableColumnsType = [
  { title: '日時', dataIndex: 'log_datetime', key: 'log_datetime', sorter: true, width: 180 },
  { title: 'ユーザーID', dataIndex: 'login_id', key: 'login_id', width: 160 },
  { title: '操作', key: 'operation', width: 320 },
  { title: '結果', key: 'result', width: 100 },
  { title: '詳細', dataIndex: 'after_value', key: 'after_value' },
];

function buildQuery(): ListLogsQuery {
  return {
    date_from: state.filters.date_from || undefined,
    date_to: state.filters.date_to || undefined,
    log_type: state.filters.log_type ?? undefined,
    account_id: state.filters.account_id ?? undefined,
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by as ListLogsQuery['sort_by'],
    sort_order: state.sort_order,
  };
}

/**
 * Validates date range. Returns `true` when valid (or both blank), `false`
 * when invalid (and toasts the user-facing message — ACSMS-MSG-030-001 /
 * 030-002).
 *
 * Both ends are parsed as Asia/Tokyo via `@/utils/datetime` — the system
 * is JST-only operationally (`.claude/rules/vue.md §Date/Time`), so the
 * comparison must not depend on the browser's local TZ.
 */
function validateDateRange(): boolean {
  const from = state.filters.date_from?.trim();
  const to = state.filters.date_to?.trim();
  if (!from || !to) return true;
  const fromDate = parseDatetimeWithSecondsTokyo(from);
  const toDate = parseDatetimeWithSecondsTokyo(to);
  if (!fromDate || !toDate) return true;
  if (fromDate.getTime() > toDate.getTime()) {
    message.error('「開始日」は「終了日」以前の日付を入力してください。');
    return false;
  }
  if (toDate.getTime() - fromDate.getTime() > ONE_YEAR_MS) {
    message.error('検索期間は1年以内で指定してください。');
    return false;
  }
  return true;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listLogs(buildQuery());
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // Global axios interceptor already toasted FORBIDDEN / 500 — view only
    // clears local state so onMounted's fire-and-forget invocation doesn't
    // surface an unhandled rejection. Per .claude/rules/vue.md §List view
    // rule 5.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchList();
  // Account dropdown self-hydrates via <BaseAccountDropdown>'s onMounted
  // hook — no view-level fetch required.
});

function onSearch(): void {
  if (!validateDateRange()) return;
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

// Filename timestamp is built in Asia/Tokyo by `timestampForFilenameTokyo`
// — see `.claude/rules/vue.md §Date/Time`. Kept here as a tiny call-site
// for readability.

async function onCsvExport(): Promise<void> {
  if (!validateDateRange()) return;
  try {
    // Export the CURRENT screen page — same filters + sort + page + per_page
    // as the list, so the CSV matches exactly what's visible.
    const params: ExportLogQuery = {
      date_from: state.filters.date_from || undefined,
      date_to: state.filters.date_to || undefined,
      log_type: state.filters.log_type ?? undefined,
      account_id: state.filters.account_id ?? undefined,
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by as ExportLogQuery['sort_by'],
      sort_order: state.sort_order,
    };
    const blob = await exportLogCsv(params);
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log_export_${timestampForFilenameTokyo()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
    message.success('CSVファイルをダウンロードしました。');
  } catch {
    // Export mirrors the on-screen page (bounded by per_page), so there is
    // no row-limit error to handle. The global interceptor toasts 401 / 403
    // / 500 (system error ACSMS-MSG-030-006); the view must NOT re-toast.
  }
}

function resultBadgeClass(status: number): string {
  if (status === ResultStatus.SUCCESS) return 'bg-success-subtle text-success';
  if (status === ResultStatus.FAILURE) return 'bg-error-subtle text-error';
  return 'bg-warning-subtle text-warning';
}

// Spec-visible internals — `wrapper.vm.fetchList` lets pagination tests
// drive a re-fetch directly without going through `onSearch` (which
// resets `state.page` to 1 via `applyFilters`).
defineExpose({ state, fetchList });
</script>

<template>
  <div class="space-y-6">
    <!-- 検索条件エリア — 4-column grid; 4 fields fill the row. -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <!-- 期間（開始 / 終了） — antd <a-date-picker show-time> with Japanese
           jaJP locale (registered globally in App.vue's <ConfigProvider>).
           format=display (YYYY/MM/DD HH:mm:ss), value-format=wire (same)
           keeps the form-state field a plain string the BE accepts. -->
      <label for="log-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">期間（開始）</span>
        <a-date-picker
          id="log-filter-1"
          v-model:value="state.filters.date_from"
          :show-time="{ format: 'HH:mm:ss' }"
          format="YYYY/MM/DD HH:mm:ss"
          value-format="YYYY/MM/DD HH:mm:ss"
          placeholder="YYYY/MM/DD HH:mm:ss"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="log-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">期間（終了）</span>
        <a-date-picker
          id="log-filter-2"
          v-model:value="state.filters.date_to"
          :show-time="{ format: 'HH:mm:ss' }"
          format="YYYY/MM/DD HH:mm:ss"
          value-format="YYYY/MM/DD HH:mm:ss"
          placeholder="YYYY/MM/DD HH:mm:ss"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="log-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">ログ種別</span>
        <a-select
          id="log-filter-3"
          v-model:value="state.filters.log_type"
          placeholder="すべて"
          allow-clear
          class="flex-1"
        >
          <a-select-option
            v-for="opt in LOG_TYPE_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </a-select-option>
        </a-select>
      </label>
      <label for="log-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">ユーザー</span>
        <!-- BaseAccountDropdown: server-side paginated (50/page) +
             infinite scroll. Defaults intentionally — display
             `${login_id} ${account_name}` (disambiguates accounts that
             share a display name in log troubleshooting) + search both
             login_id and account_name. -->
        <div class="flex-1">
          <BaseAccountDropdown
            id="log-filter-4"
            v-model:value="state.filters.account_id"
            placeholder="選択してください"
          />
        </div>
      </label>
    </BaseSearchForm>

    <!-- ACSMS-MSG-030-003 — empty-result message rendered as a sibling
         outside the table (BaseDataTable's dynamic slot loop can't forward
         a-table's emptyText slot). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="log-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="ログ一覧"
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="log_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <a-button @click="onCsvExport">
          <template #icon>
            <span class="material-icons text-sm mr-1">download</span>
          </template>
          CSV出力
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'operation'">
          {{ (record as LogListItem).gamen_name }} {{ (record as LogListItem).operation }}
        </template>
        <template v-else-if="column.key === 'result'">
          <span
            class="px-2 py-1 rounded text-xs font-bold"
            :class="resultBadgeClass((record as LogListItem).result_status)"
          >
            {{ codes.label('RESULT_STATUS', (record as LogListItem).result_status) }}
          </span>
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

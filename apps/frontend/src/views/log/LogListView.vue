<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import {
  listLogs,
  exportLogCsv,
  type ListLogsQuery,
  type ExportLogQuery,
  type LogListItem,
} from '@/api/log/log';
import {
  listAccountDropdown,
  type AccountDropdownItem,
} from '@/api/account/account';

interface LogFilters {
  date_from: string;
  date_to: string;
  log_type: number | null;
  account_id: number | null;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const { state, loading, total, onChange, applyFilters, resetFilters } =
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
const accountOptions = ref<AccountDropdownItem[]>([]);

// 機能定義 1.3 — ログ種別 dropdown options (デフォルト = すべて).
const LOG_TYPE_OPTIONS = [
  { value: 1, label: 'ユーザー操作ログ' },
  { value: 2, label: 'システムログ' },
  { value: 3, label: 'エラーログ' },
  { value: 4, label: 'ファイルアップロード' },
];

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

function parseDatetime(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(se),
  );
}

/**
 * Validates date range. Returns `true` when valid (or both blank), `false`
 * when invalid (and toasts the user-facing message — ACSMS-MSG-030-001 /
 * 030-002).
 */
function validateDateRange(): boolean {
  const from = state.filters.date_from?.trim();
  const to = state.filters.date_to?.trim();
  if (!from || !to) return true;
  const fromDate = parseDatetime(from);
  const toDate = parseDatetime(to);
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

async function fetchAccountOptions(): Promise<void> {
  try {
    const resp = await listAccountDropdown();
    accountOptions.value = resp.data;
  } catch {
    accountOptions.value = [];
  }
}

onMounted(() => {
  void fetchList();
  void fetchAccountOptions();
});

function onSearch(): void {
  if (!validateDateRange()) return;
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

function timestampForFilename(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

async function onCsvExport(): Promise<void> {
  if (!validateDateRange()) return;
  try {
    const params: ExportLogQuery = {
      date_from: state.filters.date_from || undefined,
      date_to: state.filters.date_to || undefined,
      log_type: state.filters.log_type ?? undefined,
      account_id: state.filters.account_id ?? undefined,
    };
    const blob = await exportLogCsv(params);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log_export_${timestampForFilename(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    message.success('CSVファイルをダウンロードしました。');
  } catch (err: unknown) {
    // ACSMS-MSG-030-005 — EXPORT_LIMIT_EXCEEDED has a user-actionable
    // message ("条件を絞り込んでください") that the global interceptor
    // doesn't toast. The interceptor handles 401 / 403 / 500.
    const e = err as { response?: { data?: { error_code?: string; message?: string } } };
    if (e?.response?.data?.error_code === 'EXPORT_LIMIT_EXCEEDED') {
      message.error(
        e.response.data.message ??
          '検索結果が5,000件を超えています。条件を絞り込んでください。',
      );
    }
    // Other error codes: global interceptor toasts (system error
    // ACSMS-MSG-030-006). View must NOT re-toast.
  }
}

function resultBadgeClass(status: number): string {
  if (status === 1) return 'bg-success-subtle text-success';
  if (status === 2) return 'bg-error-subtle text-error';
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
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          期間（開始）
        </label>
        <a-date-picker
          v-model:value="state.filters.date_from"
          :show-time="{ format: 'HH:mm:ss' }"
          format="YYYY/MM/DD HH:mm:ss"
          value-format="YYYY/MM/DD HH:mm:ss"
          placeholder="YYYY/MM/DD HH:mm:ss"
          allow-clear
          class="flex-1"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          期間（終了）
        </label>
        <a-date-picker
          v-model:value="state.filters.date_to"
          :show-time="{ format: 'HH:mm:ss' }"
          format="YYYY/MM/DD HH:mm:ss"
          value-format="YYYY/MM/DD HH:mm:ss"
          placeholder="YYYY/MM/DD HH:mm:ss"
          allow-clear
          class="flex-1"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          ログ種別
        </label>
        <a-select
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
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium whitespace-nowrap text-text-main">
          ユーザ名
        </label>
        <a-select
          v-model:value="state.filters.account_id"
          placeholder="選択してください"
          allow-clear
          show-search
          :filter-option="
            (input: string, option: { children?: unknown }) =>
              String(option?.children ?? '').includes(input)
          "
          class="flex-1"
        >
          <a-select-option
            v-for="opt in accountOptions"
            :key="opt.account_id"
            :value="opt.account_id"
          >
            {{ opt.login_id }}: {{ opt.account_name }}
          </a-select-option>
        </a-select>
      </div>
    </BaseSearchForm>

    <!-- ACSMS-MSG-030-003 — empty-result message rendered as a sibling
         outside the table (BaseDataTable's dynamic slot loop can't forward
         a-table's emptyText slot). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="log-empty-message"
    >
      検索結果はありません。
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
            {{ (record as LogListItem).result_status_label }}
          </span>
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

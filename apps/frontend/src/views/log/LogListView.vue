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
import dayjs from 'dayjs';

import {
  isFutureDayTokyo,
  nowTokyo,
  parseDatetimeWithSecondsTokyo,
  timestampForFilenameTokyo,
} from '@/utils/datetime';
import { downloadBlob } from '@/utils/download';

const codes = useCodesStore();

interface LogFilters {
  date_from: string;
  date_to: string;
  log_type: number | null;
  account_id: number | null;
}

/**
 * 検索期間の上限（年）。ログ保持期間が 1年 → 5年 へ延びたのに合わせる
 * （顧客要件 2026-08）。ミリ秒定数ではなく暦で加算する — 365日×5 だと
 * うるう年ぶん2日足りず、ちょうど5年を指定したユーザーが弾かれる。
 */
const MAX_RANGE_YEARS = 5;

const {
  state, loading, total, onChange, searchActions,
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
 * 期間バリデーション。正常（または両方空）で `true`、不正で `false`（ユーザー向け
 * メッセージも toast — ACSMS-MSG-030-001 / 030-002）。両端は `@/utils/datetime` で
 * Asia/Tokyo 解釈（JST 運用・`.claude/rules/vue.md §Date/Time`）— 比較がブラウザ TZ に
 * 依存しないように。
 */
function validateDateRange(): boolean {
  const from = state.filters.date_from?.trim();
  const to = state.filters.date_to?.trim();

  // 未来日時にログは存在しないので、片側だけの指定でも先に弾く。カレンダーは
  // 未来日を無効化しているが、時刻部分は手入力できるため検証側でも見る。
  const now = nowTokyo().valueOf();
  const fromOnly = from ? parseDatetimeWithSecondsTokyo(from) : null;
  const toOnly = to ? parseDatetimeWithSecondsTokyo(to) : null;
  if (fromOnly && fromOnly.getTime() > now) {
    message.error('「開始日」に未来の日時は指定できません。');
    return false;
  }
  if (toOnly && toOnly.getTime() > now) {
    message.error('「終了日」に未来の日時は指定できません。');
    return false;
  }

  if (!from || !to) return true;
  const fromDate = fromOnly;
  const toDate = toOnly;
  if (!fromDate || !toDate) return true;
  if (fromDate.getTime() > toDate.getTime()) {
    message.error('「開始日」は「終了日」以前の日付を入力してください。');
    return false;
  }
  if (dayjs(fromDate).add(MAX_RANGE_YEARS, 'year').isBefore(dayjs(toDate))) {
    message.error(`検索期間は${MAX_RANGE_YEARS}年以内で指定してください。`);
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
    // グローバル axios interceptor が FORBIDDEN / 500 を toast 済 — view はローカル
    // 状態のみクリアし、onMounted の fire-and-forget で unhandled rejection を出さない
    // （.claude/rules/vue.md §List view rule 5）。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchList();
  // アカウントドロップダウンは <BaseAccountDropdown> の onMounted で自己 hydrate
  // — view 側の fetch は不要。
});

// 検索 / 検索クリア — 共通の guard+fetch 配線（useTableQuery.searchActions）。
const { onSearch, onClear } = searchActions({
  fetchList,
  // 先に期間を検証 — false なら検索中断。
  beforeSearch: validateDateRange,
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

// ファイル名タイムスタンプは `timestampForFilenameTokyo` が Asia/Tokyo で生成
// （`.claude/rules/vue.md §Date/Time`）。

async function onCsvExport(): Promise<void> {
  if (!validateDateRange()) return;
  try {
    // 現在の画面ページを出力 — 一覧と同じ filters+sort+page+per_page なので CSV が
    // 表示内容と完全一致。
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
    downloadBlob(blob, `log_export_${timestampForFilenameTokyo()}.csv`);
    message.success('CSVファイルをダウンロードしました。');
  } catch {
    // 出力は画面ページ（per_page 制限内）のミラーで行数上限エラーは無い。グローバル
    // interceptor が 401/403/500（システムエラー ACSMS-MSG-030-006）を toast 済 —
    // view は再 toast しない。
  }
}

function resultBadgeClass(status: number): string {
  if (status === ResultStatus.SUCCESS) return 'bg-success-subtle text-success';
  if (status === ResultStatus.FAILURE) return 'bg-error-subtle text-error';
  return 'bg-warning-subtle text-warning';
}

// spec 可視の内部 — `wrapper.vm.fetchList` でページングテストが `onSearch`
// （applyFilters で state.page を1に戻す）を経ずに再 fetch できる。
defineExpose({ state, fetchList });
</script>

<template>
  <div class="space-y-6">
    <!-- 検索条件エリア — 4項目を2列で 2 + 2 に割る（顧客要望 2026-08）。
         期間の2項目は `show-time` 付きで表示が「YYYY/MM/DD HH:mm:ss」と長い。
         4列だと 1 セルは
           (コンテナ960px - カード padding 32 - gap 16×3) / 4 = 220px
         しかなく、「期間（開始）」(6文字=84px) を引くとピッカーが 128px しか
         残らず「YYYY/MM/…」で切れていた。2列なら
           (960 - 32 - 16) / 2 = 456px → ピッカー 364px で日時が全部読める。
           行1: 期間（開始） | 期間（終了）
           行2: ログ種別 | ユーザー -->
    <BaseSearchForm
      :loading="loading"
      :columns="2"
      @search="onSearch"
      @clear="onClear"
    >
      <!-- 期間（開始 / 終了） — antd <a-date-picker show-time>、jaJP locale
           （App.vue の <ConfigProvider> で全体登録）。format=表示・value-format=送信
           とも YYYY/MM/DD HH:mm:ss にし、form-state を BE 受理の素の文字列に保つ。 -->
      <label for="log-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">期間（開始）</span>
        <!-- 未来日はログが存在しないので選ばせない（JST 基準・共通ヘルパー）。 -->
        <a-date-picker
          id="log-filter-1"
          v-model:value="state.filters.date_from"
          :show-time="{ format: 'HH:mm:ss' }"
          format="YYYY/MM/DD HH:mm:ss"
          value-format="YYYY/MM/DD HH:mm:ss"
          placeholder="YYYY/MM/DD HH:mm:ss"
          allow-clear
          :disabled-date="isFutureDayTokyo"
          class="flex-1 min-w-0"
        />
      </label>
      <label for="log-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">期間（終了）</span>
        <!-- 未来日はログが存在しないので選ばせない（JST 基準・共通ヘルパー）。 -->
        <a-date-picker
          id="log-filter-2"
          v-model:value="state.filters.date_to"
          :show-time="{ format: 'HH:mm:ss' }"
          format="YYYY/MM/DD HH:mm:ss"
          value-format="YYYY/MM/DD HH:mm:ss"
          placeholder="YYYY/MM/DD HH:mm:ss"
          allow-clear
          :disabled-date="isFutureDayTokyo"
          class="flex-1 min-w-0"
        />
      </label>
      <label for="log-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">ログ種別</span>
        <a-select
          id="log-filter-3"
          v-model:value="state.filters.log_type"
          placeholder="すべて"
          allow-clear
          class="flex-1 min-w-0"
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
        <!-- BaseAccountDropdown: サーバーページング(50/page)+無限スクロール。
             既定は意図的に表示 `${login_id} ${account_name}`（ログ調査で表示名が
             重複するアカウントを区別）＋ login_id・account_name 双方で検索。 -->
        <div class="flex-1 min-w-0">
          <BaseAccountDropdown
            id="log-filter-4"
            v-model:value="state.filters.account_id"
            placeholder="選択してください"
          />
        </div>
      </label>
    </BaseSearchForm>

    <!-- ACSMS-MSG-030-003 — 空結果メッセージはテーブル外の兄弟要素で表示
         （BaseDataTable の動的 slot ループは a-table の emptyText slot を転送不可）。 -->
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

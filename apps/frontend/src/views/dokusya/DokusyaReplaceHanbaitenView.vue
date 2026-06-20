<script setup lang="ts">
// ACSMS-SCR-015 — 購読者販売店一括置換画面.
//
// Searches 購読中 (tetsuzuki_shurui=1) subscribers via
// GET /api/v1/dokusya/replace-hanbaiten/search, lets the user check ≥1
// row, then bulk-replaces their 配達販売店 via
// POST /api/v1/dokusya/replace-hanbaiten.
//
// 機能定義 (screen-design.md §機能定義):
//   1.x  initial render — 支店 disabled until 管理支店 chosen; 適用日 /
//        置換先配達販売店 hidden until ≥1 row selected; 置換処理実行 disabled.
//   2.x  search — filters → searchDokusyaForReplace; empty → MSG-015-001.
//   3.x  検索クリア — reset filters + result list + selection + hide
//        適用日 / 置換先.
//   4.1  validation — 置換先 / 適用日 required (MSG-015-004); 置換先 ≠
//        現在の販売店 (MSG-015-005); 併読 (dokusya_shubetsu=3) or 電子版
//        クレカ (dokusya_shubetsu=2 && shiharai_hoho=6) ineligible
//        (MSG-015-006). On failure: surface message + do NOT call API.
//   4.2/4.3 confirm (MSG-015-007) → replaceDokusyaHanbaiten → success
//        toast (MSG-015-008) + clear selection + refresh list.
//   7.x  管理支店 change → reset 支店 + load getShitenDropdown(kanri_shiten_id);
//        clear 管理支店 → disable/empty 支店.
//
// Permission: dokusya.replace_hanbaiten (CHUOKAI / JA_HONTEN /
// JA_KANRI_SHITEN) — gated at the route guard (meta.permission).
//
// Server-side errors (SAME_HANBAITEN / INELIGIBLE_DOKUSYA /
// DATE_RANGE_INVALID) are toasted centrally by the global axios
// interceptor (.claude/rules/vue.md §Error Handling Architecture); the
// view pre-flights them client-side (§4.1) and, on a server reject,
// only resets local submitting state (no re-toast).

import { computed, onMounted, ref, watch } from 'vue';
import { Modal, message, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useAuthStore } from '@/stores/auth.store';
import { DokusyaShubetsu, ShiharaiHoho } from '@/constants/enums';
import {
  searchDokusyaForReplace,
  replaceDokusyaHanbaiten,
  type ReplaceSearchItem,
  type ReplaceSearchParams,
} from '@/api/dokusya/dokusya';
import { getKanriShitenDropdown } from '@/api/kanri-shiten/kanri-shiten';
import { getShitenDropdown } from '@/api/shiten/shiten';
import { getHanbaitenDropdown } from '@/api/hanbaiten/hanbaiten';

// ─── Filter state ─────────────────────────────────────────────────────

interface ReplaceFilters {
  kanri_shiten_id: number | undefined;
  shiten_id: number | undefined;
  kumiaiin_code: string;
  shimei: string;
  shimei_kana: string;
  haitatsu_address: string;
  hanbaiten_id: number | undefined;
  dokusya_kaishi_date_from: string;
  dokusya_kaishi_date_to: string;
}

const DEFAULT_FILTERS: ReplaceFilters = {
  kanri_shiten_id: undefined,
  shiten_id: undefined,
  kumiaiin_code: '',
  shimei: '',
  shimei_kana: '',
  haitatsu_address: '',
  hanbaiten_id: undefined,
  dokusya_kaishi_date_from: '',
  dokusya_kaishi_date_to: '',
};

const authStore = useAuthStore();

const {
  state,
  loading,
  total,
  onChange,
  searchActions,
} = useTableQuery<ReplaceFilters>({
  defaultFilters: { ...DEFAULT_FILTERS },
  defaultSortBy: 'kumiaiin_code',
  defaultSortOrder: 'asc',
});

const rows = ref<ReplaceSearchItem[]>([]);
const selectedRowKeys = ref<number[]>([]);

/** Staged replace form — revealed once ≥1 row is checked. */
const replaceForm = ref<{
  new_hanbaiten_id: number | undefined;
  hanbaiten_tekiyo_date: string;
}>({
  new_hanbaiten_id: undefined,
  hanbaiten_tekiyo_date: '',
});

const submitting = ref(false);

/** Validation message surfaced inside the search card (置換 pre-flight). */
const replaceError = ref<string>('');

// ─── Dropdown lookups ────────────────────────────────────────────────

interface KanriShitenOption {
  kanri_shiten_id: number;
  kanri_shiten_name: string;
}
interface ShitenOption {
  shiten_id: number;
  shiten_name: string;
}
interface HanbaitenOption {
  hanbaiten_id: number;
  hanbaiten_name: string;
}

const kanriShitenOptions = ref<KanriShitenOption[]>([]);
const shitenOptions = ref<ShitenOption[]>([]);
const hanbaitenOptions = ref<HanbaitenOption[]>([]);

/** 機能定義 1.1 — 支店 is disabled until a 管理支店 is chosen. */
const isShitenDisabled = computed(
  () => state.filters.kanri_shiten_id === undefined ||
    state.filters.kanri_shiten_id === null,
);

/** ≥1 row checked reveals 適用日 / 置換先 + enables 置換処理実行. */
const hasSelection = computed(() => selectedRowKeys.value.length > 0);

async function fetchKanriShitenDropdown(): Promise<void> {
  const jaId = authStore.user?.ja_id ?? 0;
  try {
    const res = await getKanriShitenDropdown(jaId);
    kanriShitenOptions.value = res.data.map((r) => ({
      kanri_shiten_id: r.kanri_shiten_id,
      kanri_shiten_name: r.kanri_shiten_name,
    }));
  } catch {
    kanriShitenOptions.value = [];
  }
}

async function fetchHanbaitenDropdown(): Promise<void> {
  try {
    const res = await getHanbaitenDropdown({});
    hanbaitenOptions.value = res.data.map((r) => ({
      hanbaiten_id: r.hanbaiten_id,
      hanbaiten_name: r.hanbaiten_name,
    }));
  } catch {
    hanbaitenOptions.value = [];
  }
}

/** 機能定義 7.x — load 支店 list scoped to the chosen 管理支店. */
async function fetchShitenDropdown(kanriShitenId: number): Promise<void> {
  try {
    const res = await getShitenDropdown({ kanri_shiten_id: kanriShitenId });
    shitenOptions.value = res.data.map((r) => ({
      shiten_id: r.shiten_id,
      shiten_name: r.shiten_name,
    }));
  } catch {
    shitenOptions.value = [];
  }
}

/**
 * 機能定義 7.x — when 管理支店 changes: reset the 支店 selection, then
 * (if a value was chosen) reload the 支店 dropdown scoped to it; when
 * cleared, empty/disable the 支店 dropdown.
 */
function onKanriShitenChange(value: number | undefined): void {
  state.filters.kanri_shiten_id = value;
  state.filters.shiten_id = undefined;
  if (value === undefined || value === null) {
    shitenOptions.value = [];
    return;
  }
  void fetchShitenDropdown(value);
}

// Mirror the handler when the spec mutates the filter directly (no
// @change event in jsdom): watch the bound value so 支店 still reloads.
watch(
  () => state.filters.kanri_shiten_id,
  (next, prev) => {
    if (next === prev) return;
    state.filters.shiten_id = undefined;
    if (next === undefined || next === null) {
      shitenOptions.value = [];
      return;
    }
    void fetchShitenDropdown(next);
  },
);

// ─── Columns (per index.html 検索結果テーブル) ──────────────────────────

const columns: TableColumnsType = [
  {
    title: '管理支店',
    dataIndex: 'kanri_shiten_name',
    key: 'kanri_shiten_name',
    sorter: true,
    width: 150,
  },
  {
    title: '支店',
    dataIndex: 'shiten_name',
    key: 'shiten_name',
    sorter: true,
    width: 140,
  },
  {
    title: '組合員コード',
    dataIndex: 'kumiaiin_code',
    key: 'kumiaiin_code',
    sorter: true,
    width: 130,
  },
  { title: '購読者名', dataIndex: 'shimei', key: 'shimei', width: 160 },
  {
    title: '配達先郵便',
    dataIndex: 'haitatsu_yubin_no',
    key: 'haitatsu_yubin_no',
    width: 120,
  },
  {
    title: '配達先住所',
    dataIndex: 'haitatsu_address',
    key: 'haitatsu_address',
    width: 280,
  },
  {
    title: '販売店コード',
    dataIndex: 'hanbaiten_code',
    key: 'hanbaiten_code',
    sorter: true,
    width: 130,
  },
  {
    title: '販売店名',
    dataIndex: 'hanbaiten_name',
    key: 'hanbaiten_name',
    width: 160,
  },
];

/** a-table row-selection config — checkbox column + select-all. */
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]): void => {
    selectedRowKeys.value = keys.map(Number);
  },
}));

// ─── Fetch / search ───────────────────────────────────────────────────

function buildSearchParams(): ReplaceSearchParams {
  const f = state.filters;
  const params: ReplaceSearchParams = {
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by as ReplaceSearchParams['sort_by'],
    sort_order: state.sort_order,
  };
  if (f.kanri_shiten_id !== undefined) params.kanri_shiten_id = f.kanri_shiten_id;
  if (f.shiten_id !== undefined) params.shiten_id = f.shiten_id;
  if (f.kumiaiin_code) params.kumiaiin_code = f.kumiaiin_code;
  if (f.shimei) params.shimei = f.shimei;
  if (f.shimei_kana) params.shimei_kana = f.shimei_kana;
  if (f.haitatsu_address) params.haitatsu_address = f.haitatsu_address;
  if (f.hanbaiten_id !== undefined) params.hanbaiten_id = f.hanbaiten_id;
  if (f.dokusya_kaishi_date_from)
    params.dokusya_kaishi_date_from = f.dokusya_kaishi_date_from;
  if (f.dokusya_kaishi_date_to)
    params.dokusya_kaishi_date_to = f.dokusya_kaishi_date_to;
  return params;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await searchDokusyaForReplace(buildSearchParams());
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // Expected & ignored: the global axios interceptor already toasted
    // FORBIDDEN / 500. Re-throwing would surface an unhandled rejection
    // in onMounted's fire-and-forget call (.claude/rules/vue.md §List
    // view rule 5).
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchKanriShitenDropdown();
  void fetchHanbaitenDropdown();
  // 初期表示でフィルタ未指定のまま検索を実行し、購読中の購読者一覧を
  // デフォルト表示する（検索ボタンを押さなくてもデータを表示）。
  void fetchList();
});

// ─── Event handlers ───────────────────────────────────────────────────

function trimTextFilters(): void {
  const f = state.filters;
  f.kumiaiin_code = f.kumiaiin_code.trim();
  f.shimei = f.shimei.trim();
  f.shimei_kana = f.shimei_kana.trim();
  f.haitatsu_address = f.haitatsu_address.trim();
}

// 検索 / 検索クリア — shared guard+fetch wiring (useTableQuery.searchActions)。
// 表示中の一覧と同じ条件での 検索 連打、デフォルト状態での クリア 連打は API を
// 呼ばない（重複呼び出し防止）。クリアは選択行・置換フォーム等のローカル状態を
// 常にクリアしてから、絞り込み中なら条件をリセットして一覧を再取得する。
const { onSearch, onClear } = searchActions({
  fetchList,
  beforeSearch: trimTextFilters,
  beforeClear() {
    selectedRowKeys.value = [];
    shitenOptions.value = [];
    replaceForm.value = {
      new_hanbaiten_id: undefined,
      hanbaiten_tekiyo_date: '',
    };
    replaceError.value = '';
  },
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

// ─── Replace validation messages (literals from screen-design.md §MSG) ─

const MSG_REQUIRED = '必須項目です。'; // ACSMS-MSG-015-004
const MSG_SAME_HANBAITEN = '現在の販売店と同じ販売店は選択できません。'; // ACSMS-MSG-015-005
const MSG_INELIGIBLE = '電子版クレカ決済者・併読者は編集・削除できません。'; // ACSMS-MSG-015-006
const MSG_CONFIRM = '選択した購読者の販売店を置換します。よろしいでしょうか？'; // ACSMS-MSG-015-007
const MSG_SUCCESS = '置換処理が完了しました。'; // ACSMS-MSG-015-008

/** Rows currently checked. */
const selectedRows = computed(() =>
  rows.value.filter((r) => selectedRowKeys.value.includes(r.dokusya_id)),
);

/**
 * 機能定義 4.1 — pre-flight client-side validation. Returns true when
 * every check passes; sets `replaceError` to the first violation
 * otherwise.
 */
function validateReplace(): boolean {
  replaceError.value = '';
  const form = replaceForm.value;
  // 置換先 required.
  if (form.new_hanbaiten_id === undefined || form.new_hanbaiten_id === null) {
    replaceError.value = MSG_REQUIRED;
    return false;
  }
  // 適用日 required.
  if (!form.hanbaiten_tekiyo_date) {
    replaceError.value = MSG_REQUIRED;
    return false;
  }
  // 置換先 ≠ a selected row's current 販売店.
  if (selectedRows.value.some((r) => r.hanbaiten_id === form.new_hanbaiten_id)) {
    replaceError.value = MSG_SAME_HANBAITEN;
    return false;
  }
  // 併読 / 電子版クレカ are ineligible.
  const ineligible = selectedRows.value.some(
    (r) =>
      r.dokusya_shubetsu === DokusyaShubetsu.BOTH ||
      (r.dokusya_shubetsu === DokusyaShubetsu.DIGITAL &&
        r.shiharai_hoho === ShiharaiHoho.CREDIT_CARD),
  );
  if (ineligible) {
    replaceError.value = MSG_INELIGIBLE;
    return false;
  }
  return true;
}

async function runReplace(): Promise<void> {
  const form = replaceForm.value;
  if (form.new_hanbaiten_id === undefined) return;
  submitting.value = true;
  try {
    await replaceDokusyaHanbaiten({
      dokusya_ids: [...selectedRowKeys.value],
      new_hanbaiten_id: form.new_hanbaiten_id,
      hanbaiten_tekiyo_date: form.hanbaiten_tekiyo_date,
    });
    // Custom copy (subject-bearing) — verb-only notify helpers don't fit.
    message.success(MSG_SUCCESS);
    selectedRowKeys.value = [];
    replaceForm.value = {
      new_hanbaiten_id: undefined,
      hanbaiten_tekiyo_date: '',
    };
    replaceError.value = '';
    await fetchList();
  } catch {
    // Server rejects (SAME_HANBAITEN / INELIGIBLE_DOKUSYA /
    // DATE_RANGE_INVALID) are toasted by the global axios interceptor;
    // the view only resets submitting state — no re-toast, no success.
  } finally {
    submitting.value = false;
  }
}

function onExecuteReplace(): void {
  if (!validateReplace()) return;
  Modal.confirm({
    title: '置換確認',
    content: MSG_CONFIRM,
    okText: 'はい',
    cancelText: 'いいえ',
    okType: 'primary',
    onOk() {
      return runReplace();
    },
  });
}

// Expose reactive state the spec drives / reads.
defineExpose({
  state,
  replaceForm,
  selectedRowKeys,
  rows,
  submitting,
  isShitenDisabled,
  shitenOptions,
  onKanriShitenChange,
});
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア -->
    <BaseSearchForm
      :loading="loading"
      :disable-submit="hasSelection"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <!-- 管理支店 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">管理支店</span>
        <a-select
          :value="state.filters.kanri_shiten_id"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
          @change="onKanriShitenChange"
        >
          <a-select-option
            v-for="opt in kanriShitenOptions"
            :key="opt.kanri_shiten_id"
            :value="opt.kanri_shiten_id"
          >
            {{ opt.kanri_shiten_name }}
          </a-select-option>
        </a-select>
      </div>

      <!-- 支店 (disabled until 管理支店 chosen) -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">支店</span>
        <a-select
          v-model:value="state.filters.shiten_id"
          placeholder="選択してください"
          allow-clear
          :disabled="isShitenDisabled"
          class="flex-1"
        >
          <a-select-option
            v-for="opt in shitenOptions"
            :key="opt.shiten_id"
            :value="opt.shiten_id"
          >
            {{ opt.shiten_name }}
          </a-select-option>
        </a-select>
      </div>

      <!-- 組合員コード -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">組合員コード</span>
        <a-input
          v-model:value="state.filters.kumiaiin_code"
          placeholder="組合員コード"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- 氏名 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">氏名</span>
        <a-input
          v-model:value="state.filters.shimei"
          placeholder="氏名"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- かな氏名 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">かな氏名</span>
        <a-input
          v-model:value="state.filters.shimei_kana"
          placeholder="かな氏名"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- 配達先住所 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">配達先住所</span>
        <a-input
          v-model:value="state.filters.haitatsu_address"
          placeholder="配達先住所"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- 配達販売店 -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">配達販売店</span>
        <a-select
          v-model:value="state.filters.hanbaiten_id"
          placeholder="選択してください"
          allow-clear
          class="flex-1"
        >
          <a-select-option
            v-for="opt in hanbaitenOptions"
            :key="opt.hanbaiten_id"
            :value="opt.hanbaiten_id"
          >
            {{ opt.hanbaiten_name }}
          </a-select-option>
        </a-select>
      </div>

      <!-- 購読開始日 (date range) -->
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">購読開始日</span>
        <a-date-picker
          v-model:value="state.filters.dokusya_kaishi_date_from"
          value-format="YYYY-MM-DD"
          format="YYYY/MM/DD"
          placeholder="YYYY/MM/DD"
          allow-clear
          class="flex-1"
        />
        <span class="text-text-description">-</span>
        <a-date-picker
          v-model:value="state.filters.dokusya_kaishi_date_to"
          value-format="YYYY-MM-DD"
          format="YYYY/MM/DD"
          placeholder="YYYY/MM/DD"
          allow-clear
          class="flex-1"
        />
      </div>

      <!-- 適用日 / 置換先配達販売店 — revealed once ≥1 row selected
           (機能定義 1.1 / 5.x). Wrapped col-span-full so the two
           required fields drop onto their own row beneath the filters. -->
      <div
        v-if="hasSelection"
        class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-center"
      >
        <!-- 適用日 -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">適用日</span>
          <span class="text-error">*</span>
          <a-date-picker
            v-model:value="replaceForm.hanbaiten_tekiyo_date"
            value-format="YYYY-MM-DD"
            format="YYYY/MM/DD"
            placeholder="YYYY/MM/DD"
            allow-clear
            class="flex-1"
          />
        </div>

        <!-- 置換先配達販売店 -->
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <span class="whitespace-nowrap">置換先配達販売店</span>
          <span class="text-error">*</span>
          <a-select
            v-model:value="replaceForm.new_hanbaiten_id"
            placeholder="選択してください"
            allow-clear
            class="flex-1"
          >
            <a-select-option
              v-for="opt in hanbaitenOptions"
              :key="opt.hanbaiten_id"
              :value="opt.hanbaiten_id"
            >
              {{ opt.hanbaiten_name }}
            </a-select-option>
          </a-select>
        </div>
      </div>

      <!-- 置換処理実行 — enabled once ≥1 row selected. -->
      <template #extra>
        <a-button
          html-type="button"
          type="primary"
          :disabled="!hasSelection"
          :loading="submitting"
          @click="onExecuteReplace"
        >
          置換処理実行
        </a-button>
      </template>
    </BaseSearchForm>

    <!-- Replace pre-flight validation message (ACSMS-MSG-015-004/005/006). -->
    <p
      v-if="replaceError"
      class="text-error text-sm"
      data-test="replace-validation-error"
    >
      {{ replaceError }}
    </p>

    <!-- ACSMS-MSG-015-001 — empty-result message rendered separately
         (BaseDataTable's dynamic slot loop can't forward a-table's
         #emptyText slot safely). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="replace-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="購読者一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      :row-selection="rowSelection"
      row-key="dokusya_id"
      @change="onPageChange"
    />
  </div>
</template>

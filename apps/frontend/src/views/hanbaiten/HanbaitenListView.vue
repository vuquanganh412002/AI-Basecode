<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Modal, type TableColumnsType } from 'ant-design-vue';

import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import {
  listHanbaiten,
  removeHanbaiten,
  type HanbaitenListItem,
  type ListHanbaitenQuery,
} from '@/api/hanbaiten/hanbaiten';

// 機能定義 1.1 / 2.1 — 廃店フラグが立っているものは販売店の一覧に表示しない。
// haiten_flg=true をチェックした場合のみ廃店レコードも含めて検索する。
interface HanbaitenFilters {
  hanbaiten_code: string;
  hanbaiten_name: string;
  tel: string;
  fax: string;
  address: string;
  shocho_name: string;
  /** Default false — 廃店フラグの立つレコードを除外する。 */
  haiten_flg: boolean;
  /**
   * [staff-ja-filter] NICHINO_STAFF (session.ja_id == null) selects a
   * JA via BaseJaDropdown before any search runs. Null means "no JA
   * picked yet" — the list stays empty for staff until a JA is
   * chosen. Non-staff roles ignore this field; the BE uses
   * session.ja_id for them.
   */
  ja_id: number | null;
}

const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const codes = useCodesStore();

// Permission gates per seeder.md §3 hanbaiten matrix.
// CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN hold {view, create, update, delete}.
// NICHINO_STAFF holds only `hanbaiten.daiko_input` (代行入力) — it can
// reach this screen via the menu entry that targets the same route, and
// gets create / update through the daiko_input permission. Delete stays
// off for staff (代行入力 doesn't include removal authority).
const canCreate = computed(
  () =>
    authStore.hasPermission('hanbaiten.create') ||
    authStore.hasPermission('hanbaiten.daiko_input'),
);
const canUpdate = computed(
  () =>
    authStore.hasPermission('hanbaiten.update') ||
    authStore.hasPermission('hanbaiten.daiko_input'),
);
const canDelete = computed(() => authStore.hasPermission('hanbaiten.delete'));

// [staff-ja-filter] NICHINO_STAFF has no session.ja_id — every search /
// list call must carry an explicit ja_id from the BaseJaDropdown above
// the search form. Detected via the dedicated daiko_input permission so
// we don't accidentally branch on role_code strings.
const isStaff = computed(() =>
  authStore.hasPermission('hanbaiten.daiko_input'),
);

const {
  state, loading, total, onChange, applyFilters, resetFilters, filtersChangedSinceApplied, isPristine,
} =
  useTableQuery<HanbaitenFilters>({
    defaultFilters: {
      hanbaiten_code: '',
      hanbaiten_name: '',
      tel: '',
      fax: '',
      address: '',
      shocho_name: '',
      haiten_flg: false,
      ja_id: null,
    },
    // api.md §sort_by default: hanbaiten_code asc (画面設計書 v1.2 §8.1).
    defaultSortBy: 'hanbaiten_code',
    defaultSortOrder: 'asc',
  });

const rows = ref<HanbaitenListItem[]>([]);

// Column order per index.html + screen-design.md v1.2 §検索結果テーブル:
// 販売店コード / 販売店名 / JA(コード+名称) / 都道府県 / 郵便番号 / 住所 /
// 電話番号 / FAX / 所長名 / 委託区分 / 配達手数料支払サイクル /
// 振込手数料負担区分 / 廃店フラグ / 操作.
// Sortable per 機能定義 8.1: hanbaiten_code, hanbaiten_name ONLY.
// Explicit widths keep the layout stable when the sort icon appears.
const columns: TableColumnsType = [
  { title: '販売店コード', dataIndex: 'hanbaiten_code', key: 'hanbaiten_code', sorter: true, width: 140 },
  { title: '販売店名', dataIndex: 'hanbaiten_name', key: 'hanbaiten_name', sorter: true, width: 200 },
  { title: 'JA', key: 'ja', width: 200 },
  { title: '都道府県', dataIndex: 'todofuken_name', key: 'todofuken_name', width: 120 },
  { title: '郵便番号', dataIndex: 'yubin_no', key: 'yubin_no', width: 110 },
  { title: '住所', dataIndex: 'address', key: 'address', width: 260 },
  { title: '電話番号', dataIndex: 'tel', key: 'tel', width: 140 },
  { title: 'FAX', dataIndex: 'fax', key: 'fax', width: 140 },
  { title: '所長名', dataIndex: 'shocho_name', key: 'shocho_name', width: 140 },
  { title: '委託区分', dataIndex: 'itaku_kubun', key: 'itaku_kubun', align: 'center', width: 110 },
  { title: '配達手数料支払サイクル', dataIndex: 'haitatsuryo_shiharai_cycle', key: 'haitatsuryo_shiharai_cycle', align: 'center', width: 180 },
  { title: '振込手数料負担区分', dataIndex: 'furikomi_tesuryo_futan_kubun', key: 'furikomi_tesuryo_futan_kubun', align: 'center', width: 160 },
  { title: '廃店フラグ', dataIndex: 'haiten_flg', key: 'haiten_flg', align: 'center', width: 110 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListHanbaitenQuery = {
      hanbaiten_code: state.filters.hanbaiten_code || undefined,
      hanbaiten_name: state.filters.hanbaiten_name || undefined,
      tel: state.filters.tel || undefined,
      fax: state.filters.fax || undefined,
      address: state.filters.address || undefined,
      shocho_name: state.filters.shocho_name || undefined,
      // When true, include 廃店 rows. When false, BE applies default
      // (exclude 廃店). Pass-through both states explicitly so the
      // spec can assert `haiten_flg: true` was sent.
      haiten_flg: state.filters.haiten_flg,
      // [staff-ja-filter] only sent when set — non-staff omit the key
      // and the BE falls back to session.ja_id.
      ja_id: state.filters.ja_id ?? undefined,
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by as ListHanbaitenQuery['sort_by'],
      sort_order: state.sort_order,
    };
    const res = await listHanbaiten(params);
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // Expected & ignored: the global axios interceptor in
    // src/api/error-handler.ts already toasted FORBIDDEN / 500
    // (ACSMS-MSG-018-002 / ACSMS-MSG-018-003). Re-throwing would surface
    // an unhandled rejection in onMounted's fire-and-forget invocation.
    // Per .claude/rules/vue.md §List view rule 5.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

// [staff-ja-required] For NICHINO_STAFF, JA is a REQUIRED search condition.
// The list starts empty and only populates after a JA is picked — never
// auto-load every tenant. While no JA is selected, show the prompt instead
// of the "no results" message. Non-staff roles are unaffected (session.ja_id
// scopes them, list auto-loads on mount as before).
const staffMustPickJa = computed(
  () => isStaff.value && state.filters.ja_id == null,
);

// Field-level required error on the staff JA dropdown. Set when staff runs
// 検索 without a JA picked; cleared once a JA is chosen / filters reset.
const jaRequiredError = ref(false);

// Run a search, but for staff short-circuit to an empty list when no JA is
// picked (JA is required). Non-staff always fetch.
function runSearch(): void {
  if (staffMustPickJa.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  void fetchList();
}

onMounted(() => {
  // Staff: keep the list empty until a JA is chosen (機能: 代行検索は
  // JA選択が前提). Non-staff: auto-load their scoped list as before.
  if (!isStaff.value) void fetchList();
});

function onJaFilterChange(v: number | null): void {
  // [staff-ja-filter] Pin the new JA into the filter state and refetch
  // immediately so staff don't need a 検索 click after switching JA.
  // Clearing the JA (v === null) drops back to the empty prompt state.
  state.filters.ja_id = v;
  // Picking a JA satisfies the requirement → clear the field error.
  if (v != null) jaRequiredError.value = false;
  applyFilters({ ...state.filters });
  runSearch();
}

function onSearch(): void {
  // Trim leading/trailing whitespace so paste artifacts / IME-confirmed
  // spaces don't widen the ILIKE pattern. haiten_flg is a checkbox —
  // no whitespace to trim.
  state.filters.hanbaiten_code = state.filters.hanbaiten_code.trim();
  state.filters.hanbaiten_name = state.filters.hanbaiten_name.trim();
  state.filters.tel = state.filters.tel.trim();
  state.filters.fax = state.filters.fax.trim();
  state.filters.address = state.filters.address.trim();
  state.filters.shocho_name = state.filters.shocho_name.trim();
  // [staff-ja-required] Clicking 検索 without a JA flags the field as
  // required (機能: 代行検索は JA選択が前提) and skips the fetch.
  if (staffMustPickJa.value) {
    jaRequiredError.value = true;
    rows.value = [];
    total.value = 0;
    return;
  }
  jaRequiredError.value = false;
  // Only fetch when the search would change what's on screen — skip when the
  // form matches the filters already applied to the displayed list (fresh
  // empty form, or re-pressing 検索 with no change). After clearing inputs by
  // hand this still fires once to restore the full list. 検索クリア resets.
  // (Staff with no JA already returned above via the required guard.)
  if (!filtersChangedSinceApplied()) return;
  applyFilters({ ...state.filters });
  void fetchList();
}

function onClear(): void {
  // 検索クリア is a no-op on a pristine screen — form already at defaults AND
  // the list already showing the default set. Skip the redundant fetch.
  if (isPristine()) return;
  resetFilters();
  jaRequiredError.value = false;
  // Staff: ja_id reset to null → runSearch keeps the list empty + shows
  // the JA prompt. Non-staff: reloads their scoped list.
  runSearch();
}

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  runSearch();
}

function goCreate(): void {
  // [staff-ja-prefill] When NICHINO_STAFF has a JA selected in the search
  // filter, forward it to the create form via Vue Router HISTORY STATE
  // (window.history.state.jaId) — NOT a query param, so the URL stays clean
  // `/hanbaiten/create` (customer decision 2026-06). The form pre-selects
  // it; staff can still change it. JA-scoped roles don't carry it — the BE
  // binds session.ja_id for them.
  if (isStaff.value && state.filters.ja_id != null) {
    void router.push({
      name: 'HanbaitenCreate',
      state: { jaId: state.filters.ja_id },
    });
    return;
  }
  void router.push({ name: 'HanbaitenCreate' });
}

function goEdit(row: HanbaitenListItem): void {
  void router.push({ name: 'HanbaitenEdit', params: { id: row.hanbaiten_id } });
}

function askDelete(row: HanbaitenListItem): void {
  Modal.confirm({
    title: '削除確認',
    // ACSMS-MSG-018-005.
    content: 'この販売店を削除してもよろしいですか？',
    okText: 'はい',
    okType: 'danger',
    cancelText: 'いいえ',
    async onOk() {
      try {
        await removeHanbaiten(row.hanbaiten_id);
        // notify.deleted() emits '削除しました。' (ACSMS-MSG-018-006).
        notify.deleted();
        await fetchList();
      } catch {
        // The global axios interceptor handles 409 CONFLICT
        // (ACSMS-MSG-018-004) and 500 (ACSMS-MSG-018-003); view must
        // NOT re-toast — see .claude/rules/vue.md §Error Handling Architecture.
      }
    },
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 4-col grid; the 7 fields wrap onto 2 rows.
         [staff-ja-filter] NICHINO_STAFF gets an 8th cell (JA picker)
         appended at the END of the form so the search panel reads as
         one consistent block. The JA picker triggers an immediate
         refetch on change (no 検索 click required) because the rest
         of the form is empty by design when staff first lands here. -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <label for="hanbaiten-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">販売店コード</span>
        <a-input
          id="hanbaiten-filter-1"
          v-model:value="state.filters.hanbaiten_code"
          placeholder="販売店コード"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="hanbaiten-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">販売店名</span>
        <a-input
          id="hanbaiten-filter-2"
          v-model:value="state.filters.hanbaiten_name"
          placeholder="販売店名"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="hanbaiten-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">電話番号</span>
        <a-input
          id="hanbaiten-filter-3"
          v-model:value="state.filters.tel"
          placeholder="電話番号"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="hanbaiten-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">FAX</span>
        <a-input
          id="hanbaiten-filter-4"
          v-model:value="state.filters.fax"
          placeholder="FAX番号"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="hanbaiten-filter-5" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">住所</span>
        <a-input
          id="hanbaiten-filter-5"
          v-model:value="state.filters.address"
          placeholder="住所"
          allow-clear
          class="flex-1"
        />
      </label>
      <label for="hanbaiten-filter-6" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">所長名</span>
        <a-input
          id="hanbaiten-filter-6"
          v-model:value="state.filters.shocho_name"
          placeholder="所長名"
          allow-clear
          class="flex-1"
        />
      </label>
      <div class="flex items-center gap-2">
        <!-- Invisible spacer label matches the natural label column
             width of other cells (販売店コード / 電話番号 / 住所 …) so
             the checkbox aligns with the input boxes above instead
             of hugging the cell's left edge. -->
        <span
          class="text-sm font-medium whitespace-nowrap invisible"
          aria-hidden="true"
        >
          廃店フラグ
        </span>
        <a-checkbox v-model:checked="state.filters.haiten_flg">
          <span class="text-sm font-medium whitespace-nowrap text-text-main">
            廃店フラグ
          </span>
        </a-checkbox>
      </div>
      <!-- [staff-ja-required] Last cell for NICHINO_STAFF 代行検索.
           JA is a REQUIRED condition: the list starts empty and only
           populates after a JA is picked (picking one refetches scoped
           to that tenant). The * marker signals the requirement. -->
      <div
        v-if="isStaff"
        class="flex items-start gap-2 text-sm font-medium text-text-main"
        data-test="hanbaiten-staff-ja-filter"
      >
        <label
          for="hanbaiten-filter-staff-ja"
          class="flex items-center gap-1 whitespace-nowrap pt-1.5"
        >
          <span>JA名</span>
          <span class="text-error">*</span>
        </label>
        <div class="flex-1">
          <BaseJaDropdown
            id="hanbaiten-filter-staff-ja"
            :value="state.filters.ja_id"
            placeholder=""
            class="w-full"
            @update:value="onJaFilterChange"
          />
          <span
            v-if="jaRequiredError"
            class="text-error text-xs mt-1 block"
            data-test="hanbaiten-staff-ja-error"
          >
            必須項目です。
          </span>
        </div>
      </div>
    </BaseSearchForm>

    <!-- ACSMS-MSG-018-001 — 検索結果が見つかりませんでした。
         Rendered outside the table because a-table's #emptyText slot is
         not safely forwardable through BaseDataTable's dynamic slot loop.
         Suppressed for staff who haven't picked a JA yet (no search has
         run) — the required field handles that state instead. -->
    <p
      v-if="!loading && total === 0 && !staffMustPickJa"
      class="text-text-description text-sm"
      data-test="hanbaiten-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="販売店一覧"
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="hanbaiten_id"
      @change="onPageChange"
    >
      <template #headerActions>
        <!-- 販売店情報登録 stays visible for every role; greyed-out
             when the user lacks the create capability. Staff without
             a JA filter picks one inside the create form itself. -->
        <a-button
          type="primary"
          :disabled="!canCreate"
          @click="goCreate"
        >
          <template #icon>
            <span class="material-icons text-sm mr-1">add</span>
          </template>
          販売店情報登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'hanbaiten_code'">
          <!-- hanbaiten_code is the click target for "open edit form". Only
               render as anchor when the user has hanbaiten.update — otherwise
               plain text so they don't get a dead link that would land on a
               403-rebound dashboard. -->
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as HanbaitenListItem)"
          >
            {{ (record as HanbaitenListItem).hanbaiten_code }}
          </a>
          <span v-else>{{ (record as HanbaitenListItem).hanbaiten_code }}</span>
        </template>
        <template v-else-if="column.key === 'ja'">
          <span class="whitespace-nowrap">{{ (record as HanbaitenListItem).ja_code }}</span>
          <span class="ml-1">{{ (record as HanbaitenListItem).ja_name }}</span>
        </template>
        <template v-else-if="column.key === 'itaku_kubun'">
          {{ codes.label('ITAKU_KUBUN', (record as HanbaitenListItem).itaku_kubun) }}
        </template>
        <template v-else-if="column.key === 'haitatsuryo_shiharai_cycle'">
          <template v-if="(record as HanbaitenListItem).haitatsuryo_shiharai_cycle != null">
            {{ (record as HanbaitenListItem).haitatsuryo_shiharai_cycle }}ヵ月
          </template>
        </template>
        <template v-else-if="column.key === 'furikomi_tesuryo_futan_kubun'">
          {{ codes.label('TESURYO_KUBUN', (record as HanbaitenListItem).furikomi_tesuryo_futan_kubun) }}
        </template>
        <template v-else-if="column.key === 'haiten_flg'">
          <span v-if="(record as HanbaitenListItem).haiten_flg">廃店</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <!-- 編集 link intentionally hidden — edit entry is the
               clickable hanbaiten_code cell above. 削除 stays visible but
               disabled when hanbaiten.delete is missing (NICHINO_STAFF). -->
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as HanbaitenListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

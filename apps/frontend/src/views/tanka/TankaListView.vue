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
import { useCodesStore } from '@/stores/codes.store';
import { formatYen, formatTaxRate, formatDate } from '@/utils/formatters';
import {
  listTanka,
  removeTanka,
  type TankaListItem,
  type ListTankaQuery,
} from '@/api/tanka/tanka';

// 有効単価フラグ filter — radio group with two on-states. '' = both
// (default; api.md §4.3 "省略時は両方"), '1' = 有効中のみ, '0' = 停止中のみ.
// 検索クリア resets back to '' (radios deselect together). Coerced to
// boolean | undefined before hitting the wire so the BE sees the
// swagger-declared `active_flg: boolean`.
type ActiveFlgFilter = '' | '1' | '0';

interface TankaFilters {
  /**
   * Radio: '' (未選択 = 全件), '1' (新聞購読料), '2' (配達手数料).
   * 画面項目定義 row 1.0 — ラジオボタン.
   */
  tanka_type: '' | '1' | '2';
  tanka_name: string;
  /** YYYY-MM-DD or '' — native <input type="date"> binds. */
  tekiyo_start_date: string;
  /** YYYY-MM-DD or '' — native <input type="date"> binds. */
  tekiyo_end_date: string;
  active_flg: ActiveFlgFilter;
}

const router = useRouter();
const notify = useNotify();
const authStore = useAuthStore();
const codes = useCodesStore();

// Permission gates per docs/database/seeder.md §3 tanka.* matrix:
//   role 1 NICHINO_ADMIN / role 2 NICHINO_STAFF: no tanka.* perms (filtered
//                                                 at router meta.permission).
//   role 3 CHUOKAI / 4 JA_HONTEN / 5 JA_KANRI_SHITEN: full view + CRUD.
// UX rule (vue.md §Permission-aware list buttons): disable, don't hide —
// keeps the affordance discoverable when a user switches roles.
const canCreate = computed(() => authStore.hasPermission('tanka.create'));
const canUpdate = computed(() => authStore.hasPermission('tanka.update'));
const canDelete = computed(() => authStore.hasPermission('tanka.delete'));

const { state, loading, total, onChange, applyFilters, resetFilters } =
  useTableQuery<TankaFilters>({
    defaultFilters: {
      tanka_type: '',
      tanka_name: '',
      tekiyo_start_date: '',
      tekiyo_end_date: '',
      active_flg: '',
    },
    // 機能定義 §2.2 — 検索結果一覧は常に最新順で表示される.
    defaultSortBy: 'updated_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<TankaListItem[]>([]);

const columns: TableColumnsType = [
  { title: '単価種別', dataIndex: 'tanka_type', key: 'tanka_type', width: 130 },
  { title: '単価コード', dataIndex: 'tanka_code', key: 'tanka_code', sorter: true, width: 140 },
  { title: '単価名', dataIndex: 'tanka_name', key: 'tanka_name', sorter: true, width: 240 },
  { title: '適用開始日', dataIndex: 'tekiyo_start_date', key: 'tekiyo_start_date', sorter: true, width: 140 },
  { title: '適用終了日', dataIndex: 'tekiyo_end_date', key: 'tekiyo_end_date', sorter: true, width: 140 },
  // Customer feedback 2026-05-11: 有効単価フラグ column inserted between
  // 適用終了日 and 単価（税込）. Non-sortable per the sort_by whitelist in
  // SearchTankaDto.TANKA_SEARCH_SORT_BY — only 単価コード / 単価名 /
  // 適用開始日 / 適用終了日 are sortable axes for this list.
  { title: '有効単価フラグ', dataIndex: 'active_flg', key: 'active_flg', align: 'center', width: 130 },
  { title: '単価（税込）', dataIndex: 'kingaku_zeikomi', key: 'kingaku_zeikomi', align: 'right', width: 130 },
  { title: '単価（税抜）', dataIndex: 'kingaku_zeinuki', key: 'kingaku_zeinuki', align: 'right', width: 130 },
  { title: '税率', dataIndex: 'tax_rate', key: 'tax_rate', align: 'right', width: 90 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

function toBoolean(flag: ActiveFlgFilter): boolean | undefined {
  if (flag === '1') return true;
  if (flag === '0') return false;
  return undefined;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const params: ListTankaQuery = {
      tanka_type: state.filters.tanka_type ? Number(state.filters.tanka_type) : undefined,
      tanka_name: state.filters.tanka_name || undefined,
      tekiyo_start_date: state.filters.tekiyo_start_date || undefined,
      tekiyo_end_date: state.filters.tekiyo_end_date || undefined,
      active_flg: toBoolean(state.filters.active_flg),
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by,
      sort_order: state.sort_order,
    };
    const res = await listTanka(params);
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // Expected & ignored: src/api/error-handler.ts already toasted FORBIDDEN
    // / 500. Re-throwing would surface as an unhandled rejection inside
    // onMounted's fire-and-forget invocation. Per vue.md §List view rule 5.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchList);

function onSearch(): void {
  // Trim leading/trailing whitespace so "  基本  " → "基本". Paste
  // artifacts and IME-confirmed spaces shouldn't widen the ILIKE
  // pattern. Mutate state.filters directly so the input visibly
  // updates — clear feedback that 検索 did something (vue.md §List
  // view rule 5a).
  state.filters.tanka_name = state.filters.tanka_name.trim();
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
  void router.push({ name: 'TankaCreate' });
}

function goEdit(row: TankaListItem): void {
  void router.push({ name: 'TankaEdit', params: { id: row.tanka_id } });
}

function askDelete(row: TankaListItem): void {
  // ACSMS-MSG-002-005 — confirm copy verbatim from screen-design.md.
  Modal.confirm({
    title: '削除確認',
    content: 'この単価を削除してもよろしいですか？',
    okText: 'はい',
    okType: 'danger',
    cancelText: 'いいえ',
    async onOk() {
      try {
        await removeTanka(row.tanka_id);
        notify.deleted();  // ACSMS-MSG-002-007 — '削除しました。'
        await fetchList();
      } catch {
        // Global axios interceptor handles 409 CONFLICT
        // (ACSMS-MSG-002-006) and 500 (ACSMS-MSG-002-004); view must
        // NOT re-toast (vue.md §Error Handling Architecture rule 1).
      }
    },
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- 検索エリア — 4-column grid; the 5th field (有効単価フラグ) wraps
         to the next row. Mirrors docs/design/ACSMS-SCR-002/index.html
         (種別 radio / 名 text / 開始日 / 終了日 // フラグ radio). -->
    <BaseSearchForm
      :loading="loading"
      :columns="4"
      @search="onSearch"
      @clear="onClear"
    >
      <!-- 単価種別 — ラジオ per 画面項目定義 row 1.0. "未選択" is implicit:
           value '' clears the filter and is the default state after onClear. -->
      <label for="tanka-filter-1" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">単価種別</span>
        <a-radio-group id="tanka-filter-1" v-model:value="state.filters.tanka_type">
          <a-radio
            v-for="opt in codes.options('TANKA_TYPE')"
            :key="opt.value"
            :value="String(opt.value)"
          >
            {{ opt.label }}
          </a-radio>
        </a-radio-group>
      </label>

      <label for="tanka-filter-2" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">単価名</span>
        <a-input
          id="tanka-filter-2"
          v-model:value="state.filters.tanka_name"
          placeholder="単価名"
          allow-clear
          class="flex-1"
        />
      </label>

      <!-- 適用開始日 / 適用終了日 — antd's <a-date-picker> with explicit
           format='YYYY/MM/DD' (display) + value-format='YYYY-MM-DD' (wire).
           Native <input type='date'> rendered as dd/mm/yyyy on non-JP
           locale browsers; antd's picker pins the Japanese display
           format regardless of the user's OS locale. -->
      <label for="tanka-filter-3" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">適用開始日</span>
        <a-date-picker
          id="tanka-filter-3"
          v-model:value="state.filters.tekiyo_start_date"
          format="YYYY/MM/DD"
          value-format="YYYY-MM-DD"
          placeholder="YYYY/MM/DD"
          class="flex-1"
        />
      </label>

      <label for="tanka-filter-4" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">適用終了日</span>
        <a-date-picker
          id="tanka-filter-4"
          v-model:value="state.filters.tekiyo_end_date"
          format="YYYY/MM/DD"
          value-format="YYYY-MM-DD"
          placeholder="YYYY/MM/DD"
          class="flex-1"
        />
      </label>

      <!-- 有効単価フラグ — ラジオ. Two on-states (有効=1 / 無効=0); deselected
           (state value '') is the default and means "両方を返却" per
           api.md §4.3. 検索クリア resets to ''. -->
      <label for="tanka-filter-5" class="flex items-center gap-2 text-sm font-medium text-text-main">
        <span class="whitespace-nowrap">有効単価フラグ</span>
        <a-radio-group id="tanka-filter-5" v-model:value="state.filters.active_flg">
          <a-radio value="1">有効</a-radio>
          <a-radio value="0">無効</a-radio>
        </a-radio-group>
      </label>
    </BaseSearchForm>

    <!-- ACSMS-MSG-002-001 — empty-result message rendered as a sibling <p>
         OUTSIDE the table. BaseDataTable's dynamic slot loop crashes on the
         null slotProps antd passes to #emptyText (vue.md §List view rule 4). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="tanka-empty-message"
    >
      検索結果が見つかりませんでした。
    </p>

    <BaseDataTable
      title="単価一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="tanka_id"
      @change="onPageChange"
    >
      <template #headerActions>
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
        <template v-if="column.key === 'tanka_type'">
          <!-- BE returns numeric tanka_type; the customer-facing label
               comes from m_code (runtime-editable, no FE redeploy on
               rename). See .claude/rules/vue.md §Code Master. -->
          {{ codes.label('TANKA_TYPE', (record as TankaListItem).tanka_type) }}
        </template>
        <template v-else-if="column.key === 'tanka_code'">
          <a
            v-if="canUpdate"
            class="text-primary hover:underline"
            @click.prevent="goEdit(record as TankaListItem)"
          >
            {{ (record as TankaListItem).tanka_code }}
          </a>
          <span v-else>{{ (record as TankaListItem).tanka_code }}</span>
        </template>
        <template v-else-if="column.key === 'tanka_name'">
          <!-- Plain text — edit link lives on tanka_code (project
               convention; all other CRUD list screens follow this
               pattern). -->
          <span>{{ (record as TankaListItem).tanka_name }}</span>
        </template>
        <template v-else-if="column.key === 'tekiyo_start_date'">
          {{ formatDate((record as TankaListItem).tekiyo_start_date) }}
        </template>
        <template v-else-if="column.key === 'tekiyo_end_date'">
          <!-- 画面項目定義 row 10 — NULL（無期限）は「-」表示. -->
          {{
            (record as TankaListItem).tekiyo_end_date
              ? formatDate((record as TankaListItem).tekiyo_end_date)
              : '-'
          }}
        </template>
        <template v-else-if="column.key === 'active_flg'">
          <!-- Status badge — green for 有効 / red for 無効. Tag colour
               carries the semantic that's lost on plain text in a dense
               table; same convention as other status columns project-wide. -->
          <a-tag :color="(record as TankaListItem).active_flg ? 'success' : 'error'">
            {{ (record as TankaListItem).active_flg ? '有効' : '無効' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'kingaku_zeikomi'">
          {{ formatYen((record as TankaListItem).kingaku_zeikomi) }}
        </template>
        <template v-else-if="column.key === 'kingaku_zeinuki'">
          {{ formatYen((record as TankaListItem).kingaku_zeinuki) }}
        </template>
        <template v-else-if="column.key === 'tax_rate'">
          {{ formatTaxRate((record as TankaListItem).tax_rate) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <!-- 編集 hidden — entry is the clickable tanka_code / tanka_name
               cells above. 削除 stays visible but disabled when the user
               lacks tanka.delete. -->
          <BaseActionColumn
            :can-edit="false"
            :disable-delete="!canDelete"
            @delete="askDelete(record as TankaListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

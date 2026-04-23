<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import type { TableColumnsType } from 'ant-design-vue';
import BasePageHeader from '@/components/common/BasePageHeader.vue';
import BaseSearchForm from '@/components/common/BaseSearchForm.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import BaseConfirmModal from '@/components/common/BaseConfirmModal.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { ref } from 'vue';

interface TankaFilters {
  tanka_type?: 1 | 2;   // 1: 購読料, 2: 配達手数料
  tanka_name: string;
}

interface TankaRow {
  tanka_id: number;
  tanka_type: number;
  tanka_type_label: string;
  tanka_code: string;
  tanka_name: string;
  kingaku_zeikomi: number;
  kingaku_zeinuki: number;
  tax_rate: number;
}

const router = useRouter();

const { state, loading, total, onChange, applyFilters, resetFilters } =
  useTableQuery<TankaFilters>({
    defaultFilters: { tanka_type: 1, tanka_name: '' },
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
  });

const rows = ref<TankaRow[]>([]);

const columns: TableColumnsType = [
  { title: '単価種別', dataIndex: 'tanka_type_label', key: 'tanka_type_label', width: 120 },
  { title: '単価コード', dataIndex: 'tanka_code', key: 'tanka_code', sorter: true, width: 140 },
  { title: '単価名', dataIndex: 'tanka_name', key: 'tanka_name', sorter: true },
  {
    title: '単価（税込）',
    dataIndex: 'kingaku_zeikomi',
    key: 'kingaku_zeikomi',
    align: 'right',
    width: 140,
  },
  {
    title: '単価（税抜）',
    dataIndex: 'kingaku_zeinuki',
    key: 'kingaku_zeinuki',
    align: 'right',
    width: 140,
  },
  { title: '税率', dataIndex: 'tax_rate', key: 'tax_rate', align: 'center', width: 80 },
  { title: '操作', key: 'actions', align: 'center', width: 120 },
];

// Delete confirmation state
const deleteTarget = ref<TankaRow | null>(null);
const deleting = ref(false);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    // TODO: replace with generated API call
    // const res = await getTanka().tankaControllerList({ ...state, ...state.filters });
    // rows.value = res.data;
    // total.value = res.meta.total;
    rows.value = mockRows();
    total.value = 124;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchList);

function onSearch(): void {
  applyFilters(state.filters);
  fetchList();
}

function onClear(): void {
  resetFilters();
  fetchList();
}

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  fetchList();
}

function goCreate(): void {
  router.push({ name: 'TankaCreate' });
}

function goEdit(row: TankaRow): void {
  router.push({ name: 'TankaEdit', params: { id: row.tanka_id } });
}

function askDelete(row: TankaRow): void {
  deleteTarget.value = row;
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    // TODO: await getTanka().tankaControllerDelete(deleteTarget.value.tanka_id);
    message.success('単価を削除しました');
    deleteTarget.value = null;
    await fetchList();
  } finally {
    deleting.value = false;
  }
}

function formatYen(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function mockRows(): TankaRow[] {
  return [
    { tanka_id: 1, tanka_type: 1, tanka_type_label: '新聞購読料', tanka_code: 'T-001', tanka_name: '一般新聞月極', kingaku_zeikomi: 3500, kingaku_zeinuki: 3182, tax_rate: 10 },
    { tanka_id: 2, tanka_type: 1, tanka_type_label: '新聞購読料', tanka_code: 'T-002', tanka_name: '学生割引新聞', kingaku_zeikomi: 2800, kingaku_zeinuki: 2545, tax_rate: 10 },
    { tanka_id: 3, tanka_type: 2, tanka_type_label: '配達手数料', tanka_code: 'F-001', tanka_name: '早朝配達加算', kingaku_zeikomi: 500, kingaku_zeinuki: 455, tax_rate: 10 },
  ];
}
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader title="単価マスタ明細検索画面" />

    <BaseSearchForm
      :loading="loading"
      :columns="2"
      @search="onSearch"
      @clear="onClear"
    >
      <!-- Field 1: 単価種別 -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium whitespace-nowrap text-text-main w-20">
          単価種別
        </label>
        <a-radio-group v-model:value="state.filters.tanka_type">
          <a-radio :value="1">新聞購読料</a-radio>
          <a-radio :value="2">配達手数料</a-radio>
        </a-radio-group>
      </div>

      <!-- Field 2: 単価名 -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium whitespace-nowrap text-text-main w-20">
          単価名
        </label>
        <a-input
          v-model:value="state.filters.tanka_name"
          placeholder="単価名を入力"
          allow-clear
          class="flex-1"
        />
      </div>
    </BaseSearchForm>

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
        <a-button type="primary" @click="goCreate">
          <template #icon><span class="material-icons text-sm">add</span></template>
          新規登録
        </a-button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'tanka_code'">
          <a class="text-primary hover:underline" @click.prevent="goEdit(record as TankaRow)">
            {{ (record as TankaRow).tanka_code }}
          </a>
        </template>
        <template v-else-if="column.key === 'kingaku_zeikomi'">
          {{ formatYen((record as TankaRow).kingaku_zeikomi) }}
        </template>
        <template v-else-if="column.key === 'kingaku_zeinuki'">
          {{ formatYen((record as TankaRow).kingaku_zeinuki) }}
        </template>
        <template v-else-if="column.key === 'tax_rate'">
          {{ (record as TankaRow).tax_rate }}%
        </template>
        <template v-else-if="column.key === 'actions'">
          <BaseActionColumn
            @edit="goEdit(record as TankaRow)"
            @delete="askDelete(record as TankaRow)"
          />
        </template>
      </template>
    </BaseDataTable>

    <BaseConfirmModal
      :open="deleteTarget !== null"
      title="削除確認"
      :content="deleteTarget ? `単価「${deleteTarget.tanka_name}」を削除してもよろしいですか？\nこの操作は取り消せません。` : ''"
      ok-text="削除"
      cancel-text="キャンセル"
      danger
      :loading="deleting"
      @ok="confirmDelete"
      @update:open="(v) => !v && (deleteTarget = null)"
    />
  </div>
</template>

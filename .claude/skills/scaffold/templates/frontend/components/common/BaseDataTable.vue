<script setup lang="ts" generic="T extends Record<string, unknown>">
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';
import BaseCard from './BaseCard.vue';

interface Props {
  columns: TableColumnsType;
  rows: T[];
  loading?: boolean;
  rowKey?: string | ((row: T) => string);
  page: number;
  perPage: number;
  total: number;
  /** Title shown above the table (e.g. 単価一覧). Omit to hide the header bar. */
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rowKey: 'id',
});

const emit = defineEmits<{
  change: [pagination: TablePaginationConfig, filters: unknown, sorter: unknown];
}>();

function handleChange(
  pagination: TablePaginationConfig,
  filters: unknown,
  sorter: unknown,
): void {
  emit('change', pagination, filters, sorter);
}
</script>

<template>
  <BaseCard no-padding>
    <!-- Optional table header -->
    <div
      v-if="props.title || $slots.headerActions"
      class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"
    >
      <h3 v-if="props.title" class="font-bold text-slate-800 dark:text-slate-200">
        {{ props.title }}
      </h3>
      <div class="flex gap-2">
        <slot name="headerActions" />
      </div>
    </div>

    <a-table
      :columns="props.columns"
      :data-source="props.rows"
      :loading="props.loading"
      :row-key="props.rowKey"
      :pagination="{
        current: props.page,
        pageSize: props.perPage,
        total: props.total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (t: number) => `全 ${t} 件`,
      }"
      size="middle"
      @change="handleChange"
    >
      <template
        v-for="slotName in Object.keys($slots).filter((n) => n !== 'headerActions')"
        :key="slotName"
        #[slotName]="slotProps"
      >
        <slot :name="slotName" v-bind="slotProps" />
      </template>
    </a-table>
  </BaseCard>
</template>

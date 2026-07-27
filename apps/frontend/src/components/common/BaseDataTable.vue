<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue';
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
  /**
   * Optional per-row class hook — forwarded to a-table's `row-class-name`.
   * Use for highlighting the row currently being edited (form-on-top
   * list-below screens) or for selection state. Return `''` for no class.
   */
  rowClassName?: (row: T, index: number) => string;
  /**
   * Optional row-selection config forwarded to a-table — enables the
   * checkbox column (multi-select) or radio column (single-select).
   * Pass `{ selectedRowKeys, onChange }` for controlled multi-select.
   * See `apps/frontend/src/views/file-download/FileDownloadView.vue`
   * for canonical usage.
   */
  rowSelection?: Record<string, unknown>;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rowKey: 'id',
  rowClassName: undefined,
  rowSelection: undefined,
});

/**
 * 操作列（key='actions'）は横スクロール時も常に見えるよう右端に固定する
 * （プロジェクト共通・全 BaseDataTable に一律適用）。呼び出し側で明示的に
 * `fixed` を指定した場合はそれを尊重する。fixed 右寄せは antd の仕様上 `width`
 * が必要なため、未指定なら既定幅を補う。
 */
const displayColumns = computed<TableColumnsType>(() =>
  props.columns.map((col) => {
    const c = col as Record<string, unknown>;
    if (c.key !== 'actions' || c.fixed !== undefined) return col;
    return { ...col, fixed: 'right', width: (c.width as number) ?? 100 };
  }),
);

type SorterShape = { field?: string; order?: 'ascend' | 'descend' };

const emit = defineEmits<{
  change: [pagination: TablePaginationConfig, filters: unknown, sorter: SorterShape];
}>();

function handleChange(
  pagination: TablePaginationConfig,
  filters: unknown,
  sorter: unknown,
): void {
  emit('change', pagination, filters, sorter as SorterShape);
}
</script>

<template>
  <BaseCard padding="none">
    <!-- Optional table header -->
    <div
      v-if="props.title || $slots.headerActions"
      class="p-4 border-b border-border flex items-center justify-between gap-4"
    >
      <h3 v-if="props.title" class="font-bold text-text-main">
        {{ props.title }}
      </h3>
      <div class="flex gap-2">
        <slot name="headerActions" />
      </div>
    </div>

    <a-table
      :columns="displayColumns"
      :data-source="props.rows"
      :loading="props.loading"
      :row-key="props.rowKey"
      :row-class-name="props.rowClassName"
      :row-selection="props.rowSelection"
      :scroll="{ x: 'max-content' }"
      :pagination="{
        current: props.page,
        pageSize: props.perPage,
        total: props.total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (t: number) => `全 ${t} 件`,
        /* Always render the pagination bar — customer wants the
           size-changer + '全 N 件' total visible even with a single
           row of results. Antd's default IS to render-when-single, so
           we just don't pass `hideOnSinglePage: true`. */
        /* Project convention — left-aligned pagination per the screen
           mockups (cf. docs/design/ACSMS-SCR-004/index.html). Antd's
           default is bottomRight. */
        position: ['bottomLeft'],
        /* jaJP locale renders the page-size dropdown as '20 件 / ページ'
           but the design specifies '20 / 頁'. Override only items_per_page
           so every other pagination locale string keeps jaJP defaults. */
        locale: { items_per_page: '/ 頁' },
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

<style scoped>
/* Both the pagination row AND the first/last body cells use the SAME padding
   so the table's content edge lines up with the title bar's `p-4`.
   Using `padding` (not `margin`) on the pagination is what makes the first
   pagination element ("全 N 件") start at exactly the same x-coordinate as
   the first column's content. */
:deep(.ant-table-pagination.ant-table-pagination-left) {
  padding-left: 1rem;
  padding-right: 1rem;
  margin-left: 0;
  margin-right: 0;
}

/* Antd's `size="middle"` cells use 8px horizontal padding by default, so
   the first column would stick 8px from the card edge while the rest of
   the page sits at p-4 (16px). Bump the first / last cells (header + body)
   so the column-content edge matches everything else.
   `!important` is needed because antd's runtime style injection has higher
   specificity than scoped Vue styles. */
:deep(.ant-table-thead > tr > .ant-table-cell:first-child),
:deep(.ant-table-tbody > tr > .ant-table-cell:first-child) {
  padding-left: 1rem !important;
}
:deep(.ant-table-thead > tr > .ant-table-cell:last-child),
:deep(.ant-table-tbody > tr > .ant-table-cell:last-child) {
  padding-right: 1rem !important;
}

/* Antd's sortable column header uses `.ant-table-column-title { flex: auto }`
   which stretches the title to fill the cell, pushing the sort arrows to
   the far right. Anchor the title to its natural width so the sort icon
   sits right next to the text. */
:deep(.ant-table-column-sorters) {
  justify-content: flex-start !important;
  gap: 0.25rem;
}
:deep(.ant-table-column-title) {
  flex: 0 0 auto !important;
  flex-grow: 0 !important;
}
</style>

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
  /** テーブル上部のタイトル（例: 単価一覧）。省略でヘッダバー非表示。 */
  title?: string;
  /**
   * 任意の行クラスフック — a-table の `row-class-name` に転送。編集中の行の
   * ハイライト（フォーム上・一覧下の画面）や選択状態に使う。クラス無しは `''` を返す。
   */
  rowClassName?: (row: T, index: number) => string;
  /**
   * 任意の行選択設定 — a-table に転送し、チェックボックス列（複数選択）または
   * ラジオ列（単一選択）を有効化する。制御された複数選択は `{ selectedRowKeys, onChange }` を渡す。
   * 標準的な使い方は `apps/frontend/src/views/file-download/FileDownloadView.vue` 参照。
   */
  rowSelection?: Record<string, unknown>;
  /**
   * 「全 N 件」の後ろへ追記する画面固有の集計（例: 購読者検索の「全 M 部」）。
   * 省略時は従来どおり件数だけ。全リストへ波及させたくない指標をここで足す。
   */
  totalSuffix?: string;
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
    <!-- 任意のテーブルヘッダ -->
    <div
      v-if="props.title || $slots.headerActions"
      class="p-4 border-b border-border flex items-center flex-wrap justify-between gap-4"
    >
      <h3 v-if="props.title" class="font-bold text-text-main">
        {{ props.title }}
      </h3>
      <div class="flex flex-wrap gap-2">
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
        showTotal: (t: number) =>
          props.totalSuffix ? `全 ${t} 件　${props.totalSuffix}` : `全 ${t} 件`,
        /* ページネーションバーを常に表示 — 顧客要件で結果が 1 行でも size-changer +
           '全 N 件' 総数を見せる。antd の既定は単一ページでも表示なので
           `hideOnSinglePage: true` を渡さないだけでよい。 */
        /* プロジェクト規約 — 画面モック（docs/design/ACSMS-SCR-004/index.html）に従い
           左寄せページネーション。antd の既定は bottomRight。 */
        position: ['bottomLeft'],
        /* jaJP ロケールは page-size ドロップダウンを '20 件 / ページ' で表示するが
           デザインは '20 / 頁' 指定。items_per_page のみ上書きし、他のページネーション
           ロケール文字列は jaJP 既定を保つ。 */
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
/* ページネーション行と最初/最後のボディセルに同じ padding を使い、テーブルの
   コンテンツ端がタイトルバーの `p-4` に揃うようにする。ページネーションに
   （margin でなく）padding を使うことで、先頭要素（"全 N 件"）が最初の列コンテンツと
   同じ x 座標から始まる。 */
:deep(.ant-table-pagination.ant-table-pagination-left) {
  padding-left: 1rem;
  padding-right: 1rem;
  margin-left: 0;
  margin-right: 0;
}

/* antd の `size="middle"` セルは既定で 8px の水平 padding。放置すると最初の列が
   カード端から 8px の位置になり、ページ他要素の p-4（16px）とずれる。最初/最後のセル
   （ヘッダ + ボディ）を広げて列コンテンツ端を他と揃える。antd のランタイムスタイル注入は
   scoped Vue スタイルより詳細度が高いため `!important` が必要。 */
:deep(.ant-table-thead > tr > .ant-table-cell:first-child),
:deep(.ant-table-tbody > tr > .ant-table-cell:first-child) {
  padding-left: 1rem !important;
}
:deep(.ant-table-thead > tr > .ant-table-cell:last-child),
:deep(.ant-table-tbody > tr > .ant-table-cell:last-child) {
  padding-right: 1rem !important;
}

/* antd のソート可能な列ヘッダは `.ant-table-column-title { flex: auto }` で
   タイトルをセル一杯に伸ばし、ソート矢印を右端へ押しやる。タイトルを自然幅に固定し、
   ソートアイコンがテキストのすぐ隣に来るようにする。 */
:deep(.ant-table-column-sorters) {
  justify-content: flex-start !important;
  gap: 0.25rem;
}
:deep(.ant-table-column-title) {
  flex: 0 0 auto !important;
  flex-grow: 0 !important;
}
</style>

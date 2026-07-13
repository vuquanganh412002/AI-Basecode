<script setup lang="ts">
/**
 * 帳票プレビュー共通ページャ（SCR-026 をベースに 029 等と統一）。
 *
 * グループ単位ページング（1ページ=1販売店/管理支店）のため、総ページ数は行数では
 * なく `totalPages`（各グループを独立ページに割当てた総数）。antd の a-pagination は
 * `total / page-size` からページ数を算出するため、`totalPages × perPage` を total に
 * 渡す。`totalPages <= 1` のときは何も描画しない（ルート要素ごと非表示）。
 */
interface Props {
  /** 現在ページ（1始まり）。 */
  current: number;
  /** 帳票ヘッダ表記用の現在ページ番号（通常 current と同じ）。 */
  pageNo: number;
  /** 総ページ数（グループ独立ページの総数）。 */
  totalPages: number;
  /** 1ページの名目件数（a-pagination のページ数算出用）。 */
  perPage: number;
  /** 対象件数（「全N件」表記）。 */
  totalRows: number;
  /** ルート要素の data-test（画面ごとに指定）。 */
  dataTest?: string;
}

const props = withDefaults(defineProps<Props>(), { dataTest: 'report-pager' });
const emit = defineEmits<{ change: [page: number] }>();

function onChange(page: number): void {
  emit('change', page);
}
</script>

<template>
  <div
    v-if="props.totalPages > 1"
    class="px-6 py-3 border-t border-border flex items-center justify-between"
    :data-test="props.dataTest"
  >
    <span class="text-text-description text-sm">
      全{{ props.totalRows }}件・{{ props.pageNo }}/{{ props.totalPages }}ページ
    </span>
    <a-pagination
      :current="props.current"
      :total="props.totalPages * props.perPage"
      :page-size="props.perPage"
      :show-size-changer="false"
      @change="onChange"
    />
  </div>
</template>

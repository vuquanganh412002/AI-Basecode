<script setup lang="ts">
// Excel取込画面（購読者/販売店 等）の「取込データプレビュー」表を統一する共通
// コンポーネント。ACSMS-SCR-019(HanbaitenImportView)で先に実装したページング付き
// プレビューを正として、ACSMS-SCR-016(DokusyaImportView)にも適用する（UI統一
// 2026-08）。
//
// 全件は呼び出し側が parsedRows として保持し（件数バッジ・検証・送信に使う）、
// 本コンポーネントは `rows` を丸ごと受け取り、表示用のページングだけを内部で
// 持つ（大量行でも DOM/heap を膨らませないため）。新しいファイルが選択された
// ときは呼び出し側が ref 経由で `resetPage()` を呼び、1ページ目に戻す。

import { computed, ref } from 'vue';

interface Props {
  /** 取込対象の全行（画面側の parsedRows をそのまま渡す）。 */
  rows: Array<Record<string, unknown>>;
  /** 描画する列（チェック済みの物理名など）。 */
  columns: string[];
  /** 物理名 → 日本語ヘッダラベルの対応表。 */
  headerLabels: Record<string, string>;
  /** セル値の表示整形。省略時は null/undefined→空・boolean→✓/空・それ以外→String()。 */
  renderCell?: (value: unknown) => string;
  /** 1ページに描画する既定行数。 */
  pageSize?: number;
  /** page-size-changer の選択肢。 */
  pageSizeOptions?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  renderCell: undefined,
  pageSize: 20,
  pageSizeOptions: () => ['20', '50', '100', '200', '500'],
});

function defaultRenderCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '✓' : '';
  return String(value);
}

const cellRenderer = computed(() => props.renderCell ?? defaultRenderCell);

const currentPage = ref(1);
const currentPageSize = ref(props.pageSize);

const previewRows = computed(() => {
  const start = (currentPage.value - 1) * currentPageSize.value;
  return props.rows.slice(start, start + currentPageSize.value);
});

/** 呼び出し側から：新しいファイル選択・パース失敗時などに1ページ目へ戻す。 */
function resetPage(): void {
  currentPage.value = 1;
}

defineExpose({ resetPage });
</script>

<template>
  <div data-test="preview-section" class="space-y-2">
    <div class="flex items-center justify-between">
      <p class="text-sm font-semibold text-text-main">
        <span class="text-primary">◆</span>
        取込データプレビュー
        <span class="text-xs font-normal text-text-secondary ml-2">
          {{ rows.length }}件
        </span>
      </p>
    </div>
    <div class="overflow-x-auto border border-border rounded">
      <table class="w-full text-sm border-collapse min-w-max">
        <thead>
          <tr class="bg-surface-card-subtle text-left">
            <th
              v-for="col in columns"
              :key="col"
              class="px-3 py-2 text-sm font-semibold text-text-main border-b border-border"
            >
              {{ headerLabels[col] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIdx) in previewRows"
            :key="rowIdx"
            class="border-b border-border"
          >
            <td
              v-for="col in columns"
              :key="col"
              class="px-3 py-2 text-sm text-text-main"
            >
              {{ cellRenderer(row[col]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- 全件描画によるDOM/heap膨張を防ぎつつ全件を閲覧可能にする。BaseDataTable と
         同じ規約（左寄せ・'全 N 件'・'/ 頁'）に揃える。 -->
    <div v-if="rows.length > 0" class="flex justify-start pt-1" data-test="preview-pagination">
      <a-pagination
        v-model:current="currentPage"
        v-model:page-size="currentPageSize"
        :total="rows.length"
        size="small"
        show-size-changer
        :page-size-options="pageSizeOptions"
        :show-total="(t: number) => `全 ${t} 件`"
        :locale="{ items_per_page: '/ 頁' }"
      />
    </div>
  </div>
</template>

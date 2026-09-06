<script setup lang="ts">
// Excel取込画面（購読者/販売店 等）の行単位・項目単位サーバエラー表示を統一する
// 共通コンポーネント。ACSMS-SCR-019(HanbaitenImportView)の見た目を正として
// SCR-016(DokusyaImportView)にも適用する（UI統一 2026-08）。
//
// 表示のみを担う — 何件まで表示するか（例: 最大10件）はエラー配列を組み立てる
// 呼び出し側の責務（`errors.slice(0, 10)` 等）で、本コンポーネントは受け取った
// 配列をそのまま全件描画する。

export interface ImportErrorItem {
  row?: number;
  field?: string;
  message: string;
}

interface Props {
  errors: ImportErrorItem[];
  /** field の物理名 → 日本語ラベルの対応表。無ければ物理名をそのまま表示。 */
  fieldLabels?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  fieldLabels: () => ({}),
});

function fieldLabel(e: ImportErrorItem): string {
  if (!e.field) return '';
  return props.fieldLabels[e.field] ?? e.field;
}
</script>

<template>
  <div
    v-if="errors.length > 0"
    data-test="import-error-panel"
    class="mt-4 border border-error rounded overflow-hidden"
  >
    <div class="px-4 py-2.5 bg-error-subtle flex items-center gap-2">
      <span class="material-icons text-error text-[18px]">error_outline</span>
      <span class="text-sm font-semibold text-error">
        取込エラー（{{ errors.length }}件）
      </span>
    </div>
    <div class="max-h-72 overflow-y-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-surface-card-subtle text-left">
            <th
              class="px-4 py-2 font-semibold text-text-main border-b border-border w-20"
            >
              行
            </th>
            <th
              class="px-4 py-2 font-semibold text-text-main border-b border-border w-48"
            >
              項目
            </th>
            <th class="px-4 py-2 font-semibold text-text-main border-b border-border">
              メッセージ
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(e, i) in errors"
            :key="i"
            data-test="import-error-row"
            class="border-b border-border"
          >
            <td class="px-4 py-2 text-text-main whitespace-nowrap">
              {{ e.row != null ? `${e.row}行目` : '—' }}
            </td>
            <td class="px-4 py-2 text-text-main">{{ fieldLabel(e) || '—' }}</td>
            <td class="px-4 py-2 text-error">{{ e.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

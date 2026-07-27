<script setup lang="ts">
// ファイルプレビュー用モーダル（file-download / file-upload 共通）。
// 画像は <img>、PDF 等は <iframe> でインライン表示する。

interface Props {
  /** モーダル開閉（v-model:open）。 */
  open: boolean;
  /** 表示中ファイル名（タイトル）。 */
  fileName: string;
  /** S3 署名付き URL。 */
  url: string;
  /** 画像として表示するか（true=<img> / false=<iframe>）。 */
  isImage: boolean;
}
defineProps<Props>();
defineEmits<{ 'update:open': [value: boolean] }>();
</script>

<template>
  <a-modal
    :open="open"
    :title="fileName || 'プレビュー'"
    :footer="null"
    :width="900"
    destroy-on-close
    @update:open="$emit('update:open', $event)"
  >
    <template v-if="url">
      <img
        v-if="isImage"
        :src="url"
        :alt="fileName"
        class="w-full max-h-[70vh] object-contain bg-bg-layout"
      />
      <iframe
        v-else
        :src="url"
        class="w-full h-[70vh] border-0"
        :title="fileName"
      />
    </template>
  </a-modal>
</template>

<script setup lang="ts">
interface Props {
  /** 編集 ボタンを表示。既定 true。 */
  canEdit?: boolean;
  /** 削除 ボタンを表示。既定 true。 */
  canDelete?: boolean;
  /** 編集 をグレーアウト + 非クリックで表示（権限なし）。 */
  disableEdit?: boolean;
  /** 削除 をグレーアウト + 非クリックで表示（権限なし）。 */
  disableDelete?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true,
  canDelete: true,
  disableEdit: false,
  disableDelete: false,
});

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();
</script>

<template>
  <div class="flex justify-center gap-3">
    <button
      v-if="props.canEdit"
      type="button"
      :disabled="props.disableEdit"
      class="text-primary hover:text-primary-hover font-medium disabled:text-text-disabled disabled:hover:text-text-disabled disabled:cursor-not-allowed"
      @click="emit('edit')"
    >
      編集
    </button>
    <button
      v-if="props.canDelete"
      type="button"
      :disabled="props.disableDelete"
      class="text-error hover:text-error-hover font-medium disabled:text-text-disabled disabled:hover:text-text-disabled disabled:cursor-not-allowed"
      @click="emit('delete')"
    >
      削除
    </button>
  </div>
</template>

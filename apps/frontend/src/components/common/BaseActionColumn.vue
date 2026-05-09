<script setup lang="ts">
interface Props {
  /** Render the 編集 button. Default true. */
  canEdit?: boolean;
  /** Render the 削除 button. Default true. */
  canDelete?: boolean;
  /** Render 編集 but greyed-out + non-clickable (permission denied). */
  disableEdit?: boolean;
  /** Render 削除 but greyed-out + non-clickable (permission denied). */
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

<script setup lang="ts">
interface Props {
  canEdit?: boolean;
  canDelete?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true,
  canDelete: true,
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
      class="text-primary hover:text-primary-hover font-medium"
      @click="emit('edit')"
    >
      編集
    </button>
    <button
      v-if="props.canDelete"
      type="button"
      class="text-red-500 hover:text-red-700 font-medium"
      @click="emit('delete')"
    >
      削除
    </button>
  </div>
</template>

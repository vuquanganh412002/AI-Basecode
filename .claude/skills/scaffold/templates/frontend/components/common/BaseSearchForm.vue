<script setup lang="ts">
import BaseCard from './BaseCard.vue';

interface Props {
  loading?: boolean;
  /** Number of columns in the inputs grid. Default 4 (for 4-up layout on SCR-002). */
  columns?: 1 | 2 | 3 | 4;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  columns: 4,
});

const emit = defineEmits<{
  search: [];
  clear: [];
}>();

const gridClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};
</script>

<template>
  <BaseCard>
    <form
      class="space-y-4"
      @submit.prevent="emit('search')"
    >
      <!-- Field grid — consumer passes <FormField label="XX">…</FormField> -->
      <div :class="['grid gap-x-4 gap-y-3 items-center', gridClass[props.columns]]">
        <slot />
      </div>

      <div class="flex gap-3">
        <a-button
          type="primary"
          html-type="submit"
          :loading="props.loading"
          class="font-bold"
        >
          検索
        </a-button>
        <a-button
          html-type="button"
          @click="emit('clear')"
        >
          検索クリア
        </a-button>
        <!-- Extra buttons e.g. CSV出力 -->
        <slot name="extra" />
      </div>
    </form>
  </BaseCard>
</template>

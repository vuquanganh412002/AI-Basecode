<script setup lang="ts">
import BaseCard from './BaseCard.vue';

interface Props {
  loading?: boolean;
  /** Number of columns in the inputs grid. Default 4 (for the SCR-004 JA list).
      SCR-002 Tanka list uses 5 columns to fit 種別 / 名 / 開始日 / 終了日 / フラグ. */
  columns?: 1 | 2 | 3 | 4 | 5;
  /**
   * Disable the 検索 submit button independently of `loading`. SCR-015
   * disables search while a bulk-replace is staged (≥1 row checked) so
   * the user can't re-query and lose their selection.
   */
  disableSubmit?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  columns: 4,
  disableSubmit: false,
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
  5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
};
</script>

<template>
  <BaseCard>
    <form
      class="space-y-4"
      @submit.prevent="emit('search')"
    >
      <div :class="['grid gap-x-4 gap-y-3 items-center', gridClass[props.columns]]">
        <slot />
      </div>

      <div class="flex gap-3">
        <a-button
          type="primary"
          html-type="submit"
          :loading="props.loading"
          :disabled="props.disableSubmit"
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

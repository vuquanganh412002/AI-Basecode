<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from './BaseCard.vue';

interface NoticeItem {
  date: string;
  title: string;
}

interface Props {
  items: NoticeItem[];
  title?: string;
  /**
   * Rows shown before the list becomes scrollable (default 5). When the
   * notice count exceeds this, the list keeps every item but caps its
   * height and scrolls — so the login banner never pushes the form down.
   */
  maxVisible?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'お知らせ',
  maxVisible: 5,
});

// `max-h-52` (13rem) ≈ five text-xs rows; the 6th peeks in to signal the
// scroll. Approximate by design — long titles wrap, which is fine for a
// notice banner. Tied to the default maxVisible=5; callers overriding
// maxVisible only change the scroll threshold, not the pixel cap.
const isScrollable = computed(() => props.items.length > props.maxVisible);
</script>

<template>
  <BaseCard padding="none">
    <div class="px-4 py-3 border-b border-border bg-surface-card-subtle">
      <h2
        class="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center"
      >
        <span class="material-symbols-outlined text-base mr-1.5">campaign</span>
        {{ props.title }}
      </h2>
    </div>

    <div
      v-if="props.items.length > 0"
      data-test="notice-list"
      class="p-4 space-y-3"
      :class="isScrollable ? 'max-h-52 overflow-y-auto' : ''"
    >
      <div
        v-for="(item, idx) in props.items"
        :key="idx"
        class="text-xs flex gap-3"
        :class="idx > 0 ? 'pt-2 border-t border-border' : ''"
      >
        <span class="text-text-secondary font-mono shrink-0">{{ item.date }}</span>
        <span class="text-text-main">{{ item.title }}</span>
      </div>
    </div>
    <div v-else class="p-4 text-xs text-text-secondary">お知らせはありません。</div>
  </BaseCard>
</template>

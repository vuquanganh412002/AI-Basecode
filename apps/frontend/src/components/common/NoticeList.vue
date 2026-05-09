<script setup lang="ts">
import BaseCard from './BaseCard.vue';

interface NoticeItem {
  date: string;
  title: string;
}

interface Props {
  items: NoticeItem[];
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'お知らせ',
});
</script>

<template>
  <BaseCard no-padding>
    <div class="px-4 py-3 border-b border-border bg-surface-card-subtle">
      <h2
        class="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center"
      >
        <span class="material-symbols-outlined text-sm mr-1.5" style="font-size: 16px">campaign</span>
        {{ props.title }}
      </h2>
    </div>

    <div v-if="props.items.length > 0" class="p-4 space-y-3">
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

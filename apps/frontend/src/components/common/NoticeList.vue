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
   * スクロール開始前に表示する行数（既定 5）。お知らせ件数がこれを超えると、
   * 全項目を保持したまま高さを制限してスクロールする — ログインバナーがフォームを押し下げない。
   */
  maxVisible?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'お知らせ',
  maxVisible: 5,
});

// `max-h-52`（13rem）≈ text-xs 5 行分。6 行目が少し覗いてスクロールを示唆する。
// 設計上の近似 — 長いタイトルは折り返すがお知らせバナーなら問題ない。既定 maxVisible=5 に
// 連動。maxVisible を上書きしてもスクロール閾値が変わるだけでピクセル上限は不変。
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

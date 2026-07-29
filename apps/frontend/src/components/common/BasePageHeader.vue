<script setup lang="ts">
import { useBreadcrumb } from '@/composables/useBreadcrumb';

interface Props {
  title: string;
  /** 指定時は自動パンくずを上書き。 */
  breadcrumb?: { label: string; to?: string }[];
}

const props = defineProps<Props>();

const { items } = useBreadcrumb();
</script>

<template>
  <header class="flex justify-between items-end gap-4 flex-wrap">
    <div>
      <h2 class="text-2xl font-bold">{{ props.title }}</h2>
      <nav aria-label="Breadcrumb" class="flex text-xs text-text-secondary mt-1">
        <ol class="inline-flex items-center space-x-1">
          <li
            v-for="(item, idx) in props.breadcrumb ?? items"
            :key="idx"
            class="flex items-center"
          >
            <span
              v-if="idx > 0"
              class="material-icons text-xs mx-1"
            >chevron_right</span>
            <router-link
              v-if="item.to && idx < (props.breadcrumb ?? items).length - 1"
              :to="item.to"
              class="hover:text-primary transition-colors"
            >
              {{ item.label }}
            </router-link>
            <span
              v-else
              :class="idx === (props.breadcrumb ?? items).length - 1
                ? 'text-text-main'
                : ''"
            >
              {{ item.label }}
            </span>
          </li>
        </ol>
      </nav>
    </div>
    <!-- 右側の任意アクション（例: 主ボタン「新規登録」） -->
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

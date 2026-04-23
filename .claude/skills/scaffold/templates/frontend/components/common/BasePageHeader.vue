<script setup lang="ts">
import { useBreadcrumb } from '@/composables/useBreadcrumb';

interface Props {
  title: string;
  /** Override auto breadcrumb if provided. */
  breadcrumb?: { label: string; to?: string }[];
}

const props = defineProps<Props>();

const { items } = useBreadcrumb();
</script>

<template>
  <header class="flex justify-between items-end gap-4 flex-wrap">
    <div>
      <h2 class="text-2xl font-bold">{{ props.title }}</h2>
      <nav aria-label="Breadcrumb" class="flex text-xs text-slate-400 mt-1">
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
                ? 'text-slate-600 dark:text-slate-300'
                : ''"
            >
              {{ item.label }}
            </span>
          </li>
        </ol>
      </nav>
    </div>
    <!-- Optional right-side actions (e.g. primary "新規登録" button) -->
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

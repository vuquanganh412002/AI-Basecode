<script setup lang="ts">
import { computed } from 'vue';
import { useDarkMode } from '@/composables/useDarkMode';

const { mode, toggle } = useDarkMode();

const isDark = computed(() => mode.value === 'dark');
const label = computed(() =>
  isDark.value ? 'ライトモードに切替' : 'ダークモードに切替',
);
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    class="w-10 h-10 inline-flex items-center justify-center rounded-full border border-border text-icon hover:bg-surface-hover transition-colors"
    @click="toggle"
  >
    <span class="material-icons block dark:hidden text-xl">dark_mode</span>
    <span class="material-icons hidden dark:block text-xl">light_mode</span>
  </button>
</template>

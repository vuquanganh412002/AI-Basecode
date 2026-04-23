<script setup lang="ts">
import { computed } from 'vue';
import { useDarkMode } from '@/composables/useDarkMode';

const { mode, toggle } = useDarkMode();

const isDark = computed(() => mode.value === 'dark');
const icon = computed(() => (isDark.value ? 'light_mode' : 'dark_mode'));
const label = computed(() =>
  isDark.value ? 'ライトモードに切替' : 'ダークモードに切替',
);
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    class="relative w-10 h-10 inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 dark:text-sky-300 hover:scale-105 hover:shadow-md transition-all duration-200"
    @click="toggle"
  >
    <span class="material-icons" style="font-size: 22px">{{ icon }}</span>
  </button>
</template>

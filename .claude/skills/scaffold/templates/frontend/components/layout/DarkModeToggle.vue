<script setup lang="ts">
import { computed } from 'vue';
import { useDarkMode } from '@/composables/useDarkMode';
import BaseIconButton from '@/components/common/BaseIconButton.vue';

const { mode, toggle } = useDarkMode();

const icon = computed(() => (mode.value === 'dark' ? 'light_mode' : 'dark_mode'));
const label = computed(() =>
  mode.value === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替',
);
</script>

<template>
  <BaseIconButton :icon="icon" :aria-label="label" @click="toggle" />
</template>

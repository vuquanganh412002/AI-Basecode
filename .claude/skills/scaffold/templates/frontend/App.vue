<script setup lang="ts">
import { computed } from 'vue';
import { ConfigProvider, theme } from 'ant-design-vue';
import jaJP from 'ant-design-vue/es/locale/ja_JP';
import { useDarkMode } from '@/composables/useDarkMode';

const { mode } = useDarkMode();

const antTheme = computed(() => ({
  algorithm:
    mode.value === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
    fontFamily: "'Noto Sans JP', sans-serif",
  },
}));
</script>

<template>
  <ConfigProvider :theme="antTheme" :locale="jaJP">
    <router-view />
  </ConfigProvider>
</template>

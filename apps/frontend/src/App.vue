<script setup lang="ts">
import { computed, onErrorCaptured } from 'vue';
import { ConfigProvider, theme } from 'ant-design-vue';
import jaJP from 'ant-design-vue/es/locale/ja_JP';
import { useDarkMode } from '@/composables/useDarkMode';
import { useNotify } from '@/composables/useNotify';
import { designTokens } from '@/design-tokens';

const { mode } = useDarkMode();
const notify = useNotify();

/**
 * Last-resort error boundary covering BOTH AuthLayout and MainLayout
 * (any descendant of <router-view>). HTTP errors are already handled by
 * the axios interceptor in src/api/error-handler.ts; this catches Vue
 * render / lifecycle exceptions that escape that pipeline.
 *
 * Returning `false` stops the error from bubbling further so the app
 * stays mounted instead of unmounting the whole tree.
 */
onErrorCaptured((err, _instance, info) => {
  notify.error('エラーが発生しました。ページを更新してください。');
  console.error('[App] Component error:', err, info);
  return false;
});

const antTheme = computed(() => ({
  algorithm:
    mode.value === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: designTokens.colors.primary,
    colorSuccess: designTokens.colors.success,
    colorWarning: designTokens.colors.warning,
    colorError: designTokens.colors.error,
    colorInfo: designTokens.colors.info,
    borderRadius: designTokens.radius.ant,
    fontFamily: designTokens.font.display,
  },
}));
</script>

<template>
  <ConfigProvider :theme="antTheme" :locale="jaJP">
    <router-view />
  </ConfigProvider>
</template>

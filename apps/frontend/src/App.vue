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

const antTheme = computed(() => {
  const surfaces =
    mode.value === 'dark'
      ? designTokens.surfaces.dark
      : designTokens.surfaces.light;
  const borders =
    mode.value === 'dark'
      ? designTokens.borders.dark
      : designTokens.borders.light;

  return {
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
      // Project elevation ladder (3 levels — see styles/tailwind.css):
      //   boxShadow          → Card, surface-level elevation.
      //   boxShadowSecondary → Floating UI (Modal / Drawer / Popover /
      //                         Dropdown / Tooltip). AntD reads this token
      //                         internally for every overlay component.
      boxShadow: designTokens.shadow.card,
      boxShadowSecondary: designTokens.shadow.overlay,
      // Every "container" surface (inputs, selects, date-pickers, table
      // cells, pagination controls, default buttons) uses the project's
      // card token instead of AntD's default. In dark mode AntD's default
      // (#141414) reads as lighter boxes on the slate-900 card (#0f172a);
      // aligning to surfaces.card makes them blend into their <BaseCard>
      // wrapper, distinguished by borders. Light mode is unchanged
      // (surfaces.card.light === #ffffff === AntD default).
      colorBgContainer: surfaces.card,
      // disabled / readonly な入力欄の背景を統一トークンに固定する。AntD 既定の
      // 半透明フィルは <BaseCard>(surfaces.card) 上で明るい箱に見え、カスタムの
      // readonly 表示欄(bg-surface-disabled)と色がズレていた。両者を surfaces.disabled
      // に揃える（履歴No 等の無効入力＝カスタム readonly 欄 が同色になる）。
      colorBgContainerDisabled: surfaces.disabled,
      // Floating overlays (Select / DatePicker dropdown panels, Dropdown
      // menus, Modal, Drawer, Popover) use the SAME card surface instead of
      // AntD's default elevated grey (#1f1f1f in dark), which reads as a
      // neutral-grey box clashing with the slate navy palette. The overlay
      // shadow (boxShadowSecondary) still conveys elevation. Light mode →
      // #ffffff (AntD default).
      colorBgElevated: surfaces.card,
    },
    components: {
      // colorBgContainer (global token) already aligns the table cell /
      // footer bg. Header bar + row hover + cell border use the project's
      // surface / border tokens so the table fully matches BaseDataTable's
      // card chrome.
      Table: {
        headerBg: surfaces.cardSubtle,
        rowHoverBg: surfaces.hover,
        borderColor: borders.default,
      },
    },
  };
});
</script>

<template>
  <ConfigProvider :theme="antTheme" :locale="jaJP">
    <router-view />
  </ConfigProvider>
</template>

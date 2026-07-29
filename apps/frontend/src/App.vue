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
 * AuthLayout と MainLayout の両方（<router-view> の全子孫）を覆う最終
 * エラー境界。HTTP エラーは src/api/error-handler.ts の axios インターセプタが
 * 既に処理する。ここはそのパイプラインを逃れた Vue の render / lifecycle
 * 例外を捕捉する。
 *
 * `false` を返すとエラーの伝播を止め、ツリー全体を unmount せずアプリを
 * マウントし続ける。
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
      // プロジェクトのエレベーション階層（3段階 — styles/tailwind.css 参照）:
      //   boxShadow          → Card, サーフェスレベルのエレベーション。
      //   boxShadowSecondary → フローティング UI（Modal / Drawer / Popover /
      //                         Dropdown / Tooltip）。AntD は全 overlay
      //                         コンポーネントで内部的にこのトークンを読む。
      boxShadow: designTokens.shadow.card,
      boxShadowSecondary: designTokens.shadow.overlay,
      // すべての「コンテナ」サーフェス（入力, select, date-picker, テーブル
      // セル, ページネーション, 既定ボタン）は AntD 既定ではなくプロジェクトの
      // card トークンを使う。ダークモードでは AntD 既定（#141414）が slate-900
      // カード（#0f172a）上で明るい箱に見えるため、surfaces.card に揃えて
      // <BaseCard> ラッパに溶け込ませ、ボーダーで区別する。ライトモードは不変
      // （surfaces.card.light === #ffffff === AntD 既定）。
      colorBgContainer: surfaces.card,
      // disabled / readonly な入力欄の背景を統一トークンに固定する。AntD 既定の
      // 半透明フィルは <BaseCard>(surfaces.card) 上で明るい箱に見え、カスタムの
      // readonly 表示欄(bg-surface-disabled)と色がズレていた。両者を surfaces.disabled
      // に揃える（履歴No 等の無効入力＝カスタム readonly 欄 が同色になる）。
      colorBgContainerDisabled: surfaces.disabled,
      // フローティング overlay（Select / DatePicker のドロップダウンパネル,
      // Dropdown メニュー, Modal, Drawer, Popover）は AntD 既定の明るいグレー
      // （ダークで #1f1f1f）ではなく同じ card サーフェスを使う。既定色は
      // slate navy パレットと衝突する中間グレーの箱に見えるため。overlay の
      // 影（boxShadowSecondary）が引き続きエレベーションを伝える。ライトモードは
      // #ffffff（AntD 既定）。
      colorBgElevated: surfaces.card,
    },
    components: {
      // colorBgContainer（グローバルトークン）で既にテーブルセル / フッター背景は
      // 揃う。ヘッダバー + 行 hover + セルボーダーはプロジェクトの surface /
      // border トークンを使い、テーブルを BaseDataTable の card 装飾に完全一致させる。
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

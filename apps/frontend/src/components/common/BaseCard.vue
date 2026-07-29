<script setup lang="ts">
interface Props {
  /**
   * 影の段階（プロジェクトの 3 段階に対応 — styles/tailwind.css 参照）:
   *   - `card`（既定）: キャンバス上の面 — 一覧・フォーム・パネル。
   *   - `flat`:         枠線のみ・影なし（親カード内のネストパネル）。
   * フローティング UI（modal, drawer, popover）は AntD コンポーネントを使い、
   * ConfigProvider 経由で `boxShadowSecondary` を読む — ここにバリアントは無い。
   */
  variant?: 'card' | 'flat';
  /**
   * 内側 padding プリセット:
   *   - `none`        内部にカスタムのヘッダ/ボディ（フォームビューのヘッダ・テーブル —
   *                   呼び出し側が padding を付ける）。
   *   - `md`（既定）   標準カードボディ — `p-4`。
   *   - `lg`          ランディング / アクセス拒否パネル向けのゆったり padding — `p-6`。
   *   - `responsive`  モバイルで詰めて ≥sm でゆったり — `p-4 sm:p-6`。
   */
  padding?: 'none' | 'md' | 'lg' | 'responsive';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'card',
  padding: 'md',
});

const variantClass: Record<NonNullable<Props['variant']>, string> = {
  card: 'rounded-ant shadow-card border border-border',
  flat: 'rounded-ant border border-border',
};

const paddingClass: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  md: 'p-4',
  lg: 'p-6',
  responsive: 'p-4 sm:p-6',
};
</script>

<template>
  <section
    :class="[
      'bg-surface-card overflow-hidden',
      variantClass[props.variant],
      paddingClass[props.padding],
    ]"
  >
    <slot />
  </section>
</template>

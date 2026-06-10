<script setup lang="ts">
interface Props {
  /**
   * Elevation level (matches the project's 3-level ladder — see
   * styles/tailwind.css):
   *   - `card` (default): on-canvas surfaces — lists, forms, panels.
   *   - `flat`:           border only, no shadow (nested panels inside
   *                       a parent card).
   * Floating UI (modal, drawer, popover) uses AntD components, which
   * read `boxShadowSecondary` via ConfigProvider — no variant here.
   */
  variant?: 'card' | 'flat';
  /**
   * Inner padding preset:
   *   - `none`        Custom header/body inside (form view headers,
   *                   tables — caller adds its own padding).
   *   - `md` (default) Standard card body — `p-4`.
   *   - `lg`          Comfortable padding for landing / access-denied
   *                   panels — `p-6`.
   *   - `responsive`  Compact on mobile, comfortable on ≥sm — `p-4 sm:p-6`.
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

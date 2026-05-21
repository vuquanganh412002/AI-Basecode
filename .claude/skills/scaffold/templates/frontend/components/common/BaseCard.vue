<script setup lang="ts">
interface Props {
  /**
   * - `content` (default): subtle card for lists/forms inside MainLayout.
   * - `auth`:    prominent card for login / MFA / reset screens.
   * - `flat`:    no shadow, border only (for nested panels).
   */
  variant?: 'content' | 'auth' | 'flat';
  /** Disable default padding (useful for cards with custom header/footer). */
  noPadding?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'content',
  noPadding: false,
});

const variantClass: Record<NonNullable<Props['variant']>, string> = {
  content: 'rounded-ant shadow-ant-card border border-slate-200 dark:border-slate-800',
  auth: 'rounded-xl shadow-xl border border-slate-200 dark:border-slate-800',
  flat: 'rounded-lg border border-slate-200 dark:border-slate-800',
};
</script>

<template>
  <section
    :class="[
      'bg-white dark:bg-slate-900 overflow-hidden',
      variantClass[props.variant],
      props.noPadding ? '' : 'p-4',
    ]"
  >
    <slot />
  </section>
</template>

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
  content: 'rounded-ant shadow-ant-card border border-border',
  auth: 'rounded-xl shadow-xl border border-border',
  flat: 'rounded-lg border border-border',
};
</script>

<template>
  <section
    :class="[
      'bg-surface-card overflow-hidden',
      variantClass[props.variant],
      props.noPadding ? '' : 'p-4',
    ]"
  >
    <slot />
  </section>
</template>

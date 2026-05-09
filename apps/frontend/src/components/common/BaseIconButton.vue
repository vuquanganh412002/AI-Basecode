<script setup lang="ts">
interface Props {
  /** Material icon name (from `material-icons` font). */
  icon: string;
  ariaLabel: string;
  size?: 'sm' | 'md' | 'lg';
  /** Show a red dot indicator (for notifications etc.). */
  badge?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  badge: false,
  disabled: false,
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const sizeClass: Record<NonNullable<Props['size']>, string> = {
  sm: 'w-8 h-8 text-[16px]',
  md: 'w-10 h-10 text-[20px]',
  lg: 'w-12 h-12 text-[24px]',
};
</script>

<template>
  <button
    type="button"
    :aria-label="props.ariaLabel"
    :disabled="props.disabled"
    :class="[
      'relative inline-flex items-center justify-center rounded-full',
      'text-text-secondary hover:text-primary',
      'hover:bg-surface-hover',
      'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClass[props.size],
    ]"
    @click="(e) => $emit('click', e)"
  >
    <span class="material-icons" :style="{ fontSize: 'inherit' }">{{ props.icon }}</span>
    <span
      v-if="props.badge"
      class="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface-card"
    />
  </button>
</template>

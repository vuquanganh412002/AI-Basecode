<script setup lang="ts">
/**
 * Submit / Cancel button bar for create/edit forms.
 * Standardizes button order, copy, and spacing so every form looks the
 * same regardless of which developer wrote it.
 *
 * Layout: right-aligned by default (Japanese enterprise convention is
 * primary action on the right). Pass `align="between"` for forms with a
 * back-link on the left and submit on the right.
 *
 * Usage:
 * ```vue
 * <a-form @finish="onSubmit" :model="form">
 *   ...
 *   <BaseFormFooter
 *     :submitting="submitting"
 *     submit-text="登録"
 *     @cancel="router.back()"
 *   />
 * </a-form>
 * ```
 */
interface Props {
  submitting?: boolean;
  /** Primary button label — defaults to "保存" (save). */
  submitText?: string;
  /** Cancel button label. */
  cancelText?: string;
  /** Hide cancel button (forms without a cancel target, e.g. wizard step). */
  hideCancel?: boolean;
  /** Disable submit button (used for client-side validation gating). */
  disabled?: boolean;
  /** Mark submit as destructive — use for delete-confirm forms. */
  danger?: boolean;
  /** Layout: `right` (default) or `between` (cancel left, submit right). */
  align?: 'right' | 'between';
}

const props = withDefaults(defineProps<Props>(), {
  submitting: false,
  submitText: '保存',
  cancelText: 'キャンセル',
  hideCancel: false,
  disabled: false,
  danger: false,
  align: 'right',
});

const emit = defineEmits<{
  cancel: [];
}>();
</script>

<template>
  <div
    class="pt-4 mt-4 border-t border-border flex items-center gap-2"
    :class="props.align === 'between' ? 'justify-between' : 'justify-end'"
  >
    <a-button
      v-if="!props.hideCancel"
      :disabled="props.submitting"
      @click="emit('cancel')"
    >
      {{ props.cancelText }}
    </a-button>
    <a-button
      type="primary"
      html-type="submit"
      :loading="props.submitting"
      :disabled="props.disabled"
      :danger="props.danger"
    >
      {{ props.submitText }}
    </a-button>
  </div>
</template>

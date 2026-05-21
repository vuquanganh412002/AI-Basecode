<script setup lang="ts">
/**
 * Submit / Cancel button bar for create/edit forms.
 *
 * Project convention (vue.md §Form footer): **primary action LEFT,
 * both buttons left-aligned**. The submit-button label flips between
 * `登録` (create) and `更新` (edit) based on `isEdit`. The cancel
 * button reads `前の画面に戻る` per the navigation convention.
 *
 * Usage (canonical CRUD form):
 * ```vue
 * <BaseFormFooter
 *   :is-edit="isEdit"
 *   :submitting="submitting"
 *   @cancel="onBack"
 * />
 * ```
 *
 * Override labels for non-CRUD forms (delete-confirm, wizard step):
 * ```vue
 * <BaseFormFooter
 *   submit-text="削除する"
 *   cancel-text="キャンセル"
 *   danger
 *   :submitting="submitting"
 *   @cancel="onCancel"
 * />
 * ```
 *
 * Permission-gating (Tanka pattern — disable submit when role lacks
 * the create/update perm):
 * ```vue
 * <BaseFormFooter
 *   :is-edit="isEdit"
 *   :submitting="submitting"
 *   :disabled="!canSubmit"
 *   @cancel="onBack"
 * />
 * ```
 */
import { computed } from 'vue';

interface Props {
  /** Show `更新` instead of `登録` for the primary button. */
  isEdit?: boolean;
  /** Disable both buttons + show spinner on submit while a request is in flight. */
  submitting?: boolean;
  /** Disable submit independently (e.g. role lacks create/update perm). */
  disabled?: boolean;
  /** Override the primary-button label (skips the isEdit-based default). */
  submitText?: string;
  /** Override the cancel-button label. */
  cancelText?: string;
  /** Hide the cancel button entirely (forms without a back target). */
  hideCancel?: boolean;
  /** Mark submit as destructive (red button). Use for delete-confirm forms. */
  danger?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
  submitting: false,
  disabled: false,
  submitText: undefined,
  cancelText: '前の画面に戻る',
  hideCancel: false,
  danger: false,
});

const emit = defineEmits<{
  cancel: [];
}>();

const computedSubmitText = computed(
  () => props.submitText ?? (props.isEdit ? '更新' : '登録'),
);
</script>

<template>
  <div
    class="pt-4 mt-4 border-t border-border flex items-center justify-start gap-2"
  >
    <a-button
      type="primary"
      html-type="submit"
      :loading="props.submitting"
      :disabled="props.disabled"
      :danger="props.danger"
    >
      {{ computedSubmitText }}
    </a-button>
    <a-button
      v-if="!props.hideCancel"
      data-test="btn-back"
      :disabled="props.submitting"
      @click="emit('cancel')"
    >
      {{ props.cancelText }}
    </a-button>
  </div>
</template>

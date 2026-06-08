<script setup lang="ts">
/**
 * `<a-select>` bound to an m_code category from the codes store.
 * Removes the boilerplate of importing `useCodesStore` and passing
 * `:options="codes.options('CATEGORY')"` in every form.
 *
 * Examples:
 * ```vue
 * <BaseCodeSelect
 *   v-model:value="form.tanka_type"
 *   category="TANKA_TYPE"
 *   placeholder="単価種別を選択"
 * />
 *
 * <BaseCodeSelect
 *   v-model:value="form.gender"
 *   category="GENDER"
 *   short
 * />
 * ```
 *
 * Use `short` to render `label_short` instead of `label` (handy in
 * narrow form rows or table inline-edits).
 */
import { computed } from 'vue';
import { useCodesStore } from '@/stores/codes.store';

interface Props {
  /** Stored code value. Number for INTEGER columns, string for VARCHAR. */
  value?: number | string | null;
  /** m_code.code_category — see docs/database/seeder.md §5. */
  category: string;
  placeholder?: string;
  /** AntD select size; matches form-item size. */
  size?: 'small' | 'middle' | 'large';
  /** Allow clearing the selection. */
  allowClear?: boolean;
  disabled?: boolean;
  /** Use `label_short` instead of `label`. */
  short?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  placeholder: '選択してください',
  size: 'middle',
  allowClear: true,
  disabled: false,
  short: false,
});

const emit = defineEmits<{
  'update:value': [value: number | string | null];
  change: [value: number | string | null];
}>();

const codes = useCodesStore();

const options = computed(() =>
  codes.options(props.category).map((it) => ({
    value: it.value,
    label: props.short ? it.label_short : it.label,
  })),
);

function onChange(v: number | string | null): void {
  emit('update:value', v);
  emit('change', v);
}
</script>

<template>
  <a-select
    :value="props.value"
    :options="options"
    :placeholder="props.placeholder"
    :size="props.size"
    :allow-clear="props.allowClear"
    :disabled="props.disabled"
    @update:value="onChange"
  />
</template>

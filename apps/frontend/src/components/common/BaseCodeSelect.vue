<script setup lang="ts">
/**
 * codes ストアの m_code カテゴリに紐付く `<a-select>`。
 * 各フォームで `useCodesStore` を import して
 * `:options="codes.options('CATEGORY')"` を渡すボイラープレートを不要にする。
 *
 * 例:
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
 * `short` で `label` の代わりに `label_short` を表示（狭いフォーム行やテーブル inline 編集に便利）。
 */
import { computed } from 'vue';
import { useCodesStore } from '@/stores/codes.store';

interface Props {
  /** 格納コード値。INTEGER 列は number、VARCHAR 列は string。 */
  value?: number | string | null;
  /** m_code.code_category — docs/database/seeder.md §5 参照。 */
  category: string;
  placeholder?: string;
  /** AntD select サイズ。form-item のサイズに合わせる。 */
  size?: 'small' | 'middle' | 'large';
  /** 選択のクリアを許可。 */
  allowClear?: boolean;
  disabled?: boolean;
  /** `label` の代わりに `label_short` を使う。 */
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

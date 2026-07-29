<script setup lang="ts">
/**
 * サーバーページング + 検索対応の **単一選択** 販売店ドロップダウン。
 *
 * {@link BaseHanbaitenSelect}（複数選択）の単一選択版。{@link useEntityDropdown} を再利用
 * （50件/page・コード OR 名称 のデバウンス検索・無限スクロール・編集時 include_id ピン）。
 * `jaId` は NICHINO_* 代行入力 フローでのみ必要、スコープ付きロールは session.ja_id 優先。
 *
 * 購読者一覧 の配達販売店フィルタ等で使用。
 */
import { computed, toRef } from 'vue';
import {
  getHanbaitenDropdown,
  type HanbaitenDropdownItem,
  type HanbaitenDropdownQuery,
} from '@/api/hanbaiten/hanbaiten';
import { useEntityDropdown } from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /** 選択中の hanbaiten_id（`null`/`undefined` = 未選択）。 */
  value?: number | null;
  /** 明示的な JA フィルタ（NICHINO_* 代行入力）。スコープ付きロールは session 優先。 */
  jaId?: number | null;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  perPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '選択してください',
  allowClear: true,
  perPage: DROPDOWN_PAGE_SIZE,
});

const emit = defineEmits<{ 'update:value': [v: number | null] }>();

const selected = toRef(props, 'value');
const perPageRef = toRef(props, 'perPage');
const jaIdRef = toRef(props, 'jaId');

const {
  options,
  loading,
  page,
  hasMore,
  q,
  fetchPage,
  onSearch,
  onPopupScroll,
  onChange: composableOnChange,
  onDropdownVisibleChange,
} = useEntityDropdown<HanbaitenDropdownItem, HanbaitenDropdownQuery>({
  fetcher: getHanbaitenDropdown,
  idField: 'hanbaiten_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<HanbaitenDropdownQuery> = {};
    if (props.jaId != null) extra.ja_id = props.jaId;
    return extra;
  },
  resetTriggers: [jaIdRef],
  resetMode: 'hard',
  clearValueOnReset: true,
  onResetTrigger: () => emit('update:value', null),
  onSelect: (v) => emit('update:value', v),
});

const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.hanbaiten_id,
    label: `${o.hanbaiten_code} ${o.hanbaiten_name}`,
  })),
);

function onChange(v: number | undefined): void {
  composableOnChange(v);
}

defineExpose({ fetchPage, options, page, hasMore, q });
</script>

<template>
  <a-select
    :value="props.value ?? undefined"
    :options="selectOptions"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :allow-clear="props.allowClear"
    :loading="loading"
    show-search
    :filter-option="false"
    option-filter-prop="label"
    class="w-full"
    @search="onSearch"
    @popup-scroll="onPopupScroll"
    @change="onChange"
    @dropdown-visible-change="onDropdownVisibleChange"
  />
</template>

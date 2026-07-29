<script setup lang="ts">
/**
 * サーバーページング + 検索対応の **単一選択** 支店ドロップダウン。
 *
 * {@link useEntityDropdown} を再利用（50件/page・コード OR 名称 のデバウンス検索・
 * 無限スクロール・編集時 include_id ピン）。任意の `kanriShitenId` で選択中 管理支店 配下に
 * カスケード（BE が id を呼び出し側スコープ内か検証）、省略時はスコープ内全件。
 * `jaId` は NICHINO_* 代行入力 フローでのみ必要。
 */
import { computed, toRef } from 'vue';
import {
  getShitenDropdown,
  type ShitenDropdownItem,
  type ShitenDropdownQuery,
} from '@/api/shiten/shiten';
import {
  useEntityDropdown,
  type EntityDropdownResult,
} from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /** 選択中の shiten_id（`null`/`undefined` = 未選択）。 */
  value?: number | null;
  /** カスケードフィルタ — この 管理支店 配下の支店のみ。 */
  kanriShitenId?: number | null;
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
const kanriShitenIdRef = toRef(props, 'kanriShitenId');

// shiten エンベロープの meta は任意（旧呼び出し側）— 既定 has_more=false で
// useEntityDropdown のページングを止める。
async function fetcher(
  params: ShitenDropdownQuery,
): Promise<EntityDropdownResult<ShitenDropdownItem>> {
  const res = await getShitenDropdown(params);
  return {
    data: res.data,
    meta: res.meta ?? {
      total: res.data.length,
      page: 1,
      per_page: res.data.length,
      has_more: false,
    },
  };
}

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
} = useEntityDropdown<ShitenDropdownItem, ShitenDropdownQuery>({
  fetcher,
  idField: 'shiten_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<ShitenDropdownQuery> = {};
    if (props.kanriShitenId != null) extra.kanri_shiten_id = props.kanriShitenId;
    if (props.jaId != null) extra.ja_id = props.jaId;
    return extra;
  },
  // 管理支店が変わると支店候補は別管理支店のものになる → リセット + 選択クリア。
  resetTriggers: [kanriShitenIdRef],
  resetMode: 'hard',
  clearValueOnReset: true,
  onResetTrigger: () => emit('update:value', null),
  onSelect: (v) => emit('update:value', v),
});

const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.shiten_id,
    label: `${o.shiten_code} ${o.shiten_name}`,
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

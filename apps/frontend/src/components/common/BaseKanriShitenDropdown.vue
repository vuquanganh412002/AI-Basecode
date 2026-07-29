<script setup lang="ts">
/**
 * サーバーページング + 検索対応の **単一選択** 管理支店ドロップダウン。
 *
 * {@link BaseKanriShitenSelect}（複数選択）の単一選択版。{@link useEntityDropdown} を再利用
 * （50件/page・コード OR 名称 の 300ms デバウンス検索・無限スクロール・編集時 include_id ピン）。
 * `jaId` 必須 — BE が m_kanri_shiten を JA でスコープする。
 *
 * 購読者一覧 / 販売店一括置換 の管理支店フィルタで使用。
 */
import { computed, toRef } from 'vue';
import {
  getKanriShitenDropdown,
  type KanriShitenDropdownItem,
  type KanriShitenDropdownQuery,
} from '@/api/kanri-shiten/kanri-shiten';
import {
  useEntityDropdown,
  type EntityDropdownResult,
} from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /** 選択中の kanri_shiten_id（`null`/`undefined` = 未選択）。 */
  value?: number | null;
  /** JA スコープ（必須 — BE が m_kanri_shiten をこの JA で絞る）。 */
  jaId: number;
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

// kanri-shiten エンベロープの meta は任意（旧呼び出し側）— 既定 has_more=false で
// useEntityDropdown のページングを止める。
async function fetcher(
  params: KanriShitenDropdownQuery,
): Promise<EntityDropdownResult<KanriShitenDropdownItem>> {
  const res = await getKanriShitenDropdown(params);
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
} = useEntityDropdown<KanriShitenDropdownItem, KanriShitenDropdownQuery>({
  fetcher,
  idField: 'kanri_shiten_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => ({ ja_id: props.jaId }),
  resetTriggers: [jaIdRef],
  resetMode: 'hard',
  clearValueOnReset: true,
  onResetTrigger: () => emit('update:value', null),
  onSelect: (v) => emit('update:value', v),
});

const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.kanri_shiten_id,
    label: `${o.kanri_shiten_code} ${o.kanri_shiten_name}`,
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

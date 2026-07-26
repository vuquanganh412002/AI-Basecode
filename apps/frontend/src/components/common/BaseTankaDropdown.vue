<script setup lang="ts">
/**
 * Server-side-paginated + searchable tanka dropdown.
 *
 * Mirrors {@link BaseJaDropdown} / {@link BaseAccountDropdown}: 50/page
 * initial load, 300 ms debounced search on `tanka_name`, popup-scroll
 * appends next page, edit-form `include_id` pin. State-machine lives
 * in {@link useEntityDropdown}; this file binds tanka-specific knobs
 * (fetcher, idField, label composer + ¥ price suffix, `tanka_type`
 * filter, hard `jaId` cascade).
 *
 * Cascades on `jaId` — when the parent picks a different JA (only
 * relevant for the NICHINO_STAFF 代行入力 flow), the option list resets
 * AND the current selection clears so a price from JA A doesn't leak
 * into a hanbaiten being created under JA B (hard reset).
 *
 * Server-side filter is opt-in (`filter-option={false}`) so antd
 * doesn't also client-side filter the visible option list.
 */
import { computed, toRef } from 'vue';
import {
  getTankaDropdown,
  type TankaDropdownItem,
  type TankaDropdownQuery,
} from '@/api/tanka/tanka';
import { useEntityDropdown } from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /** Currently-selected tanka_id (`null`/`undefined` = nothing selected). */
  value?: number | null;
  /**
   * m_code.code_category=TANKA_TYPE value used to filter the list.
   * SCR-017 hanbaiten create passes `2` (配達手数料).
   */
  tankaType?: number;
  /**
   * Explicit JA filter — supplied by NICHINO_STAFF 代行入力 flow
   * where the form picked a JA up-front. For session-scoped roles
   * (CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN) the BE auto-resolves
   * from the session and this prop can be left undefined.
   */
  jaId?: number | null;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  /** Override page size. Default 50. */
  perPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '配達手数料単価を選択',
  allowClear: true,
  perPage: DROPDOWN_PAGE_SIZE,
});

const emit = defineEmits<{
  // Always emits `null` for "cleared" so callers get one canonical
  // "nothing selected" representation, matching BaseJaDropdown.
  'update:value': [v: number | null];
}>();

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
} = useEntityDropdown<TankaDropdownItem, TankaDropdownQuery>({
  fetcher: getTankaDropdown,
  idField: 'tanka_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<TankaDropdownQuery> = {};
    if (props.tankaType !== undefined) extra.tanka_type = props.tankaType;
    if (props.jaId != null) extra.ja_id = props.jaId;
    return extra;
  },
  resetTriggers: [jaIdRef],
  // [cascade-on-ja] Tanka cascade is "hard": when the parent's JA
  // changes (NICHINO_STAFF flow), the previously-loaded tanka list
  // belongs to a different JA. Clear the option list, reset paging,
  // and clear the current selection so the caller's form-state
  // doesn't keep a tanka_id from the wrong JA — it wouldn't survive
  // the BE scope filter anyway.
  resetMode: 'hard',
  clearValueOnReset: true,
  onResetTrigger: () => {
    emit('update:value', null);
  },
  onSelect: (v) => {
    emit('update:value', v);
  },
});

/**
 * Antd `<a-select>` label. Show tanka_name + the price in parens so
 * the staff can confirm which line item they're picking when there
 * are multiple delivery-fee plans with similar names.
 */
const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.tanka_id,
    label: `${o.tanka_name} (¥${formatYen(o.kingaku_zeikomi)})`,
  })),
);

function formatYen(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('ja-JP') : '0';
}

function onChange(v: number | undefined): void {
  composableOnChange(v);
}

// Re-expose internal state for tests.
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
    style="width: 100%"
    @search="onSearch"
    @popup-scroll="onPopupScroll"
    @change="onChange"
    @dropdown-visible-change="onDropdownVisibleChange"
  />
</template>

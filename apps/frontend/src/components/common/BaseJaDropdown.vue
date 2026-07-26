<script setup lang="ts">
/**
 * Server-side-paginated + searchable JA dropdown.
 *
 * Used by every form that needs to associate a record with a JA
 * (SCR-009 管理支店 / SCR-007 支店 / SCR-006 単価 / etc.). Thin wrapper
 * over `<a-select>` + {@link useEntityDropdown}: the composable owns
 * all state-machine logic (pagination, debounced search, infinite
 * scroll, stale-response guard, edit-form `include_id` pin); this
 * file binds JA-specific knobs (fetcher, idField, label composer,
 * todofukenCode cascade).
 *
 * Server-side filter is opt-in (`filter-option={false}`), so antd
 * does NOT try to client-side filter the visible option list. Same
 * as the existing `<BaseCodeSelect>` pattern but with pagination.
 */
import { computed, toRef } from 'vue';
import {
  getJaDropdown,
  type JaDropdownItem,
  type JaDropdownQuery,
} from '@/api/ja/ja';
import { useEntityDropdown } from '@/composables/useEntityDropdown';
import { DROPDOWN_PAGE_SIZE } from '@/constants/pagination';

interface Props {
  /**
   * Currently-selected ja_id. Accepts `number | null | undefined` —
   * both `null` and `undefined` mean "nothing selected" so callers can
   * use `v-model:value` against either filter state (`number | null`,
   * from `useTableQuery`) or form state (`number | undefined`) without
   * a ?? bridge at every call site.
   */
  value?: number | null;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  /** Override page size. Default 50. */
  perPage?: number;
  /**
   * Option label format. 'code-name' (default) renders
   * `${ja_code} ${ja_name}`; 'name' renders only `${ja_name}`.
   * SCR-024 account list uses 'name' to hide ja_code from the UI.
   */
  labelFormat?: 'code-name' | 'name';
  /**
   * Backend ILIKE target. 'both' (default) matches ja_code OR ja_name;
   * 'name' matches ja_name only. Pair with `labelFormat='name'` so the
   * user can't be confused by a hit they can't see.
   */
  searchField?: 'both' | 'name';
  /**
   * Narrows the BE query to JAs in the given 都道府県. Used by SCR-023
   * file upload (都道府県 picker cascades into the JA dropdown). Changing
   * it resets selection + reloads page 1.
   */
  todofukenCode?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: 'JAを選択',
  allowClear: true,
  perPage: DROPDOWN_PAGE_SIZE,
  labelFormat: 'code-name',
  searchField: 'both',
  todofukenCode: null,
});

const emit = defineEmits<{
  // Always emits `null` for "cleared" — callers get one type to handle.
  'update:value': [v: number | null];
  /**
   * Fires alongside `update:value` when the user picks a row. Carries
   * the full option (ja_code + ja_name + todofuken_code + chuokai_flg)
   * so callers that need to display ja_code without a follow-up GET
   * (e.g. SCR-023 "対象JA" multi-select chip list) don't have to grep
   * the internal option array. `null` on X-clear.
   */
  select: [item: JaDropdownItem | null];
}>();

const selected = toRef(props, 'value');
const perPageRef = toRef(props, 'perPage');
const todofukenCodeRef = toRef(props, 'todofukenCode');

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
} = useEntityDropdown<JaDropdownItem, JaDropdownQuery>({
  fetcher: getJaDropdown,
  idField: 'ja_id',
  selected,
  perPage: perPageRef,
  buildExtraParams: () => {
    const extra: Partial<JaDropdownQuery> = {};
    // Only send match_field when narrowing to 'name' — keeps requests
    // minimal for the default (BE treats absent as 'both' anyway).
    if (props.searchField === 'name') extra.match_field = 'name';
    // Forward 都道府県 narrowing when provided. BE ignores empty/null.
    if (props.todofukenCode) extra.todofuken_code = props.todofukenCode;
    return extra;
  },
  resetTriggers: [todofukenCodeRef],
  // JA cascade is "soft" — keep `q` + existing options visible across
  // the prefecture change, never auto-clear the parent's selection.
  resetMode: 'soft',
  onSelect: (v, item) => {
    emit('update:value', v);
    emit('select', item);
  },
});

/**
 * Antd `<a-select>` labels options by their `label` field. Default
 * composes `{ja_code} {ja_name}` so users can match either; `'name'`
 * mode shows ja_name only for callers that hide the code (SCR-024).
 */
const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.ja_id,
    label:
      props.labelFormat === 'name' ? o.ja_name : `${o.ja_code} ${o.ja_name}`,
  })),
);

function onChange(v: number | undefined): void {
  // The composable resolves the picked row + invokes our onSelect
  // callback, which already fires both emits. Nothing further needed.
  composableOnChange(v);
}

// Re-expose internal state for tests (spec patterns mounted via
// @vue/test-utils read `wrapper.vm.fetchPage / options / page /
// hasMore / q`). Keep the surface stable across the refactor.
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

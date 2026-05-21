<script setup lang="ts">
/**
 * Server-side-paginated + searchable JA dropdown.
 *
 * Used by every form that needs to associate a record with a JA
 * (SCR-009 管理支店 / SCR-007 支店 / SCR-006 単価 / etc.). Wraps
 * `<a-select>` with:
 *
 *   - Initial load of 50 items (page 1).
 *   - Search debounced 300 ms — typing `q` resets to page 1.
 *   - Infinite scroll — popup-scroll near the bottom loads page +1
 *     and appends to the option list. Stops when `meta.has_more`
 *     becomes false.
 *   - Edit-mode pre-selection — if `value` is already set on mount
 *     and the chosen ja_id is not in page 1, the BE prepends it via
 *     `include_id` so the label renders correctly without a second
 *     round-trip.
 *
 * Server-side filter is opt-in (`filter-option={false}`), so antd
 * does NOT try to client-side filter the visible option list. Same
 * as the existing `<BaseCodeSelect>` pattern but with pagination.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getJaDropdown, type JaDropdownItem } from '@/api/ja/ja';

interface Props {
  /** Currently-selected ja_id (number) or undefined. */
  value?: number;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  /** Override page size. Default 50. */
  perPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: 'JAを選択',
  allowClear: true,
  perPage: 50,
});

const emit = defineEmits<{
  'update:value': [v: number | undefined];
}>();

const options = ref<JaDropdownItem[]>([]);
const loading = ref(false);
const page = ref(1);
const hasMore = ref(true);
const q = ref('');

/**
 * Last query the cached `options` reflect. `null` until the first
 * fetch resolves. Used to (a) skip duplicate requests when the
 * debounced query equals what's already loaded, and (b) decide on
 * dropdown re-open whether the option list is stale and needs a
 * refresh.
 */
const lastFetchedQ = ref<string | null>(null);

/**
 * Monotonic request counter. Every `fetchPage` invocation captures
 * the current value; when the response resolves we ignore it if the
 * counter has advanced (= a newer request was issued meanwhile).
 *
 * Protects against the classic stale-response race: typing "a" then
 * quickly "ab" issues two requests, and if the network reorders
 * them the first ("a") response would otherwise clobber the second
 * ("ab") and leave the user looking at wrong results.
 */
let requestSeq = 0;
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

// 300 ms — collapses fast typing into one request while staying
// responsive (~human-noticed delay threshold). Matches GitHub /
// Material UI Autocomplete defaults.
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Antd `<a-select>` labels options by their `label` field. We compose
 * `{ja_code} {ja_name}` so the user can match either while searching.
 */
const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.ja_id,
    label: `${o.ja_code} ${o.ja_name}`,
  })),
);

function buildParams(opts: { reset: boolean }) {
  const nextPage = opts.reset ? 1 : page.value + 1;
  const params: Parameters<typeof getJaDropdown>[0] = {
    page: nextPage,
    per_page: props.perPage,
  };
  if (q.value) params.q = q.value;
  // include_id only matters on the first hydration when the parent
  // arrives with a pre-selected ja_id. After that the user controls
  // navigation via search / scroll.
  if (opts.reset && nextPage === 1 && props.value !== undefined && !q.value) {
    params.include_id = props.value;
  }
  return { nextPage, params };
}

function mergePage(reset: boolean, rows: JaDropdownItem[]) {
  if (reset) {
    options.value = rows;
    return;
  }
  const seen = new Set(options.value.map((o) => o.ja_id));
  for (const item of rows) {
    if (!seen.has(item.ja_id)) options.value.push(item);
  }
}

async function fetchPage(opts: { reset: boolean }) {
  // Reset always wins — even if a page-N append is in flight, the
  // newer search/reset must supersede it. Scroll-append bails out
  // when a reset is happening or another append is already loading.
  if (!opts.reset && loading.value) return;
  if (!opts.reset && !hasMore.value) return;

  const mySeq = ++requestSeq;
  loading.value = true;
  try {
    const { nextPage, params } = buildParams(opts);
    const res = await getJaDropdown(params);

    // Stale-response guard: a newer request was issued meanwhile →
    // drop the response entirely so it can't clobber fresher data.
    if (mySeq !== requestSeq) return;

    page.value = nextPage;
    hasMore.value = res.meta.has_more;
    mergePage(opts.reset, res.data);
    if (opts.reset) lastFetchedQ.value = q.value;
  } finally {
    // Only the latest request flips loading off — a stale finisher
    // must not clear the spinner the newer request is still showing.
    if (mySeq === requestSeq) loading.value = false;
  }
}

function onSearch(input: string) {
  // Trim so paste artifacts / IME-confirmed spaces don't alter the
  // ILIKE pattern (BE wraps with `%…%`, but `%  東京  %` won't match
  // rows whose ja_name has no surrounding spaces).
  const trimmed = input.trim();
  q.value = trimmed;
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchDebounce = null;
    // Skip the network round-trip when the debounced query equals
    // what's already loaded — common after typing then deleting back
    // to the same prefix, or antd echoing the same value twice.
    if (trimmed === lastFetchedQ.value) return;
    void fetchPage({ reset: true });
  }, SEARCH_DEBOUNCE_MS);
}

function onPopupScroll(e: Event) {
  const el = e.target as HTMLElement;
  // Trigger ~80 px before the bottom so the next batch is rendered
  // before the user hits the empty space.
  const threshold = 80;
  if (el.scrollTop + el.clientHeight + threshold >= el.scrollHeight) {
    void fetchPage({ reset: false });
  }
}

function onChange(v: number | undefined) {
  // Antd auto-clears the visible search input on select / X-clear, but
  // does NOT fire `@search` — sync our internal `q` so the next
  // dropdown open's stale-check sees a clean query. We DON'T refetch
  // here: the refresh is deferred to `onDropdownVisibleChange` below
  // so users who just pick + move on don't pay for an unused request.
  q.value = '';
  emit('update:value', v);
}

function onDropdownVisibleChange(visible: boolean) {
  // On open: if the cached options reflect a previous search query
  // that no longer matches `q.value` (= user typed before, then
  // selected / cleared / closed without retyping), reload page 1.
  // `lastFetchedQ === null` only on first mount before initial load
  // completes — skip then, the onMounted fetch handles it.
  if (!visible) return;
  if (lastFetchedQ.value === null) return;
  if (lastFetchedQ.value === q.value) return;
  void fetchPage({ reset: true });
}

onMounted(() => {
  void fetchPage({ reset: true });
});

// Cancel any pending debounce when the component unmounts. The
// fetchPage callback is then a no-op even if the timer hadn't fired
// yet — avoids spurious requests + Vitest "unhandled rejection"
// noise when a spec tears down mid-debounce. In-flight requests are
// naturally orphaned (requestSeq bump on the next mount won't match
// the old promise) so the stale-guard inside fetchPage drops them.
onBeforeUnmount(() => {
  if (searchDebounce) {
    clearTimeout(searchDebounce);
    searchDebounce = null;
  }
});

// If the parent swaps `value` to a ja_id we have not loaded yet
// (e.g. programmatic edit-form hydration after mount), refetch with
// include_id so the label resolves.
watch(
  () => props.value,
  (newVal) => {
    if (newVal === undefined) return;
    if (options.value.some((o) => o.ja_id === newVal)) return;
    void fetchPage({ reset: true });
  },
);

defineExpose({ fetchPage, options, page, hasMore, q });
</script>

<template>
  <a-select
    :value="props.value"
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

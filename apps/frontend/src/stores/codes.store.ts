import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getCodes, type CodeItem, type CodeMap } from '@/api/codes/codes';

/**
 * Code master store.
 *
 * Mirrors the backend `m_code` table (21 categories) in a single HTTP call
 * after login. All dropdowns / label mappings read from this cache — no
 * component calls the API directly.
 *
 * Lifecycle:
 *   - login / MFA verify success / app boot (refreshSession) → loadAll()
 *   - logout → $reset() clears cache so the next user refetches
 *
 * m_code values rarely change at runtime; this store has no TTL. If an
 * admin screen mutates m_code later, call `reload()` to refetch.
 */
export const useCodesStore = defineStore('codes', () => {
  const all = ref<CodeMap | null>(null);
  const loading = ref(false);

  const isLoaded = computed(() => all.value !== null);

  async function loadAll(): Promise<void> {
    if (all.value !== null) return;
    loading.value = true;
    try {
      all.value = await getCodes();
    } finally {
      loading.value = false;
    }
  }

  async function reload(): Promise<void> {
    loading.value = true;
    try {
      all.value = await getCodes();
    } finally {
      loading.value = false;
    }
  }

  /** Options for `<a-select :options="…">` (value + label pairs). */
  function options(category: string): CodeItem[] {
    return all.value?.[category] ?? [];
  }

  /** Look up display label for a stored code value. */
  function label(category: string, value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return all.value?.[category]?.find((x) => x.value === value)?.label ?? '';
  }

  /** Short display label (used in tables where column width is tight). */
  function labelShort(category: string, value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return all.value?.[category]?.find((x) => x.value === value)?.label_short ?? '';
  }

  function reset(): void {
    all.value = null;
    loading.value = false;
  }

  return {
    all,
    loading,
    isLoaded,
    loadAll,
    reload,
    options,
    label,
    labelShort,
    reset,
  };
});

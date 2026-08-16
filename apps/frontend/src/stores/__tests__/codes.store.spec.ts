// Drives src/stores/codes.store.ts. The codes store caches m_code in
// memory across the session — its loadAll/reload/reset lifecycle is
// load-bearing for every dropdown + table label-lookup in the app.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const getCodes = vi.fn();
vi.mock('@/api/codes/codes', () => ({
  getCodes: (...a: unknown[]) => getCodes(...a),
}));

import { useCodesStore } from '@/stores/codes.store';

const SAMPLE = {
  TANKA_TYPE: [
    { value: 1, label: '購読料', label_short: '購読' },
    { value: 2, label: '配達手数料', label_short: '配達' },
  ],
  ZEI_KUBUN: [
    { value: 1, label: '内税', label_short: '内' },
    { value: 2, label: '外税', label_short: '外' },
  ],
};

beforeEach(() => {
  setActivePinia(createPinia());
  getCodes.mockReset();
});

describe('useCodesStore — initial state', () => {
  it('should start with all=null, loading=false, isLoaded=false', () => {
    const store = useCodesStore();
    expect(store.all).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.isLoaded).toBe(false);
  });
});

describe('useCodesStore — loadAll', () => {
  it('should populate `all` and flip isLoaded to true on success', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.all).toEqual(SAMPLE);
    expect(store.isLoaded).toBe(true);
    expect(getCodes).toHaveBeenCalledTimes(1);
  });

  it('should be idempotent — second call with cache present should NOT re-fetch', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    await store.loadAll();
    expect(getCodes).toHaveBeenCalledTimes(1);
  });

  it('should reset loading=false even when getCodes rejects', async () => {
    getCodes.mockRejectedValue(new Error('boom'));
    const store = useCodesStore();
    await expect(store.loadAll()).rejects.toThrow('boom');
    expect(store.loading).toBe(false);
    expect(store.all).toBeNull();
  });
});

describe('useCodesStore — reload', () => {
  it('should always refetch, even when cache is populated', async () => {
    getCodes.mockResolvedValueOnce(SAMPLE).mockResolvedValueOnce({ NEW: [] });
    const store = useCodesStore();
    await store.loadAll();
    await store.reload();
    expect(getCodes).toHaveBeenCalledTimes(2);
    expect(store.all).toEqual({ NEW: [] });
  });

  it('should reset loading=false even when reload rejects', async () => {
    getCodes.mockRejectedValue(new Error('reload boom'));
    const store = useCodesStore();
    await expect(store.reload()).rejects.toThrow('reload boom');
    expect(store.loading).toBe(false);
  });
});

describe('useCodesStore — options', () => {
  it('should return the array for a known category', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.options('TANKA_TYPE')).toHaveLength(2);
    expect(store.options('TANKA_TYPE')[0].label).toBe('購読料');
  });

  it('should return [] for an unknown category', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.options('UNKNOWN')).toEqual([]);
  });

  it('should return [] when cache is empty (pre-load)', () => {
    const store = useCodesStore();
    expect(store.options('TANKA_TYPE')).toEqual([]);
  });
});

describe('useCodesStore — label / labelShort', () => {
  it('should resolve the long label for a known value', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.label('TANKA_TYPE', 1)).toBe('購読料');
    expect(store.label('ZEI_KUBUN', 2)).toBe('外税');
  });

  it('should resolve the short label for a known value', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.labelShort('TANKA_TYPE', 1)).toBe('購読');
    expect(store.labelShort('ZEI_KUBUN', 2)).toBe('外');
  });

  it('should return "" when value is null/undefined (defensive guard)', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.label('TANKA_TYPE', null)).toBe('');
    expect(store.label('TANKA_TYPE', undefined)).toBe('');
    expect(store.labelShort('TANKA_TYPE', null)).toBe('');
    expect(store.labelShort('TANKA_TYPE', undefined)).toBe('');
  });

  it('should return "" when value is not in the category', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.label('TANKA_TYPE', 999)).toBe('');
    expect(store.labelShort('TANKA_TYPE', 999)).toBe('');
  });

  it('should resolve the label when value is a string (radio v-model contract, e.g. formState.zei_kubun: "1")', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    // m_code entries store `value` as number (BE CodeService.normalizeValue()),
    // but radio-bound form state is commonly string-typed per vue.md's
    // documented type-coercion gotcha — label()/labelShort() must match
    // has()'s String() coercion so this doesn't silently resolve to ''.
    expect(store.label('ZEI_KUBUN', '1')).toBe('内税');
    expect(store.label('TANKA_TYPE', '2')).toBe('配達手数料');
    expect(store.labelShort('ZEI_KUBUN', '1')).toBe('内');
    expect(store.labelShort('TANKA_TYPE', '2')).toBe('配達');
  });

  it('should return "" when value is an empty string (defensive guard)', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.label('TANKA_TYPE', '')).toBe('');
    expect(store.labelShort('TANKA_TYPE', '')).toBe('');
  });

  it('should return "" when category is unknown', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.label('UNKNOWN', 1)).toBe('');
    expect(store.labelShort('UNKNOWN', 1)).toBe('');
  });

  it('should return "" when cache is empty (pre-load)', () => {
    const store = useCodesStore();
    expect(store.label('TANKA_TYPE', 1)).toBe('');
    expect(store.labelShort('TANKA_TYPE', 1)).toBe('');
  });
});

describe('useCodesStore — reset', () => {
  it('should clear cache + loading flag so the next user re-fetches', async () => {
    getCodes.mockResolvedValue(SAMPLE);
    const store = useCodesStore();
    await store.loadAll();
    expect(store.isLoaded).toBe(true);

    store.reset();
    expect(store.all).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.isLoaded).toBe(false);

    // After reset, loadAll() should fetch again — proves the guard cleared.
    await store.loadAll();
    expect(getCodes).toHaveBeenCalledTimes(2);
  });
});

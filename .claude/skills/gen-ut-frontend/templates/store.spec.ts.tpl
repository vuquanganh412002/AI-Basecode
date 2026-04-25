// @ts-nocheck — TDD red phase (/gen-ut-frontend, source not yet implemented by /gen-code)
// Screen: __SCREEN_ID__ — __SCREEN__
//
// Placeholders:
//   __STORE__    = store hook name (e.g. "useTankaStore")
//   __STORE_FILE__ = file basename (e.g. "tanka.store")
//   __MODULE__   = feature folder (e.g. "tanka")

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { __STORE__ } from '../__STORE_FILE__';

vi.mock('@/api/__MODULE__/__MODULE__', () => ({
  // list: vi.fn(),
  // getById: vi.fn(),
}));

describe('__STORE__', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // it('should initialize with empty items when store is created', () => {
  //   const store = __STORE__();
  //   expect(store.items).toEqual([]);
  //   expect(store.loading).toBe(false);
  // });
  //
  // it('should populate items when fetchList succeeds', async () => {
  //   const mockData = [/* ... */];
  //   vi.mocked((await import('@/api/__MODULE__/__MODULE__')).list).mockResolvedValue({ data: mockData, meta: { total: mockData.length, page: 1, per_page: 20, total_pages: 1 } });
  //   const store = __STORE__();
  //   await store.fetchList();
  //   expect(store.items).toEqual(mockData);
  // });
  //
  // it('should set error when fetchList rejects', async () => {
  //   vi.mocked((await import('@/api/__MODULE__/__MODULE__')).list).mockRejectedValue(new Error('boom'));
  //   const store = __STORE__();
  //   await store.fetchList();
  //   expect(store.error).toBeTruthy();
  // });
});

// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { use{{Entity}}Store } from '../{{store}}.store';
import * as api from '@/api/generated';

vi.mock('@/api/generated');

describe('{{store}} store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should expose initial empty state when store is created', () => {
    const store = use{{Entity}}Store();
    expect(store.items).toEqual([]);
    expect(store.current).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should fetch items and store them when fetchAll resolves', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    vi.mocked(api.{{api_list_method}}).mockResolvedValue({ data: { data: items, meta: { total: 2 } } } as any);

    const store = use{{Entity}}Store();
    await store.fetchAll({ page: 1, per_page: 20 });

    expect(store.items).toEqual(items);
    expect(store.loading).toBe(false);
  });

  it('should record error and reset items when fetchAll rejects', async () => {
    vi.mocked(api.{{api_list_method}}).mockRejectedValue(new Error('network'));
    const store = use{{Entity}}Store();

    await store.fetchAll({ page: 1, per_page: 20 });

    expect(store.items).toEqual([]);
    expect(store.error).toBeTruthy();
  });

  it('should append new record when create action succeeds', async () => {
    const created = { id: 99 };
    vi.mocked(api.{{api_create_method}}).mockResolvedValue({ data: { data: created } } as any);

    const store = use{{Entity}}Store();
    await store.create({ /* dto */ });

    expect(store.items).toContainEqual(created);
  });

  it('should replace updated record in items when update action succeeds', async () => {
    const store = use{{Entity}}Store();
    store.items = [{ id: 1, name: 'old' }];
    vi.mocked(api.{{api_update_method}}).mockResolvedValue({ data: { data: { id: 1, name: 'new' } } } as any);

    await store.update(1, { name: 'new' });

    expect(store.items[0].name).toBe('new');
  });

  it('should remove record from items when delete action succeeds', async () => {
    const store = use{{Entity}}Store();
    store.items = [{ id: 1 }, { id: 2 }];
    vi.mocked(api.{{api_delete_method}}).mockResolvedValue({} as any);

    await store.remove(1);

    expect(store.items.find((i: any) => i.id === 1)).toBeUndefined();
  });
});

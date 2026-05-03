// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { {{useName}} } from '../{{useName}}';
import * as api from '@/api/generated';

vi.mock('@/api/generated');

describe('{{useName}}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state when first invoked', () => {
    const composable = {{useName}}();
    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBeNull();
  });

  it('should toggle loading flag while async work is in flight', async () => {
    vi.mocked(api.{{api_method}}).mockImplementation(async () => {
      // mid-flight state captured below
      return { data: { data: [], meta: { total: 0 } } } as any;
    });
    const composable = {{useName}}();
    const p = composable.{{action}}();
    expect(composable.loading.value).toBe(true);
    await p;
    expect(composable.loading.value).toBe(false);
  });

  it('should populate state with API response when call succeeds', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    vi.mocked(api.{{api_method}}).mockResolvedValue({ data: { data: items, meta: { total: 2 } } } as any);

    const composable = {{useName}}();
    await composable.{{action}}();

    expect(composable.results.value).toEqual(items);
    expect(composable.error.value).toBeNull();
  });

  it('should expose error and clear results when API rejects', async () => {
    vi.mocked(api.{{api_method}}).mockRejectedValue(new Error('boom'));
    const composable = {{useName}}();

    await composable.{{action}}();

    expect(composable.error.value).toBeTruthy();
    expect(composable.results.value).toEqual([]);
  });
});

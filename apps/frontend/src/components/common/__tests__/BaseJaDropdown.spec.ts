// Tests for <BaseJaDropdown> — server-side-paginated + searchable JA select.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseJaDropdown from '@/components/common/BaseJaDropdown.vue';

vi.mock('@/api/ja/ja', () => ({
  getJaDropdown: vi.fn(),
}));

function buildResponse(
  rows: Array<{
    ja_id: number;
    ja_code: string;
    ja_name: string;
    todofuken_code?: string;
    chuokai_flg?: boolean;
  }>,
  meta: Partial<{
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  }> = {},
) {
  return {
    data: rows.map((r) => ({
      todofuken_code: '13',
      chuokai_flg: false,
      ...r,
    })),
    meta: {
      total: meta.total ?? rows.length,
      page: meta.page ?? 1,
      per_page: meta.per_page ?? 50,
      has_more: meta.has_more ?? false,
    },
  };
}

async function mountDropdown(props: Record<string, unknown> = {}) {
  return mount(BaseJaDropdown, {
    props,
    global: { plugins: [Antd] },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getJaDropdown } = await import('@/api/ja/ja');
  vi.mocked(getJaDropdown).mockResolvedValue(
    buildResponse([
      { ja_id: 1, ja_code: '1301001001', ja_name: 'JA東京中央' },
      { ja_id: 2, ja_code: '1301002001', ja_name: 'JA東京みどり' },
    ]),
  );
});

describe('BaseJaDropdown — initial load', () => {
  it('should fetch page 1 with default per_page=50 on mount', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await mountDropdown();
    await flushPromises();
    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 50 }),
    );
  });

  it('should respect a custom per-page prop', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await mountDropdown({ perPage: 30 });
    await flushPromises();
    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 30 }),
    );
  });

  it('should include `include_id` when a value is set on mount', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await mountDropdown({ value: 99 });
    await flushPromises();
    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ include_id: 99 }),
    );
  });

  it('should NOT include `include_id` when no value is set', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await mountDropdown();
    await flushPromises();
    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.not.objectContaining({ include_id: expect.anything() }),
    );
  });
});

describe('BaseJaDropdown — search', () => {
  it('should debounce search and call getJaDropdown with q + reset to page 1', async () => {
    vi.useFakeTimers();
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    // Simulate antd's search emit.
    const vm = wrapper.vm as any;
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('search', '東京');
    vi.advanceTimersByTime(300);
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ q: '東京', page: 1 }),
    );
    vi.useRealTimers();
    void vm;
  });

  it('should not call API on every keystroke within the debounce window', async () => {
    vi.useFakeTimers();
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('search', '東');
    sel.vm.$emit('search', '東京');
    sel.vm.$emit('search', '東京中');
    vi.advanceTimersByTime(150);
    expect(getJaDropdown).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalledTimes(1);
    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ q: '東京中' }),
    );
    vi.useRealTimers();
  });
});

describe('BaseJaDropdown — infinite scroll', () => {
  it('should append page 2 results when popup-scroll reaches the bottom', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    vi.mocked(getJaDropdown).mockResolvedValueOnce(
      buildResponse(
        [{ ja_id: 1, ja_code: '1301001001', ja_name: 'JA東京中央' }],
        { total: 100, page: 1, per_page: 50, has_more: true },
      ),
    );
    const wrapper = await mountDropdown();
    await flushPromises();

    vi.mocked(getJaDropdown).mockResolvedValueOnce(
      buildResponse(
        [{ ja_id: 51, ja_code: '2701002001', ja_name: 'JA大阪なにわ' }],
        { total: 100, page: 2, per_page: 50, has_more: false },
      ),
    );

    const sel = wrapper.findComponent({ name: 'ASelect' });
    const fakeEl = {
      scrollTop: 900,
      clientHeight: 200,
      scrollHeight: 1000,
    } as HTMLElement;
    sel.vm.$emit('popup-scroll', { target: fakeEl } as unknown as Event);
    await flushPromises();

    expect(getJaDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    const vm = wrapper.vm as any;
    expect(vm.options).toHaveLength(2);
    expect(vm.options[1].ja_id).toBe(51);
  });

  it('should NOT request next page when meta.has_more is false', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    vi.mocked(getJaDropdown).mockResolvedValueOnce(
      buildResponse(
        [{ ja_id: 1, ja_code: '1301001001', ja_name: 'JA東京中央' }],
        { has_more: false },
      ),
    );
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('popup-scroll', {
      target: { scrollTop: 900, clientHeight: 200, scrollHeight: 1000 },
    } as unknown as Event);
    await flushPromises();

    expect(getJaDropdown).not.toHaveBeenCalled();
  });

  it('should NOT duplicate options when an item from page 2 is already in the list', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    vi.mocked(getJaDropdown).mockResolvedValueOnce(
      buildResponse(
        [{ ja_id: 1, ja_code: 'A', ja_name: 'A' }],
        { has_more: true },
      ),
    );
    const wrapper = await mountDropdown();
    await flushPromises();

    vi.mocked(getJaDropdown).mockResolvedValueOnce(
      buildResponse(
        [{ ja_id: 1, ja_code: 'A', ja_name: 'A' }], // duplicate
        { has_more: false, page: 2 },
      ),
    );
    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('popup-scroll', {
      target: { scrollTop: 900, clientHeight: 200, scrollHeight: 1000 },
    } as unknown as Event);
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(vm.options).toHaveLength(1);
  });
});

describe('BaseJaDropdown — search robustness', () => {
  it('should trim leading/trailing whitespace from the search input before issuing the request', async () => {
    vi.useFakeTimers();
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('search', '  東京  ');
    vi.advanceTimersByTime(400);
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ q: '東京' }),
    );
    vi.useRealTimers();
  });

  it('should drop a stale response when a newer search has already fired (race-condition guard)', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    // Initial mount response.
    vi.mocked(getJaDropdown).mockResolvedValueOnce(
      buildResponse([{ ja_id: 1, ja_code: 'A', ja_name: 'A' }]),
    );
    const wrapper = await mountDropdown();
    await flushPromises();

    // Two in-flight responses: response1 (slow, stale) resolves AFTER
    // response2 (fast, current). The component must IGNORE response1.
    let resolveSlow!: (v: any) => void;
    const slowPromise = new Promise((r) => {
      resolveSlow = r;
    });
    vi.mocked(getJaDropdown).mockReturnValueOnce(slowPromise as any);

    const sel = wrapper.findComponent({ name: 'ASelect' });
    // Fire request #1 manually via the exposed fetchPage (debounce
    // is irrelevant — we only care about the seq guard).
    const vm = wrapper.vm as any;
    const p1 = vm.fetchPage({ reset: true });

    // Immediately issue request #2 with different rows.
    vi.mocked(getJaDropdown).mockResolvedValueOnce(
      buildResponse([{ ja_id: 99, ja_code: 'Z', ja_name: 'Z-NEW' }]),
    );
    const p2 = vm.fetchPage({ reset: true });
    await p2;
    await flushPromises();

    // Now resolve the stale one.
    resolveSlow(buildResponse([{ ja_id: 1, ja_code: 'A', ja_name: 'A-OLD' }]));
    await p1;
    await flushPromises();

    expect(vm.options).toEqual([
      {
        ja_id: 99,
        ja_code: 'Z',
        ja_name: 'Z-NEW',
        todofuken_code: '13',
        chuokai_flg: false,
      },
    ]);
    void sel;
  });

  it('should clear the pending debounce on unmount (no late fetch fires after teardown)', async () => {
    vi.useFakeTimers();
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('search', '東京');
    wrapper.unmount();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(getJaDropdown).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('BaseJaDropdown — selection', () => {
  it('should emit update:value with the chosen ja_id when an option is selected', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('change', 42);
    await flushPromises();
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual([42]);
  });

  it('should emit update:value with null when cleared (normalized from antd undefined)', async () => {
    // Antd fires @change with `undefined` on × click; the component
    // normalizes to `null` so callers get one canonical "nothing
    // selected" representation matching the Props/emit union.
    const wrapper = await mountDropdown({ value: 1, allowClear: true });
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('change', undefined);
    await flushPromises();
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual([null]);
  });

  it('should reset internal q on @change (without refetching) so the next dropdown open detects a stale filter', async () => {
    vi.useFakeTimers();
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown();
    await flushPromises();

    // 1. User types "08" → debounced filtered fetch.
    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('search', '08');
    vi.advanceTimersByTime(400);
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    // 2. User selects an item. `@change` must NOT trigger a request
    //    (refresh is deferred to the next dropdown open) — but it
    //    must clear `q` so the deferred stale-check works.
    sel.vm.$emit('change', 42);
    await flushPromises();

    expect(getJaDropdown).not.toHaveBeenCalled();
    const vm = wrapper.vm as any;
    expect(vm.q).toBe('');
    vi.useRealTimers();
  });

  it('should refetch with the full list when the dropdown reopens after the q changed', async () => {
    vi.useFakeTimers();
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown();
    await flushPromises();

    // Filter, select, then reopen the dropdown.
    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('search', '08');
    vi.advanceTimersByTime(400);
    await flushPromises();
    sel.vm.$emit('change', 42);
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    // Reopen — q is now '' but lastFetchedQ is still '08' → refetch.
    sel.vm.$emit('dropdown-visible-change', true);
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalledTimes(1);
    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.not.objectContaining({ q: expect.anything() }),
    );
    vi.useRealTimers();
  });

  it('should NOT refetch on dropdown reopen when the cached options already reflect the current q', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('dropdown-visible-change', true);
    await flushPromises();

    expect(getJaDropdown).not.toHaveBeenCalled();
  });
});

describe('BaseJaDropdown — debounce', () => {
  it('should skip the network round-trip when the debounced q equals the last fetched q', async () => {
    vi.useFakeTimers();
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    const sel = wrapper.findComponent({ name: 'ASelect' });
    // Type "08" → fetch fires once.
    sel.vm.$emit('search', '08');
    vi.advanceTimersByTime(400);
    await flushPromises();
    expect(getJaDropdown).toHaveBeenCalledTimes(1);

    // Re-emit the SAME query (antd's @search can double-fire when
    // the user retypes / IME flushes the same text) — must NOT
    // hit the network again.
    sel.vm.$emit('search', '08');
    vi.advanceTimersByTime(400);
    await flushPromises();
    expect(getJaDropdown).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

// ACSMS-SCR-024 account list opts into name-only display + search. Default
// callers (every other screen) must be unaffected.
describe('BaseJaDropdown — labelFormat / searchField props', () => {
  it('should compose option label as `${ja_code} ${ja_name}` by default', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    const opts = sel.props('options') as Array<{ value: number; label: string }>;
    expect(opts).toEqual(
      expect.arrayContaining([
        { value: 1, label: '1301001001 JA東京中央' },
        { value: 2, label: '1301002001 JA東京みどり' },
      ]),
    );
  });

  it('should compose option label as ja_name only when labelFormat=name', async () => {
    const wrapper = await mountDropdown({ labelFormat: 'name' });
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    const opts = sel.props('options') as Array<{ value: number; label: string }>;
    expect(opts).toEqual(
      expect.arrayContaining([
        { value: 1, label: 'JA東京中央' },
        { value: 2, label: 'JA東京みどり' },
      ]),
    );
    // Sanity: the ja_code prefix must NOT leak into any label.
    for (const o of opts) expect(o.label).not.toMatch(/^\d/);
  });

  it('should NOT send match_field by default (BE treats absent as both)', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await mountDropdown();
    await flushPromises();
    const params = vi.mocked(getJaDropdown).mock.calls[0]?.[0] ?? {};
    expect(params).not.toHaveProperty('match_field');
  });

  it('should send match_field=name when searchField=name', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await mountDropdown({ searchField: 'name' });
    await flushPromises();
    expect(getJaDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ match_field: 'name' }),
    );
  });

  it('should keep sending match_field=name on subsequent search requests', async () => {
    vi.useFakeTimers();
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown({ searchField: 'name' });
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('search', '東京');
    vi.advanceTimersByTime(400);
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ q: '東京', match_field: 'name' }),
    );
    vi.useRealTimers();
  });
});

describe('BaseJaDropdown — roleId prop (ACSMS-SCR-025 role cascade)', () => {
  it('should NOT send role_id by default', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await mountDropdown();
    await flushPromises();
    const params = vi.mocked(getJaDropdown).mock.calls[0]?.[0] ?? {};
    expect(params).not.toHaveProperty('role_id');
  });

  it('should send role_id when roleId prop is set', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    await mountDropdown({ roleId: 3 });
    await flushPromises();
    expect(getJaDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ role_id: 3 }),
    );
  });

  it('should re-fetch when roleId changes together with todofukenCode (parent cascade)', async () => {
    const { getJaDropdown } = await import('@/api/ja/ja');
    const wrapper = await mountDropdown({ roleId: 4, todofukenCode: '13' });
    await flushPromises();
    vi.mocked(getJaDropdown).mockClear();

    await wrapper.setProps({ roleId: 3, todofukenCode: '27' });
    await flushPromises();

    expect(getJaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ role_id: 3, todofuken_code: '27' }),
    );
  });
});

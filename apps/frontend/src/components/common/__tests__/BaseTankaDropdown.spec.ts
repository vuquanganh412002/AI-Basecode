// Tests for <BaseTankaDropdown>. Common dropdown mechanics (debounce,
// scroll-append, include_id, stale-response guard) are already covered
// by BaseJaDropdown.spec.ts — these tests focus on tanka-specific
// behavior: tanka_type prop wiring + the ja_id cascade reset.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseTankaDropdown from '@/components/common/BaseTankaDropdown.vue';

vi.mock('@/api/tanka/tanka', () => ({
  getTankaDropdown: vi.fn(),
}));

function buildResponse(
  rows: Array<{
    tanka_id: number;
    tanka_code?: string;
    tanka_name: string;
    tanka_type?: number;
    kingaku_zeikomi?: number;
  }>,
  meta: Partial<{ total: number; page: number; per_page: number; has_more: boolean }> = {},
) {
  return {
    data: rows.map((r) => ({
      tanka_code: '0000001',
      tanka_type: 2,
      kingaku_zeikomi: 100,
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
  return mount(BaseTankaDropdown, {
    props,
    global: { plugins: [Antd] },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getTankaDropdown } = await import('@/api/tanka/tanka');
  vi.mocked(getTankaDropdown).mockResolvedValue(
    buildResponse([
      { tanka_id: 1, tanka_name: '配達手数料A', kingaku_zeikomi: 100 },
      { tanka_id: 2, tanka_name: '配達手数料B', kingaku_zeikomi: 200 },
    ]),
  );
});

describe('BaseTankaDropdown — query params', () => {
  it('should pass tanka_type when set', async () => {
    const { getTankaDropdown } = await import('@/api/tanka/tanka');
    await mountDropdown({ tankaType: 2 });
    await flushPromises();
    expect(getTankaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ tanka_type: 2, page: 1, per_page: 50 }),
    );
  });

  it('should pass ja_id when set (NICHINO_STAFF 代行入力 case)', async () => {
    const { getTankaDropdown } = await import('@/api/tanka/tanka');
    await mountDropdown({ tankaType: 2, jaId: 7 });
    await flushPromises();
    expect(getTankaDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ ja_id: 7 }),
    );
  });

  it('should compose label as `${tanka_name} (¥<price>)` with comma-separated yen', async () => {
    const wrapper = await mountDropdown({ tankaType: 2 });
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    const opts = sel.props('options') as Array<{ value: number; label: string }>;
    expect(opts).toEqual([
      { value: 1, label: '配達手数料A (¥100)' },
      { value: 2, label: '配達手数料B (¥200)' },
    ]);
  });
});

describe('BaseTankaDropdown — ja_id cascade reset', () => {
  it('should refetch and clear selection when jaId changes', async () => {
    const { getTankaDropdown } = await import('@/api/tanka/tanka');
    const wrapper = await mountDropdown({ tankaType: 2, jaId: 1, value: 99 });
    await flushPromises();
    vi.mocked(getTankaDropdown).mockClear();

    // Parent switches JA.
    await wrapper.setProps({ jaId: 2 });
    await flushPromises();

    // Refetched with new ja_id and page 1.
    expect(getTankaDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ ja_id: 2, page: 1 }),
    );
    // Parent's selection cleared via @update:value=null (a tanka from
    // JA=1 wouldn't survive the BE scope filter under JA=2).
    const emits = wrapper.emitted('update:value') ?? [];
    expect(emits.some((e) => e[0] === null)).toBe(true);
  });

  it('should NOT refetch when jaId stays the same on re-render', async () => {
    const { getTankaDropdown } = await import('@/api/tanka/tanka');
    const wrapper = await mountDropdown({ tankaType: 2, jaId: 5 });
    await flushPromises();
    vi.mocked(getTankaDropdown).mockClear();

    await wrapper.setProps({ jaId: 5 });
    await flushPromises();

    expect(getTankaDropdown).not.toHaveBeenCalled();
  });
});

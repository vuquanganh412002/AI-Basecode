// Tests for <BaseHanbaitenSelect> — multi-select paginated/searchable 販売店.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseHanbaitenSelect from '@/components/common/BaseHanbaitenSelect.vue';

vi.mock('@/api/hanbaiten/hanbaiten', () => ({
  getHanbaitenDropdown: vi.fn(),
}));

function buildResponse(
  rows: Array<{ hanbaiten_id: number; hanbaiten_code: string; hanbaiten_name: string }>,
  meta: Partial<{ total: number; page: number; per_page: number; has_more: boolean }> = {},
) {
  return {
    data: rows,
    meta: {
      total: meta.total ?? rows.length,
      page: meta.page ?? 1,
      per_page: meta.per_page ?? 50,
      has_more: meta.has_more ?? false,
    },
  };
}

async function mountDropdown(props: Record<string, unknown> = {}) {
  return mount(BaseHanbaitenSelect, { props, global: { plugins: [Antd] } });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
  vi.mocked(getHanbaitenDropdown).mockResolvedValue(
    buildResponse([
      { hanbaiten_id: 1, hanbaiten_code: 'H001', hanbaiten_name: '東京中央販売店' },
      { hanbaiten_id: 2, hanbaiten_code: 'H002', hanbaiten_name: '大阪北販売店' },
    ]),
  );
});

describe('BaseHanbaitenSelect', () => {
  it('should fetch page 1 with per_page=50 on mount (no include_id for multi-select)', async () => {
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    await mountDropdown();
    await flushPromises();
    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 50 }),
    );
    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.not.objectContaining({ include_id: expect.anything() }),
    );
  });

  it('should compose option label as `${code} ${name}`', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    const opts = wrapper.findComponent({ name: 'ASelect' }).props('options') as Array<{
      value: number;
      label: string;
    }>;
    expect(opts).toEqual(
      expect.arrayContaining([
        { value: 1, label: 'H001 東京中央販売店' },
        { value: 2, label: 'H002 大阪北販売店' },
      ]),
    );
  });

  it('should render as a multiple select with auto-clear-search-value disabled', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    expect(sel.props('mode')).toBe('multiple');
    expect(sel.props('autoClearSearchValue')).toBe(false);
  });

  it('should debounce search and call with q + page 1', async () => {
    vi.useFakeTimers();
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getHanbaitenDropdown).mockClear();

    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('search', 'H00');
    vi.advanceTimersByTime(300);
    await flushPromises();

    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'H00', page: 1 }),
    );
    vi.useRealTimers();
  });

  it('should append page 2 on popup-scroll to the bottom', async () => {
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    vi.mocked(getHanbaitenDropdown).mockResolvedValueOnce(
      buildResponse([{ hanbaiten_id: 1, hanbaiten_code: 'H001', hanbaiten_name: 'A' }], {
        has_more: true,
      }),
    );
    const wrapper = await mountDropdown();
    await flushPromises();

    vi.mocked(getHanbaitenDropdown).mockResolvedValueOnce(
      buildResponse([{ hanbaiten_id: 51, hanbaiten_code: 'H051', hanbaiten_name: 'B' }], {
        page: 2,
        has_more: false,
      }),
    );
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('popup-scroll', {
      target: { scrollTop: 900, clientHeight: 200, scrollHeight: 1000 },
    } as unknown as Event);
    await flushPromises();

    expect(getHanbaitenDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect((wrapper.vm as any).options).toHaveLength(2);
  });

  it('should emit update:value with the selected id array on @change', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('change', [1, 2]);
    await flushPromises();
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual([[1, 2]]);
  });
});

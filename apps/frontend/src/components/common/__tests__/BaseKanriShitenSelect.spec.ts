// Tests for <BaseKanriShitenSelect> — multi-select paginated/searchable 管理支店.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseKanriShitenSelect from '@/components/common/BaseKanriShitenSelect.vue';

vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
}));

function buildResponse(
  rows: Array<{ kanri_shiten_id: number; kanri_shiten_code: string; kanri_shiten_name: string }>,
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
  return mount(BaseKanriShitenSelect, {
    props: { jaId: 13, ...props },
    global: { plugins: [Antd] },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  vi.mocked(getKanriShitenDropdown).mockResolvedValue(
    buildResponse([
      { kanri_shiten_id: 20, kanri_shiten_code: 'KS01', kanri_shiten_name: '千代田支所' },
      { kanri_shiten_id: 21, kanri_shiten_code: 'KS02', kanri_shiten_name: '新宿支所' },
    ]),
  );
});

describe('BaseKanriShitenSelect', () => {
  it('should fetch page 1 with ja_id + per_page=50 on mount', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    await mountDropdown();
    await flushPromises();
    expect(getKanriShitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ ja_id: 13, page: 1, per_page: 50 }),
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
        { value: 20, label: 'KS01 千代田支所' },
        { value: 21, label: 'KS02 新宿支所' },
      ]),
    );
  });

  it('should render as a multiple select', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    expect(wrapper.findComponent({ name: 'ASelect' }).props('mode')).toBe('multiple');
  });

  it('should debounce search and call with q + page 1 + ja_id', async () => {
    vi.useFakeTimers();
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(getKanriShitenDropdown).mockClear();

    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('search', '千代田');
    vi.advanceTimersByTime(300);
    await flushPromises();

    expect(getKanriShitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ q: '千代田', page: 1, ja_id: 13 }),
    );
    vi.useRealTimers();
  });

  it('should append page 2 on popup-scroll to the bottom', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(getKanriShitenDropdown).mockResolvedValueOnce(
      buildResponse([{ kanri_shiten_id: 20, kanri_shiten_code: 'KS01', kanri_shiten_name: 'A' }], {
        has_more: true,
      }),
    );
    const wrapper = await mountDropdown();
    await flushPromises();

    vi.mocked(getKanriShitenDropdown).mockResolvedValueOnce(
      buildResponse([{ kanri_shiten_id: 71, kanri_shiten_code: 'KS71', kanri_shiten_name: 'B' }], {
        page: 2,
        has_more: false,
      }),
    );
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('popup-scroll', {
      target: { scrollTop: 900, clientHeight: 200, scrollHeight: 1000 },
    } as unknown as Event);
    await flushPromises();

    expect(getKanriShitenDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect((wrapper.vm as any).options).toHaveLength(2);
  });

  it('should emit update:value with the selected id array on @change', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('change', [20, 21]);
    await flushPromises();
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual([[20, 21]]);
  });
});

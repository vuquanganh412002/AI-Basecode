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

  it('#57976: should NOT pass active_only by default (unchanged behavior for existing callers)', async () => {
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    await mountDropdown();
    await flushPromises();
    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.not.objectContaining({ active_only: expect.anything() }),
    );
  });

  it('#57976: should pass active_only=true when the activeOnly prop is set (SCR-028 廃店除外)', async () => {
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    await mountDropdown({ activeOnly: true });
    await flushPromises();
    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ active_only: true }),
    );
  });

  it('should emit update:value with the selected id array on @change', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    wrapper.findComponent({ name: 'ASelect' }).vm.$emit('change', [1, 2]);
    await flushPromises();
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual([[1, 2]]);
  });

  it('loadAll (全て選択) fetches every page with a large per_page and returns all ids', async () => {
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    const wrapper = await mountDropdown({ allowSelectAll: true });
    await flushPromises(); // onMounted page-1 fetch (beforeEach default)

    vi.mocked(getHanbaitenDropdown).mockReset();
    vi.mocked(getHanbaitenDropdown)
      .mockResolvedValueOnce(
        buildResponse(
          [
            { hanbaiten_id: 10, hanbaiten_code: 'H010', hanbaiten_name: 'A' },
            { hanbaiten_id: 11, hanbaiten_code: 'H011', hanbaiten_name: 'B' },
          ],
          { has_more: true },
        ),
      )
      .mockResolvedValueOnce(
        buildResponse(
          [{ hanbaiten_id: 12, hanbaiten_code: 'H012', hanbaiten_name: 'C' }],
          { page: 2, has_more: false },
        ),
      );

    const ids = await (wrapper.vm as any).loadAll();

    expect(ids).toEqual([10, 11, 12]);
    // 全ページを大きめ per_page で走査。
    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 100 }),
    );
    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, per_page: 100 }),
    );
    // ラベル表示のため取得行は options へマージされる。
    expect((wrapper.vm as any).options.map((o: { hanbaiten_id: number }) => o.hanbaiten_id))
      .toEqual(expect.arrayContaining([10, 11, 12]));
  });

  it('loadAll keeps paging across MANY pages (has_more) until the last, collecting every store', async () => {
    // 複数ページ（3ページ）でも has_more=false になるまで全走査し、全件を取りこぼさない。
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    const wrapper = await mountDropdown({ allowSelectAll: true });
    await flushPromises(); // onMounted page-1 fetch

    const mkRow = (id: number) => ({
      hanbaiten_id: id,
      hanbaiten_code: `H${String(id).padStart(3, '0')}`,
      hanbaiten_name: `店${id}`,
    });
    vi.mocked(getHanbaitenDropdown).mockReset();
    vi.mocked(getHanbaitenDropdown)
      .mockResolvedValueOnce(
        buildResponse([mkRow(1), mkRow(2)], { page: 1, has_more: true }),
      )
      .mockResolvedValueOnce(
        buildResponse([mkRow(3), mkRow(4)], { page: 2, has_more: true }),
      )
      .mockResolvedValueOnce(
        buildResponse([mkRow(5)], { page: 3, has_more: false }),
      );

    const ids = await (wrapper.vm as any).loadAll();

    // 3ページ分の全店舗が漏れなく返る（最終ページ含む）。
    expect(ids).toEqual([1, 2, 3, 4, 5]);
    // ちょうど3回（page 1..3）呼ばれ、4ページ目は叩かない。
    expect(getHanbaitenDropdown).toHaveBeenCalledTimes(3);
    expect(vi.mocked(getHanbaitenDropdown).mock.calls.map((c) => (c[0] as { page: number }).page))
      .toEqual([1, 2, 3]);
  });
});

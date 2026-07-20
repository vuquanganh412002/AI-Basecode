// Tests for <BaseKanriShitenDropdown> (single-select). Common dropdown
// mechanics are covered by BaseJaDropdown.spec.ts — these focus on
// kanri-shiten specifics: ja_id param, label, meta fallback, ja cascade.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseKanriShitenDropdown from '@/components/common/BaseKanriShitenDropdown.vue';

vi.mock('@/api/kanri-shiten/kanri-shiten', () => ({
  getKanriShitenDropdown: vi.fn(),
}));

function buildResponse(
  rows: Array<{ kanri_shiten_id: number; kanri_shiten_code?: string; kanri_shiten_name: string }>,
  withMeta = true,
) {
  const data = rows.map((r) => ({
    kanri_shiten_code: 'KS001',
    paper_flg: true,
    denshi_flg: true,
    ...r,
  }));
  return withMeta
    ? { data, meta: { total: data.length, page: 1, per_page: 50, has_more: false } }
    : { data };
}

async function mountDropdown(props: Record<string, unknown> = {}) {
  return mount(BaseKanriShitenDropdown, {
    props: { jaId: 1, ...props },
    global: { plugins: [Antd] },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
  vi.mocked(getKanriShitenDropdown).mockResolvedValue(
    buildResponse([
      { kanri_shiten_id: 10, kanri_shiten_code: 'KS001', kanri_shiten_name: '中央管理支店' },
      { kanri_shiten_id: 20, kanri_shiten_code: 'KS002', kanri_shiten_name: '渋谷管理支店' },
    ]),
  );
});

describe('BaseKanriShitenDropdown', () => {
  it('fetches page 1 scoped to jaId on mount', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    await mountDropdown({ jaId: 7 });
    await flushPromises();
    expect(getKanriShitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ ja_id: 7, page: 1, per_page: 50 }),
    );
  });

  it('composes label as `${code} ${name}`', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    const opts = sel.props('options') as Array<{ value: number; label: string }>;
    expect(opts).toEqual([
      { value: 10, label: 'KS001 中央管理支店' },
      { value: 20, label: 'KS002 渋谷管理支店' },
    ]);
  });

  it('tolerates an envelope without meta (legacy { data } shape)', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    vi.mocked(getKanriShitenDropdown).mockResolvedValue(
      buildResponse([{ kanri_shiten_id: 1, kanri_shiten_name: 'A' }], false) as never,
    );
    const wrapper = await mountDropdown();
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'ASelect' }).props('options') as unknown[],
    ).toHaveLength(1);
  });

  it('refetches + clears selection when jaId changes (hard cascade)', async () => {
    const { getKanriShitenDropdown } = await import('@/api/kanri-shiten/kanri-shiten');
    const wrapper = await mountDropdown({ jaId: 1, value: 99 });
    await flushPromises();
    vi.mocked(getKanriShitenDropdown).mockClear();

    await wrapper.setProps({ jaId: 2 });
    await flushPromises();

    expect(getKanriShitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ ja_id: 2, page: 1 }),
    );
    const emits = wrapper.emitted('update:value') ?? [];
    expect(emits.some((e) => e[0] === null)).toBe(true);
  });
});

// Tests for <BaseHanbaitenDropdown> (single-select). Common mechanics are
// covered by BaseJaDropdown.spec.ts — these focus on hanbaiten specifics:
// ja_id param, label, change emit.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseHanbaitenDropdown from '@/components/common/BaseHanbaitenDropdown.vue';

vi.mock('@/api/hanbaiten/hanbaiten', () => ({
  getHanbaitenDropdown: vi.fn(),
}));

function buildResponse(
  rows: Array<{ hanbaiten_id: number; hanbaiten_code?: string; hanbaiten_name: string }>,
) {
  const data = rows.map((r) => ({ hanbaiten_code: 'H001', ...r }));
  return { data, meta: { total: data.length, page: 1, per_page: 50, has_more: false } };
}

async function mountDropdown(props: Record<string, unknown> = {}) {
  return mount(BaseHanbaitenDropdown, { props, global: { plugins: [Antd] } });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
  vi.mocked(getHanbaitenDropdown).mockResolvedValue(
    buildResponse([
      { hanbaiten_id: 501, hanbaiten_code: 'H001', hanbaiten_name: '渋谷販売店' },
      { hanbaiten_id: 502, hanbaiten_code: 'H002', hanbaiten_name: '新宿販売店' },
    ]),
  );
});

describe('BaseHanbaitenDropdown', () => {
  it('fetches page 1 on mount (ja_id omitted for session-scoped roles)', async () => {
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    await mountDropdown();
    await flushPromises();
    expect(getHanbaitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 50 }),
    );
  });

  it('passes ja_id when set (NICHINO_* 代行入力)', async () => {
    const { getHanbaitenDropdown } = await import('@/api/hanbaiten/hanbaiten');
    await mountDropdown({ jaId: 7 });
    await flushPromises();
    expect(getHanbaitenDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ ja_id: 7 }),
    );
  });

  it('composes label as `${code} ${name}`', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    const opts = wrapper.findComponent({ name: 'ASelect' }).props('options') as Array<{
      value: number;
      label: string;
    }>;
    expect(opts).toEqual([
      { value: 501, label: 'H001 渋谷販売店' },
      { value: 502, label: 'H002 新宿販売店' },
    ]);
  });
});

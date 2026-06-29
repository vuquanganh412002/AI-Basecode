// Tests for <BaseShitenDropdown> (single-select). Common mechanics are
// covered by BaseJaDropdown.spec.ts — these focus on shiten specifics:
// kanri_shiten_id cascade param + reset, ja_id param, label.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseShitenDropdown from '@/components/common/BaseShitenDropdown.vue';

vi.mock('@/api/shiten/shiten', () => ({
  getShitenDropdown: vi.fn(),
}));

function buildResponse(
  rows: Array<{ shiten_id: number; shiten_code?: string; shiten_name: string }>,
) {
  const data = rows.map((r) => ({
    shiten_code: 'SH001',
    kanri_shiten_id: 10,
    kinyu_shiten_flg: false,
    ...r,
  }));
  return { data, meta: { total: data.length, page: 1, per_page: 50, has_more: false } };
}

async function mountDropdown(props: Record<string, unknown> = {}) {
  return mount(BaseShitenDropdown, { props, global: { plugins: [Antd] } });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getShitenDropdown } = await import('@/api/shiten/shiten');
  vi.mocked(getShitenDropdown).mockResolvedValue(
    buildResponse([
      { shiten_id: 100, shiten_code: 'SH001', shiten_name: '千代田支店' },
      { shiten_id: 200, shiten_code: 'SH002', shiten_name: '渋谷支店' },
    ]),
  );
});

describe('BaseShitenDropdown', () => {
  it('passes kanri_shiten_id + ja_id params when set', async () => {
    const { getShitenDropdown } = await import('@/api/shiten/shiten');
    await mountDropdown({ kanriShitenId: 10, jaId: 7 });
    await flushPromises();
    expect(getShitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ kanri_shiten_id: 10, ja_id: 7, page: 1, per_page: 50 }),
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
      { value: 100, label: 'SH001 千代田支店' },
      { value: 200, label: 'SH002 渋谷支店' },
    ]);
  });

  it('refetches scoped + clears selection when kanriShitenId changes (cascade)', async () => {
    const { getShitenDropdown } = await import('@/api/shiten/shiten');
    const wrapper = await mountDropdown({ kanriShitenId: 10, value: 100 });
    await flushPromises();
    vi.mocked(getShitenDropdown).mockClear();

    await wrapper.setProps({ kanriShitenId: 20 });
    await flushPromises();

    expect(getShitenDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ kanri_shiten_id: 20, page: 1 }),
    );
    const emits = wrapper.emitted('update:value') ?? [];
    expect(emits.some((e) => e[0] === null)).toBe(true);
  });
});

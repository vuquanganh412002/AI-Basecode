// Tests for <BaseAccountDropdown> — server-side-paginated + searchable
// account picker. Shares its scroll/debounce/include_id mechanics with
// <BaseJaDropdown> (covered by BaseJaDropdown.spec.ts); these tests
// focus on the props that differ — labelFormat + searchField — plus the
// initial-load contract.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';

import BaseAccountDropdown from '@/components/common/BaseAccountDropdown.vue';

vi.mock('@/api/account/account', () => ({
  listAccountDropdown: vi.fn(),
}));

function buildResponse(
  rows: Array<{
    account_id: number;
    login_id: string;
    account_name: string;
    role_code?: string;
    ja_id?: number | null;
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
      role_code: 'JA_HONTEN',
      ja_id: 1,
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
  return mount(BaseAccountDropdown, {
    props,
    global: { plugins: [Antd] },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { listAccountDropdown } = await import('@/api/account/account');
  vi.mocked(listAccountDropdown).mockResolvedValue(
    buildResponse([
      { account_id: 10, login_id: 'admin001', account_name: '管理者太郎' },
      { account_id: 11, login_id: 'ja_honten_001', account_name: 'JA本店 太郎' },
    ]),
  );
});

describe('BaseAccountDropdown — initial load', () => {
  it('should fetch page 1 with default per_page=50 on mount', async () => {
    const { listAccountDropdown } = await import('@/api/account/account');
    await mountDropdown();
    await flushPromises();
    expect(listAccountDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 50 }),
    );
  });

  it('should include `include_id` when a value is set on mount', async () => {
    const { listAccountDropdown } = await import('@/api/account/account');
    await mountDropdown({ value: 42 });
    await flushPromises();
    expect(listAccountDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ include_id: 42 }),
    );
  });
});

// ACSMS-SCR-030 log view opts into name-only display + search. Default
// callers must be unaffected.
describe('BaseAccountDropdown — labelFormat / searchField props', () => {
  it('should compose option label as `${login_id} ${account_name}` (space-separated) by default', async () => {
    const wrapper = await mountDropdown();
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    const opts = sel.props('options') as Array<{ value: number; label: string }>;
    expect(opts).toEqual(
      expect.arrayContaining([
        { value: 10, label: 'admin001 管理者太郎' },
        { value: 11, label: 'ja_honten_001 JA本店 太郎' },
      ]),
    );
  });

  it('should compose option label as account_name only when labelFormat=name', async () => {
    const wrapper = await mountDropdown({ labelFormat: 'name' });
    await flushPromises();
    const sel = wrapper.findComponent({ name: 'ASelect' });
    const opts = sel.props('options') as Array<{ value: number; label: string }>;
    expect(opts).toEqual(
      expect.arrayContaining([
        { value: 10, label: '管理者太郎' },
        { value: 11, label: 'JA本店 太郎' },
      ]),
    );
    // Sanity: the login_id prefix must NOT leak into any label.
    for (const o of opts) expect(o.label).not.toMatch(/^admin|^ja_/);
  });

  it('should NOT send match_field by default (BE treats absent as both)', async () => {
    const { listAccountDropdown } = await import('@/api/account/account');
    await mountDropdown();
    await flushPromises();
    const params = vi.mocked(listAccountDropdown).mock.calls[0]?.[0] ?? {};
    expect(params).not.toHaveProperty('match_field');
  });

  it('should send match_field=name when searchField=name', async () => {
    const { listAccountDropdown } = await import('@/api/account/account');
    await mountDropdown({ searchField: 'name' });
    await flushPromises();
    expect(listAccountDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ match_field: 'name' }),
    );
  });

  it('should keep sending match_field=name on subsequent search requests', async () => {
    vi.useFakeTimers();
    const { listAccountDropdown } = await import('@/api/account/account');
    const wrapper = await mountDropdown({ searchField: 'name' });
    await flushPromises();
    vi.mocked(listAccountDropdown).mockClear();

    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('search', '太郎');
    vi.advanceTimersByTime(400);
    await flushPromises();

    expect(listAccountDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ q: '太郎', match_field: 'name' }),
    );
    vi.useRealTimers();
  });
});

describe('BaseAccountDropdown — infinite scroll', () => {
  it('should append page 2 results when popup-scroll reaches the bottom', async () => {
    const { listAccountDropdown } = await import('@/api/account/account');
    vi.mocked(listAccountDropdown).mockResolvedValueOnce(
      buildResponse(
        [
          { account_id: 10, login_id: 'admin001', account_name: '管理者太郎' },
          { account_id: 11, login_id: 'ja_honten_001', account_name: 'JA本店 太郎' },
        ],
        { has_more: true, total: 200 },
      ),
    );
    vi.mocked(listAccountDropdown).mockResolvedValueOnce(
      buildResponse(
        [{ account_id: 12, login_id: 'next_page', account_name: '次ページ' }],
        { has_more: false, total: 200 },
      ),
    );

    const wrapper = await mountDropdown();
    await flushPromises();

    const sel = wrapper.findComponent({ name: 'ASelect' });
    const fakeEl = { scrollTop: 500, clientHeight: 200, scrollHeight: 600 };
    sel.vm.$emit('popup-scroll', { target: fakeEl } as unknown as Event);
    await flushPromises();

    expect(listAccountDropdown).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    const opts = sel.props('options') as Array<{ value: number }>;
    expect(opts).toHaveLength(3);
  });

  it('should NOT request next page when meta.has_more is false', async () => {
    const { listAccountDropdown } = await import('@/api/account/account');
    const wrapper = await mountDropdown();
    await flushPromises();
    vi.mocked(listAccountDropdown).mockClear();

    const sel = wrapper.findComponent({ name: 'ASelect' });
    sel.vm.$emit('popup-scroll', {
      target: { scrollTop: 500, clientHeight: 200, scrollHeight: 600 },
    } as unknown as Event);
    await flushPromises();

    expect(listAccountDropdown).not.toHaveBeenCalled();
  });
});

// @ts-nocheck — TDD red phase (/gen-ut-frontend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面 (お知らせエリア §15)
//
// Drives src/components/common/NoticeList.vue. Component renders a card
// with a header + list of {date, title} items, falling back to an empty-
// state copy when items is empty.

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NoticeList from '@/components/common/NoticeList.vue';

describe('NoticeList', () => {
  it('should render the default お知らせ heading when title prop is omitted', () => {
    const wrapper = mount(NoticeList, { props: { items: [] } });
    expect(wrapper.text()).toContain('お知らせ');
  });

  it('should render a custom title when title prop is provided', () => {
    const wrapper = mount(NoticeList, {
      props: { items: [], title: '新着情報' },
    });
    expect(wrapper.text()).toContain('新着情報');
  });

  it('should render お知らせはありません。 when items array is empty', () => {
    const wrapper = mount(NoticeList, { props: { items: [] } });
    expect(wrapper.text()).toContain('お知らせはありません');
  });

  it('should render each item title and date when items array has entries', () => {
    const wrapper = mount(NoticeList, {
      props: {
        items: [
          { date: '2026.04.10', title: 'システムメンテナンスのお知らせ' },
          { date: '2026.04.05', title: '新機能リリース' },
        ],
      },
    });
    expect(wrapper.text()).toContain('2026.04.10');
    expect(wrapper.text()).toContain('システムメンテナンスのお知らせ');
    expect(wrapper.text()).toContain('2026.04.05');
    expect(wrapper.text()).toContain('新機能リリース');
  });

  it('should NOT render the empty-state copy when items array has entries', () => {
    const wrapper = mount(NoticeList, {
      props: {
        items: [{ date: '2026.04.10', title: 'メンテのお知らせ' }],
      },
    });
    expect(wrapper.text()).not.toContain('お知らせはありません');
  });

  // §15: the banner shows ~5 rows then scrolls; it must never drop items.
  const buildItems = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      date: `2026.04.${String(i + 1).padStart(2, '0')}`,
      title: `お知らせ${i + 1}`,
    }));

  it('should NOT apply the scroll cap when item count is at or below maxVisible (default 5)', () => {
    const wrapper = mount(NoticeList, { props: { items: buildItems(5) } });
    const list = wrapper.get('[data-test="notice-list"]');
    expect(list.classes()).not.toContain('overflow-y-auto');
    expect(list.classes()).not.toContain('max-h-52');
  });

  it('should apply the scroll cap when item count exceeds maxVisible (default 5)', () => {
    const wrapper = mount(NoticeList, { props: { items: buildItems(6) } });
    const list = wrapper.get('[data-test="notice-list"]');
    expect(list.classes()).toContain('overflow-y-auto');
    expect(list.classes()).toContain('max-h-52');
  });

  it('should render ALL items (not truncate) when count exceeds maxVisible', () => {
    const wrapper = mount(NoticeList, { props: { items: buildItems(8) } });
    const rows = wrapper.get('[data-test="notice-list"]').findAll('.font-mono');
    expect(rows).toHaveLength(8);
    expect(wrapper.text()).toContain('お知らせ8');
  });

  it('should honour a custom maxVisible threshold for the scroll cap', () => {
    const wrapper = mount(NoticeList, {
      props: { items: buildItems(4), maxVisible: 3 },
    });
    expect(
      wrapper.get('[data-test="notice-list"]').classes(),
    ).toContain('overflow-y-auto');
  });
});

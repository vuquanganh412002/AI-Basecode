// @ts-nocheck — TDD red phase (/gen-ut-frontend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面 (お知らせエリア §15)
//
// Drives src/components/common/NoticeList.vue. Component renders a card
// with a header + list of {date, title} items, falling back to an empty-
// state copy when items is empty.

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NoticeList from '../NoticeList.vue';

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
});

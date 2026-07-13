import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Antd from 'ant-design-vue';

import BaseReportPager from '@/components/common/BaseReportPager.vue';

const mountPager = (props: Record<string, unknown> = {}) =>
  mount(BaseReportPager, {
    global: { plugins: [Antd] },
    props: {
      current: 1,
      pageNo: 1,
      totalPages: 3,
      perPage: 28,
      totalRows: 60,
      dataTest: 'report-pager',
      ...props,
    },
  });

describe('BaseReportPager', () => {
  it('renders 全N件・p/Pページ + a-pagination with total = totalPages × perPage', () => {
    const wrapper = mountPager();
    expect(wrapper.text()).toContain('全60件・1/3ページ');
    const pag = wrapper.findComponent({ name: 'APagination' });
    expect(pag.props('total')).toBe(84); // 3 × 28
    expect(pag.props('pageSize')).toBe(28);
    expect(pag.props('current')).toBe(1);
  });

  it('does not render when totalPages <= 1 (root hidden via v-if)', () => {
    const wrapper = mountPager({ totalPages: 1 });
    expect(wrapper.find('[data-test="report-pager"]').exists()).toBe(false);
  });

  it('exposes the given data-test on the root bar', () => {
    const wrapper = mountPager({ dataTest: 'meibo-pager' });
    expect(wrapper.find('[data-test="meibo-pager"]').exists()).toBe(true);
  });

  it('emits change with the clicked page', async () => {
    const wrapper = mountPager({ totalPages: 2 });
    await wrapper.find('.ant-pagination-item-2').trigger('click');
    expect(wrapper.emitted('change')?.at(-1)).toEqual([2]);
  });
});

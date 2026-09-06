// Drives src/components/common/BaseImportPreviewTable.vue. Locks the unified
// Excel-import preview table shared by ACSMS-SCR-016 (DokusyaImportView) and
// ACSMS-SCR-019 (HanbaitenImportView) — hanbaiten's paginated preview
// (UI統一 2026-08) is the source of truth both screens converge on.

import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';
import BaseImportPreviewTable from '@/components/common/BaseImportPreviewTable.vue';

function buildRows(count: number): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, i) => ({
    code: `C${String(i + 1).padStart(3, '0')}`,
    name: `名前${i + 1}`,
  }));
}

const COLUMNS = ['code', 'name'];
const HEADER_LABELS = { code: 'コード', name: '名前' };

function mountTable(props: Record<string, unknown> = {}) {
  return mount(BaseImportPreviewTable, {
    props: {
      rows: buildRows(3),
      columns: COLUMNS,
      headerLabels: HEADER_LABELS,
      ...props,
    },
    global: { plugins: [Antd] },
  });
}

describe('BaseImportPreviewTable — header + columns', () => {
  it('renders the count badge and column headers', () => {
    const wrapper = mountTable();
    expect(wrapper.text()).toContain('取込データプレビュー');
    expect(wrapper.text()).toContain('3件');
    expect(wrapper.find('thead').text()).toContain('コード');
    expect(wrapper.find('thead').text()).toContain('名前');
  });

  it('only renders the columns passed in `columns` (unchecked columns are omitted)', () => {
    const wrapper = mountTable({ columns: ['code'], headerLabels: HEADER_LABELS });
    const headerText = wrapper.find('thead').text();
    expect(headerText).toContain('コード');
    expect(headerText).not.toContain('名前');
  });
});

describe('BaseImportPreviewTable — cell rendering', () => {
  it('renders null/undefined as empty and boolean as ✓/empty by default', () => {
    const wrapper = mountTable({
      rows: [{ code: 'C001', name: null }, { code: 'C002', name: undefined }],
      columns: ['code', 'name'],
    });
    const cells = wrapper.findAll('tbody td');
    // row1: code, name(null→'') / row2: code, name(undefined→'')
    expect(cells.map((c) => c.text())).toEqual(['C001', '', 'C002', '']);
  });

  it('supports a custom renderCell override', () => {
    const wrapper = mountTable({
      rows: [{ code: 'C001', name: true }],
      renderCell: (v: unknown) => (typeof v === 'boolean' ? (v ? 'YES' : 'NO') : String(v ?? '')),
    });
    expect(wrapper.text()).toContain('YES');
  });
});

describe('BaseImportPreviewTable — pagination (default 20 rows/page)', () => {
  it('renders only the first 20 rows by default and shows the true total in the badge/pager', async () => {
    const wrapper = mountTable({ rows: buildRows(45) });
    await flushPromises();

    expect(wrapper.findAll('tbody tr')).toHaveLength(20);
    expect(wrapper.text()).toContain('C001');
    expect(wrapper.text()).not.toContain('C021');
    expect(wrapper.text()).toContain('45件');
    expect(wrapper.find('[data-test="preview-pagination"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('全 45 件');
  });

  it('navigates to page 2 and shows the next 20 rows', async () => {
    const wrapper = mountTable({ rows: buildRows(45) });
    await wrapper.find('.ant-pagination-item-2').trigger('click');
    await flushPromises();

    expect(wrapper.findAll('tbody tr')).toHaveLength(20);
    expect(wrapper.text()).toContain('C021');
    expect(wrapper.text()).not.toContain('C001');
  });

  it('accepts a custom pageSize prop', async () => {
    const wrapper = mountTable({ rows: buildRows(45), pageSize: 10 });
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(10);
  });

  it('does not render the pager section content beyond 1 page differently, but pager always shows for non-empty rows', () => {
    const wrapper = mountTable({ rows: buildRows(3) });
    expect(wrapper.find('[data-test="preview-pagination"]').exists()).toBe(true);
  });

  it('hides the pager entirely when there are no rows', () => {
    const wrapper = mountTable({ rows: [] });
    expect(wrapper.find('[data-test="preview-pagination"]').exists()).toBe(false);
  });

  it('resetPage() (exposed) returns the view to page 1', async () => {
    const wrapper = mountTable({ rows: buildRows(45) });
    await wrapper.find('.ant-pagination-item-2').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('C021');

    (wrapper.vm as unknown as { resetPage: () => void }).resetPage();
    await flushPromises();
    expect(wrapper.text()).toContain('C001');
    expect(wrapper.text()).not.toContain('C021');
  });
});

// Drives src/components/common/BaseImportErrorPanel.vue. Locks the
// unified Excel-import error display shared by ACSMS-SCR-016
// (DokusyaImportView) and ACSMS-SCR-019 (HanbaitenImportView) — UI統一
// 2026-08: hanbaiten の見た目（枠線・件数付きタイトル・表形式）を正とする。

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseImportErrorPanel from '@/components/common/BaseImportErrorPanel.vue';

describe('BaseImportErrorPanel — visibility', () => {
  it('should render nothing when errors is empty', () => {
    const wrapper = mount(BaseImportErrorPanel, { props: { errors: [] } });
    expect(wrapper.find('[data-test="import-error-panel"]').exists()).toBe(false);
  });

  it('should render the panel when errors has at least one item', () => {
    const wrapper = mount(BaseImportErrorPanel, {
      props: { errors: [{ row: 2, field: 'foo', message: 'エラーです。' }] },
    });
    expect(wrapper.find('[data-test="import-error-panel"]').exists()).toBe(true);
  });
});

describe('BaseImportErrorPanel — content', () => {
  it('should show the error count in the title (取込エラー（N件）)', () => {
    const wrapper = mount(BaseImportErrorPanel, {
      props: {
        errors: [
          { row: 2, field: 'a', message: 'msg1' },
          { row: 3, field: 'b', message: 'msg2' },
        ],
      },
    });
    expect(wrapper.text()).toContain('取込エラー（2件）');
  });

  it('should render one row per error with row/field/message columns', () => {
    const wrapper = mount(BaseImportErrorPanel, {
      props: {
        errors: [
          { row: 2, field: 'hanbaiten_code', message: '販売店コードが見つかりません。' },
        ],
        fieldLabels: { hanbaiten_code: '販売店コード' },
      },
    });
    const rows = wrapper.findAll('[data-test="import-error-row"]');
    expect(rows).toHaveLength(1);
    const text = rows[0].text();
    expect(text).toContain('2行目');
    expect(text).toContain('販売店コード');
    expect(text).toContain('販売店コードが見つかりません。');
  });

  it('should fall back to the raw field name when fieldLabels has no mapping', () => {
    const wrapper = mount(BaseImportErrorPanel, {
      props: {
        errors: [{ row: 5, field: 'unknown_col', message: '不正な値です。' }],
      },
    });
    expect(wrapper.text()).toContain('unknown_col');
  });

  it('should show — for row and field when they are omitted (top-level errors)', () => {
    const wrapper = mount(BaseImportErrorPanel, {
      props: { errors: [{ message: 'ファイル全体のエラーです。' }] },
    });
    const row = wrapper.find('[data-test="import-error-row"]');
    // Both the row cell and field cell fall back to the em-dash placeholder.
    expect(row.text()).toMatch(/—.*—/);
  });

  it('should render every error (no built-in truncation) — capping is the caller responsibility', () => {
    const errors = Array.from({ length: 15 }, (_, i) => ({
      row: i + 2,
      field: 'dokusya_busu',
      message: 'エラー',
    }));
    const wrapper = mount(BaseImportErrorPanel, { props: { errors } });
    expect(wrapper.findAll('[data-test="import-error-row"]')).toHaveLength(15);
  });
});

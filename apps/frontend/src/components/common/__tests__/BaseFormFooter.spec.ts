// Drives src/components/common/BaseFormFooter.vue. Locks the form-footer
// contract that every CRUD form (Ja / Tanka / Shiten / KanriShiten)
// depends on: primary-action-LEFT layout, 登録 / 更新 label flip,
// 前の画面に戻る cancel label, submitting / disabled gating, danger
// variant for delete-confirm forms.

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Antd from 'ant-design-vue';
import BaseFormFooter from '@/components/common/BaseFormFooter.vue';

function mountFooter(props: Record<string, unknown> = {}) {
  return mount(BaseFormFooter, {
    props,
    global: { plugins: [Antd] },
  });
}

describe('BaseFormFooter — labels', () => {
  it('should render 登録 on submit + 前の画面に戻る on cancel by default (create mode)', () => {
    const wrapper = mountFooter();
    const buttons = wrapper.findAll('button');
    expect(buttons[0].text()).toContain('登');  // antd inserts a space between 2-CJK-char labels
    expect(buttons[1].text()).toContain('前の画面に戻る');
  });

  it('should flip the submit label to 更新 when isEdit is true', () => {
    const wrapper = mountFooter({ isEdit: true });
    const submit = wrapper.find('button[type="submit"]');
    expect(submit.text()).toContain('更');
  });

  it('should use submitText override when provided (skips isEdit default)', () => {
    const wrapper = mountFooter({ submitText: '削除する', isEdit: true });
    const submit = wrapper.find('button[type="submit"]');
    expect(submit.text()).toContain('削除する');
  });

  it('should use cancelText override when provided', () => {
    const wrapper = mountFooter({ cancelText: 'キャンセル' });
    const buttons = wrapper.findAll('button');
    expect(buttons[1].text()).toContain('キャンセル');
  });
});

describe('BaseFormFooter — layout', () => {
  it('should put the submit button FIRST (primary action left)', () => {
    const wrapper = mountFooter();
    const buttons = wrapper.findAll('button');
    // First button is the html-type="submit"; second is the cancel.
    expect(buttons[0].attributes('type')).toBe('submit');
    expect(buttons[1].attributes('type')).not.toBe('submit');
  });

  it('should use justify-start (left alignment) on the container', () => {
    const wrapper = mountFooter();
    const container = wrapper.find('div');
    expect(container.classes().join(' ')).toContain('justify-start');
  });
});

describe('BaseFormFooter — submitting state', () => {
  it('should show loading on submit + disable cancel when submitting is true', () => {
    const wrapper = mountFooter({ submitting: true });
    const buttons = wrapper.findAll('button');
    // Antd adds `ant-btn-loading` class on the submit button (instead
    // of `disabled` attribute) when `:loading="true"`. Cancel still
    // gets the `disabled` attribute via the `:disabled="submitting"`
    // binding we wire below it.
    expect(buttons[0].classes().join(' ')).toMatch(/ant-btn-loading|loading/);
    expect(buttons[1].attributes('disabled')).toBeDefined();
  });

  it('should disable ONLY the submit button when disabled=true but not submitting', () => {
    const wrapper = mountFooter({ disabled: true });
    const buttons = wrapper.findAll('button');
    expect(buttons[0].attributes('disabled')).toBeDefined();
    expect(buttons[1].attributes('disabled')).toBeUndefined();
  });
});

describe('BaseFormFooter — cancel event', () => {
  it('should emit `cancel` when the cancel button is clicked', async () => {
    const wrapper = mountFooter();
    const cancelBtn = wrapper.findAll('button')[1];
    await cancelBtn.trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('should NOT render the cancel button when hideCancel is true', () => {
    const wrapper = mountFooter({ hideCancel: true });
    expect(wrapper.findAll('button')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('前の画面に戻る');
  });
});

describe('BaseFormFooter — danger variant', () => {
  it('should apply the danger style on submit when danger=true', () => {
    const wrapper = mountFooter({ danger: true, submitText: '削除' });
    const submit = wrapper.find('button[type="submit"]');
    // Antd marks danger buttons with `ant-btn-dangerous`.
    expect(submit.classes().join(' ')).toMatch(/ant-btn-dangerous|dangerous/);
  });
});

describe('BaseFormFooter — data-test selector', () => {
  it('should expose data-test="btn-back" on the cancel button (spec contract)', () => {
    const wrapper = mountFooter();
    const back = wrapper.find('[data-test="btn-back"]');
    expect(back.exists()).toBe(true);
  });
});

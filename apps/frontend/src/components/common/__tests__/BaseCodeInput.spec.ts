// Drives src/components/common/BaseCodeInput.vue — whitespace-defense
// wrapper around <a-input> used for code-like fields (ja_code, tanka_code,
// login_id, bank_code, yubin_no, …).
//
// Covers the 4 defense layers documented in the component:
//   1. autocorrect/autocapitalize/spellcheck off (static attrs — smoke test)
//   2. @beforeinput — preventDefault on whitespace data / macOS "Replace" inputType
//   3. @keydown.space.prevent (native, not separately unit-tested here)
//   4. @update:value sanitizer — strips all \s before emitting

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Antd from 'ant-design-vue';
import BaseCodeInput from '@/components/common/BaseCodeInput.vue';

function mountInput(props: Record<string, unknown> = {}) {
  return mount(BaseCodeInput, {
    props,
    global: { plugins: [Antd] },
  });
}

describe('BaseCodeInput', () => {
  it('renders the passthrough props onto the underlying input', () => {
    const wrapper = mountInput({
      value: 'T001',
      maxlength: 10,
      disabled: false,
      placeholder: '単価コード',
      id: 'tanka_code',
    });
    const input = wrapper.find('input');
    expect((input.element as HTMLInputElement).value).toBe('T001');
    expect(input.attributes('maxlength')).toBe('10');
    expect(input.attributes('placeholder')).toBe('単価コード');
    expect(input.attributes('id')).toBe('tanka_code');
    expect(input.attributes('autocomplete')).toBe('off');
    expect(input.attributes('autocorrect')).toBe('off');
    expect(input.attributes('autocapitalize')).toBe('off');
    expect(input.attributes('spellcheck')).toBe('false');
  });

  it('disables the input when disabled prop is true', () => {
    const wrapper = mountInput({ value: '', disabled: true });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
  });

  it('emits update:value with whitespace stripped when the underlying value changes', async () => {
    const wrapper = mountInput({ value: '' });
    await wrapper.find('input').setValue('T 0 0 1');

    const emits = wrapper.emitted('update:value');
    expect(emits).toBeTruthy();
    expect(emits![emits!.length - 1][0]).toBe('T001');
  });

  it('preventDefaults a beforeinput event whose data contains whitespace (paste/IME guard)', () => {
    const wrapper = mountInput({ value: 'T001' });
    const input = wrapper.find('input').element as HTMLInputElement;
    const evt = new InputEvent('beforeinput', { data: ' ', cancelable: true });

    input.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(true);
  });

  it('preventDefaults a beforeinput event whose inputType matches /Replace/i (macOS double-space→period)', () => {
    const wrapper = mountInput({ value: 'T001' });
    const input = wrapper.find('input').element as HTMLInputElement;
    const evt = new InputEvent('beforeinput', {
      inputType: 'insertReplacementText',
      data: '.',
      cancelable: true,
    });

    input.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(true);
  });

  it('does NOT preventDefault a beforeinput event for a normal, non-whitespace character', () => {
    const wrapper = mountInput({ value: 'T00' });
    const input = wrapper.find('input').element as HTMLInputElement;
    const evt = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: '1',
      cancelable: true,
    });

    input.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(false);
  });
});

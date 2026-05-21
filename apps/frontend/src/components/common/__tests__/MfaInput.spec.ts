// @ts-nocheck — TDD red phase (/gen-ut-frontend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-001 — ログイン画面 (Step 2 — 2段階認証)
//
// Drives src/components/common/MfaInput.vue. The component renders 6
// individual digit inputs that:
//   - emit `update:modelValue` joined as a single string
//   - emit `complete` when all 6 digits are filled
//   - accept paste of a 6-digit string into ANY box and distribute
//   - reject non-digit characters
//   - support backspace navigation across boxes

import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MfaInput from '@/components/common/MfaInput.vue';

describe('MfaInput', () => {
  it('should render 6 digit inputs by default when mounted with no length prop', () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '' } });
    expect(wrapper.findAll('input').length).toBe(6);
  });

  it('should render N digit inputs when length prop is provided', () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '', length: 4 } });
    expect(wrapper.findAll('input').length).toBe(4);
  });

  it('should hydrate digit boxes from modelValue when initial value is non-empty', () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '123456' } });
    const inputs = wrapper.findAll('input');
    expect((inputs[0].element as HTMLInputElement).value).toBe('1');
    expect((inputs[5].element as HTMLInputElement).value).toBe('6');
  });

  it('should emit update:modelValue with the joined string when a digit is typed', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '' } });
    await wrapper.findAll('input')[0].setValue('1');
    await flushPromises();
    const emits = wrapper.emitted('update:modelValue');
    expect(emits).toBeTruthy();
    // First emit should be '1' (other slots still blank → '1' + '' joined).
    expect(emits![0][0]).toBe('1');
  });

  it('should reject non-digit characters when typed (digit slot stays blank)', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '' } });
    await wrapper.findAll('input')[0].setValue('a');
    await flushPromises();
    const emits = wrapper.emitted('update:modelValue');
    // Non-digit replaced via /\D/g to '' → empty join.
    expect(emits?.[0]?.[0]).toBe('');
  });

  it('should emit complete with the full 6-digit code when all 6 boxes are filled', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '' } });
    const inputs = wrapper.findAll('input');
    for (let i = 0; i < 6; i++) {
      await inputs[i].setValue(String(i + 1));
    }
    await flushPromises();
    const completeEmits = wrapper.emitted('complete');
    expect(completeEmits).toBeTruthy();
    expect(completeEmits![completeEmits!.length - 1][0]).toBe('123456');
  });

  it('should NOT emit complete when fewer than 6 boxes are filled', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '' } });
    const inputs = wrapper.findAll('input');
    for (let i = 0; i < 3; i++) {
      await inputs[i].setValue(String(i + 1));
    }
    await flushPromises();
    expect(wrapper.emitted('complete')).toBeUndefined();
  });

  // VTU's `trigger('paste', { clipboardData })` creates a plain Event and
  // does NOT set `event.clipboardData` (which is only on ClipboardEvent).
  // Dispatch the event manually so the handler's `e.clipboardData?.getData`
  // returns our mock text.
  function dispatchPaste(input: HTMLInputElement, text: string): void {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: () => text },
    });
    input.dispatchEvent(event);
  }

  it('should distribute pasted 6-digit code across all boxes when paste event fires', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '' } });
    const firstInput = wrapper.findAll('input')[0].element as HTMLInputElement;

    dispatchPaste(firstInput, '123456');
    await flushPromises();

    const inputs = wrapper.findAll('input');
    expect((inputs[0].element as HTMLInputElement).value).toBe('1');
    expect((inputs[5].element as HTMLInputElement).value).toBe('6');
    const emits = wrapper.emitted('update:modelValue');
    expect(emits![emits!.length - 1][0]).toBe('123456');
    expect(wrapper.emitted('complete')).toBeTruthy();
  });

  it('should strip non-digits from pasted text when paste event fires', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '' } });
    const firstInput = wrapper.findAll('input')[0].element as HTMLInputElement;
    dispatchPaste(firstInput, 'AB12-CD34-56');
    await flushPromises();
    const emits = wrapper.emitted('update:modelValue');
    // /\D/g removes 'AB-CD-' leaving '123456'.
    expect(emits![emits!.length - 1][0]).toBe('123456');
  });

  it('should disable all inputs when disabled prop is true', () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '', disabled: true } });
    wrapper.findAll('input').forEach((input) => {
      expect(input.attributes('disabled')).toBeDefined();
    });
  });

  it('should re-sync internal state when modelValue prop changes externally', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '111111' } });
    expect((wrapper.findAll('input')[0].element as HTMLInputElement).value).toBe('1');

    await wrapper.setProps({ modelValue: '999999' });
    await flushPromises();
    expect((wrapper.findAll('input')[0].element as HTMLInputElement).value).toBe('9');
    expect((wrapper.findAll('input')[5].element as HTMLInputElement).value).toBe('9');
  });

  it('should clear all digits when modelValue prop is reset to empty string', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '123456' } });
    await wrapper.setProps({ modelValue: '' });
    await flushPromises();
    wrapper.findAll('input').forEach((input) => {
      expect((input.element as HTMLInputElement).value).toBe('');
    });
  });

  // ─── Multi-char @input — keyboard "paste" via input event (covers lines 56-62)
  it('should distribute a multi-char input event across slots starting at the focused index', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '' } });
    const inputs = wrapper.findAll('input');
    // Simulate the user typing/pasting "12345" into the FIRST box via @input
    // (not via @paste). MfaInput's onInput handler splits it across slots.
    (inputs[0].element as HTMLInputElement).value = '12345';
    await inputs[0].trigger('input');
    await flushPromises();

    const emits = wrapper.emitted('update:modelValue');
    expect(emits).toBeTruthy();
    expect(emits!.at(-1)?.[0]).toBe('12345');
    expect((inputs[0].element as HTMLInputElement).value).toBe('1');
    expect((inputs[4].element as HTMLInputElement).value).toBe('5');
  });

  it('should clear the slot when @input fires with an empty value (backspace clears, not nav)', async () => {
    const wrapper = mount(MfaInput, { props: { modelValue: '123456' } });
    const inputs = wrapper.findAll('input');
    // User selects the digit and presses delete → input fires with ''
    (inputs[3].element as HTMLInputElement).value = '';
    await inputs[3].trigger('input');
    await flushPromises();
    const emits = wrapper.emitted('update:modelValue');
    expect(emits!.at(-1)?.[0]).toBe('123' + '' + '56');
  });

  // ─── Keyboard navigation (covers onKeydown — lines 72-79) ─────────
  it('should focus the previous slot on Backspace when current slot is empty', async () => {
    const wrapper = mount(MfaInput, {
      props: { modelValue: '12' },
      attachTo: document.body,
    });
    const inputs = wrapper.findAll('input');
    (inputs[2].element as HTMLInputElement).focus();
    await inputs[2].trigger('keydown', { key: 'Backspace' });
    await flushPromises();
    expect(document.activeElement).toBe(inputs[1].element);
    wrapper.unmount();
  });

  it('should focus the previous slot on ArrowLeft', async () => {
    const wrapper = mount(MfaInput, {
      props: { modelValue: '12' },
      attachTo: document.body,
    });
    const inputs = wrapper.findAll('input');
    (inputs[3].element as HTMLInputElement).focus();
    await inputs[3].trigger('keydown', { key: 'ArrowLeft' });
    await flushPromises();
    expect(document.activeElement).toBe(inputs[2].element);
    wrapper.unmount();
  });

  it('should focus the next slot on ArrowRight', async () => {
    const wrapper = mount(MfaInput, {
      props: { modelValue: '12' },
      attachTo: document.body,
    });
    const inputs = wrapper.findAll('input');
    (inputs[1].element as HTMLInputElement).focus();
    await inputs[1].trigger('keydown', { key: 'ArrowRight' });
    await flushPromises();
    expect(document.activeElement).toBe(inputs[2].element);
    wrapper.unmount();
  });

  it('should NOT move focus on Backspace when the current slot has a digit (user is deleting in-place)', async () => {
    const wrapper = mount(MfaInput, {
      props: { modelValue: '123456' },
      attachTo: document.body,
    });
    const inputs = wrapper.findAll('input');
    (inputs[3].element as HTMLInputElement).focus();
    await inputs[3].trigger('keydown', { key: 'Backspace' });
    await flushPromises();
    expect(document.activeElement).toBe(inputs[3].element);
    wrapper.unmount();
  });
});

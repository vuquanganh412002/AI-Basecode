// Drives src/utils/form-keyboard.ts. Verifies preventEnterImplicitSubmit
// blocks Enter on text inputs but lets it through on textarea / submit
// button / antd combobox controls.

import { describe, it, expect, vi } from 'vitest';
import { preventEnterImplicitSubmit } from '../form-keyboard';

function fakeKeyEvent(opts: {
  key?: string;
  tagName?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  closestMatch?: string | null;
}): KeyboardEvent {
  const target = {
    tagName: opts.tagName ?? 'INPUT',
    closest: vi.fn((selector: string) =>
      opts.closestMatch === selector ? { mock: 'matched' } : null,
    ),
  };
  return {
    key: opts.key ?? 'Enter',
    target,
    shiftKey: opts.shiftKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    altKey: opts.altKey ?? false,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe('preventEnterImplicitSubmit', () => {
  it('should call preventDefault when Enter is pressed inside a text input', () => {
    const e = fakeKeyEvent({ tagName: 'INPUT' });
    preventEnterImplicitSubmit(e);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('should NOT call preventDefault when key is not Enter', () => {
    const e = fakeKeyEvent({ key: 'a', tagName: 'INPUT' });
    preventEnterImplicitSubmit(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('should NOT call preventDefault when Enter is pressed inside a textarea (newline)', () => {
    const e = fakeKeyEvent({ tagName: 'TEXTAREA' });
    preventEnterImplicitSubmit(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('should NOT call preventDefault when Enter is pressed on a button (focused submit button)', () => {
    const e = fakeKeyEvent({ tagName: 'BUTTON' });
    preventEnterImplicitSubmit(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('should NOT call preventDefault when Enter is pressed inside an antd combobox (a-select / a-cascader)', () => {
    const e = fakeKeyEvent({
      tagName: 'INPUT',
      closestMatch: '[role="combobox"]',
    });
    preventEnterImplicitSubmit(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('should NOT call preventDefault when Enter is pressed with a modifier key (Shift+Enter for newline)', () => {
    const e = fakeKeyEvent({ tagName: 'INPUT', shiftKey: true });
    preventEnterImplicitSubmit(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('should NOT call preventDefault when Cmd+Enter / Ctrl+Enter is pressed (power-user shortcut convention)', () => {
    const ctrl = fakeKeyEvent({ tagName: 'INPUT', ctrlKey: true });
    preventEnterImplicitSubmit(ctrl);
    expect(ctrl.preventDefault).not.toHaveBeenCalled();

    const meta = fakeKeyEvent({ tagName: 'INPUT', metaKey: true });
    preventEnterImplicitSubmit(meta);
    expect(meta.preventDefault).not.toHaveBeenCalled();
  });

  it('should be a no-op when target is null (defensive)', () => {
    const e = {
      key: 'Enter',
      target: null,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    expect(() => preventEnterImplicitSubmit(e)).not.toThrow();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

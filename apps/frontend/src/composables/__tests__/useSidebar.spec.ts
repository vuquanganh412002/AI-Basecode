// Drives src/composables/useSidebar.ts. Shared open/close state for
// AppSidebar + AppHeader toggle. State is module-level (singleton)
// so toggle/show/hide MUST be tested in sequence on the same instance.

import { describe, it, expect } from 'vitest';
import { useSidebar, MD_BREAKPOINT } from '@/composables/useSidebar';

describe('useSidebar', () => {
  it('exposes the md breakpoint constant (768)', () => {
    expect(MD_BREAKPOINT).toBe(768);
  });

  it('toggle() flips the open state', () => {
    const { open, toggle } = useSidebar();
    const initial = open.value;
    toggle();
    expect(open.value).toBe(!initial);
    toggle();
    expect(open.value).toBe(initial);
  });

  it('show() forces open=true regardless of prior state', () => {
    const { open, hide, show } = useSidebar();
    hide();
    expect(open.value).toBe(false);
    show();
    expect(open.value).toBe(true);
  });

  it('hide() forces open=false regardless of prior state', () => {
    const { open, show, hide } = useSidebar();
    show();
    expect(open.value).toBe(true);
    hide();
    expect(open.value).toBe(false);
  });
});

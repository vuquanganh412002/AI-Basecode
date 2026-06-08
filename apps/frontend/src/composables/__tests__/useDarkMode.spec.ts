// Drives src/composables/useDarkMode.ts. Module-level singleton —
// toggle/set mutates a shared ref, watchEffect mirrors to <html class>
// and localStorage. Cover both branches of the initializer too.

import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // Reset between tests so each one observes a fresh module instance.
  vi.resetModules();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('useDarkMode — initializer', () => {
  it('should default to localStorage value when set to "dark"', async () => {
    localStorage.setItem('theme-mode', 'dark');
    const { useDarkMode } = await import('@/composables/useDarkMode');
    expect(useDarkMode().mode.value).toBe('dark');
  });

  it('should default to localStorage value when set to "light"', async () => {
    localStorage.setItem('theme-mode', 'light');
    const { useDarkMode } = await import('@/composables/useDarkMode');
    expect(useDarkMode().mode.value).toBe('light');
  });

  it('should consult prefers-color-scheme when localStorage is empty (dark match → dark)', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true } as MediaQueryList));
    const { useDarkMode } = await import('@/composables/useDarkMode');
    expect(useDarkMode().mode.value).toBe('dark');
    vi.unstubAllGlobals();
  });

  it('should fall back to "light" when prefers-color-scheme reports no match', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false } as MediaQueryList));
    const { useDarkMode } = await import('@/composables/useDarkMode');
    expect(useDarkMode().mode.value).toBe('light');
    vi.unstubAllGlobals();
  });
});

describe('useDarkMode — mutators', () => {
  it('toggle() flips light ↔ dark and updates <html class="dark">', async () => {
    localStorage.setItem('theme-mode', 'light');
    const { useDarkMode } = await import('@/composables/useDarkMode');
    const { mode, toggle } = useDarkMode();
    expect(mode.value).toBe('light');
    toggle();
    await Promise.resolve();
    expect(mode.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    toggle();
    await Promise.resolve();
    expect(mode.value).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('set(next) overrides regardless of current mode + persists to localStorage', async () => {
    localStorage.setItem('theme-mode', 'light');
    const { useDarkMode } = await import('@/composables/useDarkMode');
    const { set } = useDarkMode();
    set('dark');
    await Promise.resolve();
    expect(localStorage.getItem('theme-mode')).toBe('dark');
    set('light');
    await Promise.resolve();
    expect(localStorage.getItem('theme-mode')).toBe('light');
  });
});

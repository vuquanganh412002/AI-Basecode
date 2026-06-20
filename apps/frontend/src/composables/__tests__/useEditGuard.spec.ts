import { describe, it, expect } from 'vitest';
import { reactive } from 'vue';

import { useEditGuard } from '@/composables/useEditGuard';

describe('useEditGuard', () => {
  it('is NOT pristine before capture (safe default → update proceeds)', () => {
    const state = reactive({ a: 1, b: 'x' });
    const guard = useEditGuard(() => state);
    expect(guard.isPristine()).toBe(false);
  });

  it('is pristine when nothing changed after capture', async () => {
    const state = reactive({ a: 1, b: 'x' });
    const guard = useEditGuard(() => state);
    await guard.capture();
    expect(guard.isPristine()).toBe(true);
  });

  it('is NOT pristine when a field changed after capture', async () => {
    const state = reactive({ a: 1, b: 'x' });
    const guard = useEditGuard(() => state);
    await guard.capture();
    state.b = 'y';
    expect(guard.isPristine()).toBe(false);
  });

  it('returns to pristine when the value is changed back to the original', async () => {
    const state = reactive({ a: 1 });
    const guard = useEditGuard(() => state);
    await guard.capture();
    state.a = 2;
    expect(guard.isPristine()).toBe(false);
    state.a = 1;
    expect(guard.isPristine()).toBe(true);
  });

  it('ignores key insertion order (snapshot may build a fresh object)', async () => {
    let order: 'ab' | 'ba' = 'ab';
    const guard = useEditGuard(() =>
      order === 'ab' ? { a: 1, b: 2 } : { b: 2, a: 1 },
    );
    await guard.capture();
    order = 'ba';
    expect(guard.isPristine()).toBe(true);
  });

  it('detects nested changes', async () => {
    const state = reactive({ nested: { x: 1 } });
    const guard = useEditGuard(() => state);
    await guard.capture();
    state.nested.x = 2;
    expect(guard.isPristine()).toBe(false);
  });

  it('reset() drops the baseline so isPristine is false again', async () => {
    const state = reactive({ a: 1 });
    const guard = useEditGuard(() => state);
    await guard.capture();
    expect(guard.isPristine()).toBe(true);
    guard.reset();
    expect(guard.isPristine()).toBe(false);
  });
});

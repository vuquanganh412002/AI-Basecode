import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadBlob } from '@/utils/download';

describe('downloadBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an <a>, triggers the download, and revokes the object URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    // jsdom does not implement these — stub them so the guard passes.
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL,
      revokeObjectURL,
    });

    const click = vi.fn();
    const anchor = document.createElement('a');
    anchor.click = click;
    const createElement = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor);

    downloadBlob(new Blob(['x']), 'sample.csv');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchor.download).toBe('sample.csv');
    expect(anchor.href).toContain('blob:mock');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    createElement.mockRestore();
    vi.unstubAllGlobals();
  });

  it('no-ops when URL.createObjectURL is unavailable (jsdom / SSR guard)', () => {
    vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: undefined });
    const createElement = vi.spyOn(document, 'createElement');

    expect(() => downloadBlob(new Blob(['x']), 'sample.csv')).not.toThrow();
    expect(createElement).not.toHaveBeenCalled();

    createElement.mockRestore();
    vi.unstubAllGlobals();
  });
});

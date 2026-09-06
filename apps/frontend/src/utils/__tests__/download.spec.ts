import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadBlob, parseContentDispositionFilename } from '@/utils/download';

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

describe('parseContentDispositionFilename', () => {
  it('decodes an RFC5987 filename*=UTF-8\'\'… (multibyte) filename', () => {
    const out = parseContentDispositionFilename(
      "attachment; filename*=UTF-8''%E5%8F%A3%E5%BA%A7%E6%8C%AF%E6%9B%BF.csv",
    );
    expect(out).toBe('口座振替.csv');
  });

  it('falls back to the plain filename="…" when no RFC5987 form is present', () => {
    const out = parseContentDispositionFilename('attachment; filename="sample.csv"');
    expect(out).toBe('sample.csv');
  });

  it('falls through to the plain form when the RFC5987 percent-encoding is malformed', () => {
    // "%" alone is not valid percent-encoding — decodeURIComponent throws.
    const out = parseContentDispositionFilename(
      "attachment; filename*=UTF-8''%E5%8F%A3%; filename=\"fallback.csv\"",
    );
    expect(out).toBe('fallback.csv');
  });

  it('returns the default fallback ("download") when neither form is present', () => {
    const out = parseContentDispositionFilename('attachment');
    expect(out).toBe('download');
  });

  it('returns a custom fallback when provided and neither form is present', () => {
    const out = parseContentDispositionFilename('attachment', 'custom.zip');
    expect(out).toBe('custom.zip');
  });
});
